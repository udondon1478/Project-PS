"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DiscordSendError = exports.DISCORD_MAX_STICKER_BYTES = exports.DISCORD_MAX_EMOJI_BYTES = void 0;class DiscordSendError extends Error {
  kind;
  channelId;
  missingPermissions;
  constructor(message, opts) {
    super(message);
    this.name = "DiscordSendError";
    if (opts) {
      Object.assign(this, opts);
    }
  }
  toString() {
    return this.message;
  }
}exports.DiscordSendError = DiscordSendError;
const DISCORD_MAX_EMOJI_BYTES = exports.DISCORD_MAX_EMOJI_BYTES = 256 * 1024;
const DISCORD_MAX_STICKER_BYTES = exports.DISCORD_MAX_STICKER_BYTES = 512 * 1024; /* v9-d875692c39005f66 */
