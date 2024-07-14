import { Context, Schema, h } from 'koishi';
import { } from 'koishi-plugin-puppeteer';
import moment from 'moment';
import { ChannelInfo, fetchChannel } from './twitch';
import { startStreamingImage } from './render';
import * as Database from './database';

export const name = 'twitch-notify';

export const inject = ['database', 'puppeteer'];

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.plugin(Database);

  const cmd = ctx.command('twitch', 'Twitch 直播状态推送', { authority: 3 });

  cmd.subcommand('.sub <name> <...guildId:string>', '订阅频道')
    .example('twitch sub prod 1234 5678')
    .action(async (_, name, ...guildId) => {
      let info;
      try {
        info = await fetchChannel(name);
      } catch (e) {
        return `无法订阅 ${name}：${e}`;
      }
      await ctx.database.upsert('twitch.channel', [{ id: name, targetIDs: guildId }]);
      return `成功订阅 ${info.displayName}。`;
    });

  cmd.subcommand('.unsub <name>', '退订频道')
    .example('twitch unsub prod')
    .action(async (_, name) => {
      const result = await ctx.database.remove('twitch.channel', name);
      if (result.matched === 0) {
        return `并没有订阅过 ${name}。`;
      }
      return `成功退订 ${name}。`;
    });

  cmd.subcommand('.list', '列出已订阅频道').action(async () => {
    const rows = await ctx.database.get('twitch.channel', {}) as Database.TwitchChannel[];
    if (rows.length === 0) {
      return '未订阅任何频道。';
    }
    return '已订阅频道：\n' + rows.map((row) => `* ${row.id}: ` + row.targetIDs.join(', ')).join('\n');
  });

  cmd.subcommand('.refresh', '强制刷新').action(async () => {
    await refresh(ctx);
    return '刷新完毕。';
  });

  let disposeTimer: () => void;
  ctx.on('ready', () => {
    disposeTimer = ctx.setInterval(async () => {
      await refresh(ctx);
    }, 60 * 1000);
  });
  ctx.on('dispose', () => {
    disposeTimer();
  });
}

async function refresh(ctx: Context) {
  const rows = await ctx.database.get('twitch.channel', {});
  for (const row of rows) {
    await refreshChannel(ctx, row as Database.TwitchChannel);
  }
}

async function refreshChannel(ctx: Context, channel: Database.TwitchChannel) {
  let info: ChannelInfo;
  try {
    info = await fetchChannel(channel.id);
  } catch (e) {
    ctx.logger.error(`Failed to refresh Twitch channel: ${e}`);
    return;
  }

  if (info.streaming && channel.streamStartTime === null) {
    ctx.logger.info(`${channel.id} started Twitch streaming.`);
    await ctx.database.set('twitch.channel', channel.id, {
      streamStartTime: info.streamStartTime,
    });
    for (const id of channel.targetIDs) {
      await onebotSend(ctx, id, await startStreamingMessage(ctx, info));
    }
  } else if (channel.streamStartTime !== null && !info.streaming) {
    ctx.logger.info(`${channel.id} stopped Twitch streaming.`);
    await ctx.database.set('twitch.channel', channel.id, {
      streamStartTime: null,
    });
    for (const id of channel.targetIDs) {
      await onebotSend(ctx, id, await endStreamingMessage(info, channel.streamStartTime));
    }
  }
}

async function onebotSend(ctx: Context, targetID: string, content: string) {
  for (const bot of ctx.bots) {
    if (bot.platform === 'onebot') {
      for (const guild of (await bot.getGuildList()).data) {
        if (guild.id === targetID) {
          await bot.sendMessage(guild.id, content);
          return
        }
      }
    }
  }
  ctx.logger.error(`Cannot find onebot to send to ${targetID}.`);
}

async function startStreamingMessage(ctx: Context, info: ChannelInfo): Promise<string> {
  const img = await startStreamingImage(ctx, info);
  return img + `\n${info.displayName} 开播啦！\nhttps://www.twitch.tv/${info.name}`;
}

async function endStreamingMessage(info: ChannelInfo, streamStartTime: Date): Promise<string> {
  const duration = moment.duration(moment().diff(moment(streamStartTime)));
  return h('img', { src: info.profileImageURL }) + `${info.displayName} 下播了。\n本次直播了${Math.floor(duration.asHours())}小时${duration.minutes()}分钟${duration.seconds()}秒。\nhttps://www.twitch.tv/${info.name}`;
}
