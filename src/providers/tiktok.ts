import { AxiosResponse } from "axios";
import { Message, MessageOptions } from "discord.js";
import Stream from "stream";
import { CookieJar } from "tough-cookie";
import BaseProvider from "../structures/provider";

const VIDEO_REQUEST_HEADERS = {
  "Accept-Encoding": "identity;q=1, *;q=0",
  Accept: "*/*",
  "Sec-Fetch-Site": "same-site",
  "Sec-Fetch-Mode": "no-cors",
  "Sec-Fetch-Dest": "video",
  Referer: "https://www.tiktok.com/",
};

const TiktokMatch = {
  BaseDomain: /http[s]?:\/\/(.+\.)?tiktok\.com\S+/,
  PlayAddr: /playAddr":"(.*?)"/,
};

export default class TiktokProvider extends BaseProvider {
  constructor() {
    super("tiktok", [TiktokMatch.BaseDomain]);
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
    });

    this.http.defaults.jar = newJar;
    this.logger.info("Updated cookies");
    return;
  }

  private async getVideoSourceAddr(
    videoUrl: string
  ): Promise<string | undefined> {
    const resp: AxiosResponse<string> = await this.http({ url: videoUrl });

    const playAddrMatch = TiktokMatch.PlayAddr.exec(resp.data)?.[1]
      .replace(/\\u0026/g, "&")
      .replace(/\\u002F/g, "&");

    return playAddrMatch;
  }

  private async getVideoStream(videoUrl: string): Promise<Stream> {
    const playAddr = await this.getVideoSourceAddr(videoUrl);

    if (!playAddr) {
      throw new Error("No video source found");
    }

    const resp: AxiosResponse<Stream> = await this.http({
      headers: VIDEO_REQUEST_HEADERS,
      url: playAddr,
      responseType: "stream",
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
