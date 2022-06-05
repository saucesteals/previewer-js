import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { Message, MessageOptions } from "discord.js";
import { Logger } from "winston";
import { makeLogger } from "../utils/logger";

export interface ProviderOptions {
  match: RegExp[];
  axiosOptions?: AxiosRequestConfig;
}

type MaybePromise<T> = T | Promise<T>;

export default abstract class BaseProvider {
  protected logger: Logger;
  protected http: AxiosInstance;
  protected options: ProviderOptions;

  readonly name: string;

  private _ready: boolean = false;

  protected constructor(options: ProviderOptions) {
    this.options = options;
    this.name = new.target.name;
    this.logger = makeLogger(this.name);
    this.http = axios.create(this.options.axiosOptions);
  }

  public match(text: string): RegExpExecArray | undefined {
    for (const re of this.options.match) {
      const match = re.exec(text);
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
  ): MaybePromise<MessageOptions | undefined>;

  public async parse(
    match: RegExpExecArray,
    message: Message
  ): Promise<MessageOptions | undefined> {
    if (!this.isReady()) throw new Error("Provider is not ready!");
    return this.process(match, message);
  }
}
