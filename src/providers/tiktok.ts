import { AxiosResponse } from "axios";
import { Message, MessageOptions } from "discord.js";
import Stream from "stream";
import { CookieJar } from "tough-cookie";
import BaseProvider from "../structures/provider";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36";

const BASE_TIKTOK_HEADERS = {
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "accept-encoding": "gzip, deflate",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "max-age=0",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "sec-gpc": "1",
  "upgrade-insecure-requests": "1",
  "user-agent": USER_AGENT,
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
  "user-agent": USER_AGENT,
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
    super([TiktokMatch.BaseDomain], {
      withCredentials: true,
    });
    this.updateCookies()
      .then(() => this.ready())
      .catch((err) => this.logger.error(err));

    // /* eslint-disable @typescript-eslint/no-misused-promises */
    // // Update cookies every 60 minutes
    // setInterval(this.updateCookies.bind(this), 1000 * 60 * 60);
  }

  public async updateCookies(): Promise<void> {
    const newJar = new CookieJar();

    await this.http({
      url: "https://www.tiktok.com/",
      jar: newJar,
      headers: BASE_TIKTOK_HEADERS,
    });

    this.http.defaults.jar = newJar;
    this.logger.info("Updated cookies");
    return;
  }

  private async getVideoSourceAddr(
    videoUrl: string
  ): Promise<string | undefined> {
    const resp: AxiosResponse<string> = await this.http({
      url: videoUrl,
      headers: {
        ...BASE_TIKTOK_HEADERS,
        "user-agent": USER_AGENT,
      },
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
