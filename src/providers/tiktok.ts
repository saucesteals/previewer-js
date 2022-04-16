import { AxiosResponse } from "axios";
import { Message, MessageOptions } from "discord.js";
import Stream from "stream";
import BaseProvider from "../structures/provider";

const USER_AGENT = "Pinterest/0.2 (+https://www.pinterest.com/bot.html)";

const BASE_TIKTOK_HEADERS = {
  "user-agent": USER_AGENT,
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "Sec-GPC": "1",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-User": "?1",
  "Sec-Fetch-Dest": "document",
  "Accept-Language": "en-US,en;q=0.9",
};

const VIDEO_TIKTOK_HEADERS = {
  "user-agent": USER_AGENT,
  accept: "*/*",
  "sec-gpc": "1",
  "sec-fetch-site": "same-site",
  "sec-fetch-mode": "no-cors",
  "sec-fetch-dest": "video",
  referer: "https://www.tiktok.com/",
  "accept-language": "en-US,en;q=0.9",
  range: "bytes=0-",
};

const TiktokMatch = {
  BaseDomain: /http[s]?:\/\/(.+\.)?tiktok\.com\S+/,
  PlayAddr: /playAddr":"(.*?)"/,
};

const decodeUnicodeLiterals = (str: string) => {
  return str.replace(/\\u[A-Z0-9]{4}/g, (sub) => {
    return String.fromCharCode(parseInt(sub.substring(2), 16));
  });
};

export default class TiktokProvider extends BaseProvider {
  constructor() {
    super({ match: [TiktokMatch.BaseDomain] });
    this.ready();
  }

  private async getVideoSourceAddr(
    videoUrl: string
  ): Promise<string | undefined> {
    const resp: AxiosResponse<string> = await this.http({
      url: videoUrl,
      headers: BASE_TIKTOK_HEADERS,
    });

    const playAddrMatch = TiktokMatch.PlayAddr.exec(resp.data)?.[1];

    return playAddrMatch && decodeUnicodeLiterals(playAddrMatch);
  }

  private async getVideoStream(videoUrl: string): Promise<Stream> {
    const playAddr = await this.getVideoSourceAddr(videoUrl);

    if (!playAddr) {
      throw new Error("No video source found");
    }

    const resp: AxiosResponse<Stream> = await this.http({
      url: playAddr,
      responseType: "stream",
      headers: VIDEO_TIKTOK_HEADERS,
    });

    return resp.data;
  }

  public async process(
    match: RegExpExecArray,
    message: Message
  ): Promise<MessageOptions> {
    message.suppressEmbeds(true).catch(this.logger.error);

    const stream = await this.getVideoStream(match[0]);

    return {
      files: [{ attachment: stream, name: message.author.username + ".mp4" }],
    };
  }
}
