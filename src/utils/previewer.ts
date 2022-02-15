import { version } from "../../package.json";
import { Permissions } from "discord.js";

export enum Colors {
  Pink = 16711760,
  Aqua = 62186,
  Black = 0,
}

export const PreviewerUA = `Previewer (https://github.com/saucesteals/previewer ${version})`;

export const InvitePermissions =
  Permissions.FLAGS.MANAGE_CHANNELS |
  Permissions.FLAGS.VIEW_CHANNEL |
  Permissions.FLAGS.SEND_MESSAGES |
  Permissions.FLAGS.EMBED_LINKS |
  Permissions.FLAGS.ATTACH_FILES |
  Permissions.FLAGS.ADD_REACTIONS |
  Permissions.FLAGS.USE_EXTERNAL_EMOJIS |
  Permissions.FLAGS.MANAGE_MESSAGES |
  Permissions.FLAGS.READ_MESSAGE_HISTORY;
