import { Context } from 'koishi';

declare module 'koishi' {
  interface Tables {
    'twitch.channel': TwitchChannel
  }
}

export interface TwitchChannel {
  id: string
  targetIDs: string[],
  streamStartTime?: Date
}

export function apply(ctx: Context) {
  ctx.model.extend('twitch.channel', {
    id: 'string',
    targetIDs: 'list',
    streamStartTime: 'timestamp'
  });
}