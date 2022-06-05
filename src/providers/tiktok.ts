import { Message, MessageOptions } from "discord.js";
import BaseProvider from "../structures/provider";

const TiktokMatch = {
  BaseDomain: /http[s]?:\/\/(.+\.)?tiktok\.com\S+/,
  PlayAddr: /playAddr":"(.*?)"/,
};

export default class TiktokProvider extends BaseProvider {
  constructor() {
    super({ match: [TiktokMatch.BaseDomain] });
    this.ready();
  }

  public process(match: RegExpExecArray, message: Message): MessageOptions {
    message.suppressEmbeds(true).catch(this.logger.error);

    return {
      // Discord automatically properly encodes the url
      // when they scrape it, so might as well not do it here
      // because it looks better/shorter in the message
      content: "https://tiktok.sauce.sh/?url=" + match[0],
    };
  }
}
