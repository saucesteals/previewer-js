import { Colors } from "../utils/previewer";
import { Client, ClientOptions, Message, MessageEmbed } from "discord.js";
import { InvitePermissions } from "../utils/previewer";
import BaseProvider from "./provider";
import { Logger } from "winston";
import { makeLogger } from "../utils/logger";
import TiktokProvider from "../providers/tiktok";
import { bold, codeBlock, hyperlink } from "../utils/formatting";

export default class PreviewerClient extends Client {
  private logger: Logger = makeLogger("client");
  private providers: BaseProvider[] = [];
  private supportGuildInvite: string;

  constructor(supportGuildInvite: string, options: ClientOptions) {
    super(options);

    this.supportGuildInvite = supportGuildInvite;
    this.providers.push(new TiktokProvider());

    this.on("messageCreate", this.$onMessage.bind(this));

    this.once("ready", () => {
      this.logger.info("Ready as " + this.user?.username);

      setInterval(() => this.updateActivity(), 600_000 /* 10 minutes */);
      this.updateActivity();
    });
  }

  public updateActivity(): void {
    if (!this.user) {
      throw new Error("Client has no user");
    }

    this.user.setActivity({
      type: "WATCHING",
      name: `${this.guilds.cache.size} guilds for links`,
    });
    this.logger.info("Updated activity");
    return;
  }

  public getInviteUrl(): string {
    return `https://discord.com/oauth2/authorize?client_id=${
      this.user?.id
    }&scope=bot&permissions=${InvitePermissions.toString()}`;
  }

  private async $onMessage(message: Message): Promise<void> {
    if (message.author.bot || !message.guild) return;

    for (const provider of this.providers) {
      const match = provider.match(message.content);

      if (!match) continue;

      const log = `[${match}] by [${provider.name}] provider for ${message.author.tag} (${message.author.id}) in ${message.guild.name} (${message.guild.id})`;
      this.logger.info("Attempting to parse " + log);
      try {
        const parsed = await provider.parse(match, message);
        if (!parsed) {
          this.logger.info("No parsing of " + log);
          return;
        }
        await message.reply(parsed);
        this.logger.info("Successful parsing of " + log);
      } catch (err: any) {
        this.logger.error("Unsuccessful parsing of " + log);
        this.logger.error(err);
        message
          .reply(
            `Something went wrong! ${codeBlock(
              `Error: ${err.message || err.toString()}`
            )}\nPlease report this error in ${
              this.supportGuildInvite
            } if it persists`
          )
          .catch((err) =>
            this.logger.error(
              "Error when sending error notice message: " + err.message
            )
          );
      }
    }

    if (message.content.includes(this.user!.id)) {
      const embed = new MessageEmbed()
        .setColor(Colors.Pink)
        .setDescription(
          `- ${bold(hyperlink("Invite Me", this.getInviteUrl()))}\n` +
            `- ${bold(
              hyperlink(
                "See my repository",
                "https://github.com/saucesteals/previewer/"
              )
            )}\n` +
            `- ${bold(
              hyperlink(
                "Join Previewer Support Server",
                this.supportGuildInvite
              )
            )}`
        );
      message
        .reply({
          embeds: [embed],
        })
        .catch((err) =>
          this.logger.error("Error when sending ping message: " + err.message)
        );
      return;
    }

    return;
  }
}
