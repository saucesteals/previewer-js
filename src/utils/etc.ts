import { AssertionError } from "assert";
import { Permissions } from "discord.js";

export const assert = <T>(value: T, errorMessage: string): NonNullable<T> => {
  if (value) return value as NonNullable<T>;
  throw new AssertionError({ message: errorMessage });
};

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
