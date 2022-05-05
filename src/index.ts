import dotenv from "dotenv";
dotenv.config();
import assert from "assert";
import { Intents } from "discord.js";
import PreviewerClient from "./structures/client";
import { DefaultSupportGuildInvite } from "./utils/previewer";

const supportGuildInvite =
  process.env.SUPPORT_GUILD_INVITE ?? DefaultSupportGuildInvite;

const token = process.env.DISCORD_BOT_TOKEN;
assert(token, "You forgot to set DISCORD_BOT_TOKEN");

const client = new PreviewerClient(supportGuildInvite, {
  intents:
    Object.values(Intents.FLAGS).reduce((acc, p) => acc | p, 0) &
    ~(Intents.FLAGS.GUILD_MEMBERS | Intents.FLAGS.GUILD_PRESENCES),
});

client.login(token);

process.on("uncaughtException", (err) => console.error(err));
process.on("unhandledRejection", (err) => console.error(err));
