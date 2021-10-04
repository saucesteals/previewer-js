require("dotenv").config();
import { Intents } from "discord.js";
import PreviewerClient from "./structures/client";
import { assert } from "./utils/etc";

const client = new PreviewerClient({
  intents:
    Object.values(Intents.FLAGS).reduce((acc, p) => acc | p, 0) &
    ~(Intents.FLAGS.GUILD_MEMBERS | Intents.FLAGS.GUILD_PRESENCES),
});

client.login(
  assert(process.env.DISCORD_BOT_TOKEN, "No DISCORD_BOT_TOKEN found in the env")
);
