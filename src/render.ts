
import {Context} from 'koishi';
import moment from 'moment';
import { ChannelInfo } from './twitch';

export async function startStreamingImage(ctx: Context, info: ChannelInfo): Promise<string> {
    const streamStartTime = moment(info.streamStartTime!).format('YYYY年MM月DD日 HH:mm:ss ZZ');
    return await ctx.puppeteer.render(`<!DOCTYPE html>
  <html>
  <head>
    <style>
      html {
        width: 508px;
        height: auto;
      }
      body {
        margin: 0;
        padding: 8px;
        font-family: sans-serif;
      }
      main {
        padding: 8px;
        border: 3px ${info.primaryColor} solid;
        border-radius: 10px;
        background-color: #F7F7F8;
      }
      .preview-image {
        width: 470px;
        height: 265px;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
      }
      .metadata {
        display: flex;
        margin-top: 8px;
      }
      .profile-image {
        width: 70px;
        height: 70px;
        border-radius: 70px;
        border: ${info.primaryColor} 5px solid;
        margin-right: 16px;
      }
      .display-name {
        font-size: 1.4rem;
        font-weight: bold;
      }
      .title {
        margin-bottom: 8px;
      }
      .game {
        color: #8839ff;
        margin-bottom: 8px;
      }
      .tag {
        display: inline-block;
        font-size: 0.8rem;
        color: #404040;
        background-color: #e0e0e0;
        border-radius: calc(.5rem + 4px);
        padding: 4px 8px;
        margin-bottom: 8px;
      }
      .stream-start-time {
        font-size: 0.8rem;
        color: gray;
      }
    </style>
  </head>
  <body>
    <main>
      <img class="preview-image" src="https://static-cdn.jtvnw.net/previews-ttv/live_user_${info.name}-470x265.jpg" alt=""/>
      <div class="metadata">
        <img class="profile-image" src="${info.profileImageURL}" alt=""/>
        <div class="fields">
          <div class="display-name">${info.displayName}</div>
          <div class="title">${info.title}</div>
          <div class="game">${info.game}</div>
          <div class="tags">
            ${info.tags!.map((tag) => `<span class="tag">${tag}</span>`).join('\n')}
          </div>
          <div class="stream-start-time">开播时间：${streamStartTime}</div>
        </div>
      </div>
    </main>
  </body>
  </html>`);
  }