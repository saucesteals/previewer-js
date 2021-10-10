import { Colors } from "../utils/branding";
import { Client, ClientOptions, Message, MessageEmbed } from "discord.js";
import { InvitePermissions } from "../utils/etc";
import BaseProvider from "./provider";
import { Logger } from "winston";
import { makeLogger } from "../utils/logger";
import TiktokProvider from "../providers/tiktok";
import OpenSeaProvider from "../providers/opensea";

export default class PreviewerClient extends Client {
  private logger: Logger = makeLogger("client");
  private providers: BaseProvider[] = [];

  constructor(options: ClientOptions) {
    super(options);

    this.providers.push(new TiktokProvider());

    this.providers.push(new OpenSeaProvider());

    this.on("messageCreate", this.$onMessage.bind(this));

    this.on("ready", () => {
      this.logger.info("Ready as " + this.user?.username);

      this.user!.setActivity({
        type: "WATCHING",
        name: "your links",
      });
    });
  }

  public getInviteUrl(): string {
    return `https://discord.com/oauth2/authorize?client_id=${
      this.user?.id
    }&scope=bot&permissions=${InvitePermissions.toString()}`;
  }

  private async $onMessage(message: Message): Promise<void> {
    if (message.author.bot || !message.guild) return;

    for (const provider of this.providers) {
      const url = provider.match.exec(message.content)?.shift();

      if (url) {
        const log = `[${url}}] by [${provider.name}] provider for ${message.author.tag} (${message.author.id}) in ${message.guild.name} (${message.guild.id})`;
        this.logger.info("Attempting to parse " + log);
        try {
          message.channel
            .sendTyping()
            .catch((error: any) =>
              this.logger.error(
                "Error when triggering typing: " + error.message
              )
            );
          const parsed = await provider.parse(new URL(url), message);
          if (!parsed) {
            this.logger.info("No parsing of " + log);
            return;
          }
          await message.reply(parsed);
          this.logger.info("Successful parsing of " + log);
        } catch (err: any) {
          this.logger.error("Unsuccessful parsing of " + log);
          this.logger.error(err);
          message.reply(
            "Something went wrong! ```Error: " +
              (err.message || err.toString()) +
              "```\nPlease contact `sauce#2997` if this issue persists"
          );
        }
      }
    }

    if (message.content.includes(this.user!.id)) {
      const embed = new MessageEmbed()
        .setColor(Colors.Pink)
        .setDescription(
          `- **[Invite Me!](${this.getInviteUrl()})**\n- **[See my repository](https://github.com/saucesteals/previewer/)**\n- **Contact Owner: sauce#2997 (630545390785265674)**`
        );
      message.reply({ embeds: [embed] });
      return;
    }

    return;
  }
}
