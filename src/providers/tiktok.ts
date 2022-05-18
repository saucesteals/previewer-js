import { AxiosResponse } from "axios";
import { Message, MessageOptions } from "discord.js";
import Stream from "stream";
import BaseProvider from "../structures/provider";

// This is a chrome UA (version 101.0.4951.64) with "Chrome" replaced with a single (random) char
// Discussed in: https://github.com/saucesteals/previewer/issues/22#issuecomment-1130030089
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) A/101.0.4951.64 Safari/537.36";

const BASE_TIKTOK_HEADERS = {
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "accept-language": "en-US,en;q=0.9",

  "accept-encoding": "gzip, deflate", // no brotli
  // axios has no built-in support for brotli
  // and since it works without it - it's fine to just leave it out

  connection: "keep-alive",
  "cache-control": "max-age=0",
  dnt: "1",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "sec-gpc": "1",
  "upgrade-insecure-requests": "1",
  "user-agent": USER_AGENT,
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
      timeout: 5_000,
      validateStatus: (status) => {
        return status === 404 || (status >= 200 && status < 300);
      },
    });

    if (resp.status === 404) {
      return undefined;
    }

    const playAddrMatch = TiktokMatch.PlayAddr.exec(resp.data)?.[1];

    return playAddrMatch && decodeUnicodeLiterals(playAddrMatch);
  }

  private async getVideoStream(videoUrl: string): Promise<Stream> {
    const playAddr = await this.getVideoSourceAddr(videoUrl);

    if (!playAddr) {
      throw new Error("Invalid or deleted tiktok provided");
    }

    const resp: AxiosResponse<Stream> = await this.http({
      url: playAddr,
      responseType: "stream",
      headers: VIDEO_TIKTOK_HEADERS,
      timeout: 5_000,
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
