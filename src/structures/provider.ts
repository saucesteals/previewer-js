import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import axiosCookieJarSupport from "axios-cookiejar-support";
import { Message, MessageOptions } from "discord.js";

import { Logger } from "winston";
import { makeLogger } from "../utils/logger";

export const DEFAULT_HEADERS = {
  "Cache-Control": "max-age=0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.93 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "Sec-GPC": "1",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-User": "?1",
  "Sec-Fetch-Dest": "document",
  "Accept-Language": "en-US,en;q=0.9",
};

export default abstract class BaseProvider {
  protected logger: Logger;
  protected http: AxiosInstance;
  private _ready: boolean = false;

  constructor(
    readonly name: string,
    readonly regExps: RegExp[],
    axiosOptions: AxiosRequestConfig = {
      headers: DEFAULT_HEADERS,
      withCredentials: true,
    }
  ) {
    this.logger = makeLogger(name);

    this.http = axiosCookieJarSupport(axios.create(axiosOptions));
  }

  public match(text: string): RegExpExecArray | undefined {
    for (const regExp of this.regExps) {
      const match = regExp.exec(text);
      if (match) return match;
    }
  }

  protected ready(): void {
    this._ready = true;
    this.logger.info("Ready!");
  }

  public isReady(): boolean {
    return this._ready;
  }

  protected abstract process(
    match: RegExpExecArray,
    message: Message
  ): Promise<MessageOptions | undefined>;

  public async parse(
    match: RegExpExecArray,
    message: Message
  ): Promise<MessageOptions | undefined> {
    if (!this.isReady()) throw new Error("Provider is not ready!");
    return this.process(match, message);
  }
}
