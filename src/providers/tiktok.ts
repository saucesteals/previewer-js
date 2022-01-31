import { AxiosResponse } from "axios";
import { Message, MessageOptions } from "discord.js";
import Stream from "stream";
import BaseProvider from "../structures/provider";

const USER_AGENT =
  "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";

const BASE_TIKTOK_HEADERS = {
  // Bypass tiktok's cdn antibot
  // (akamai's edge antibot, annoying and usually unnecessary to deal with)
  // by requesting as a known and allowed scraper

  // Usually big websites have ip whitelists for each scraper
  // that they are willing to allow (twitter, discord, etc),
  // but TikTok does not (very likely to change in the future)

  // Note: this alone will not return a full response
  // with the tiktok's video address
  // Instead it will return a scraper-only response
  // Which only includes the resource's meta tags (og, title, etc)
  "user-agent": USER_AGENT,

  // Setting the "tt-target-idc" cookie (or some other similar cookies)
  // returns the full response regardless of the UA
  // (likely that they handle this case before checking for a scraper UA)
  cookie: "tt-target-idc=useast5;",
};

const VIDEO_TIKTOK_HEADERS = {
  accept: "*/*",
  "accept-encoding": "identity;q=1, *;q=0",
  "accept-language": "en-US,en;q=0.9",
  range: "bytes=0-",
  referer: "https://www.tiktok.com/",
  "sec-fetch-dest": "video",
  "sec-fetch-mode": "no-cors",
  "sec-fetch-site": "same-site",
  "sec-gpc": "1",
  ...BASE_TIKTOK_HEADERS,
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
    const url = new URL(match[0]);
    const stream = await this.getVideoStream(url.href);
    return {
      files: [{ attachment: stream, name: message.author.username + ".mp4" }],
    };
  }
}
