"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatDiscordReactionEmoji = formatDiscordReactionEmoji;exports.formatDiscordUserTag = formatDiscordUserTag;exports.resolveDiscordSystemLocation = resolveDiscordSystemLocation;exports.resolveTimestampMs = resolveTimestampMs;function resolveDiscordSystemLocation(params) {
  const { isDirectMessage, isGroupDm, guild, channelName } = params;
  if (isDirectMessage) {
    return "DM";
  }
  if (isGroupDm) {
    return `Group DM #${channelName}`;
  }
  return guild?.name ? `${guild.name} #${channelName}` : `#${channelName}`;
}
function formatDiscordReactionEmoji(emoji) {
  if (emoji.id && emoji.name) {
    return `${emoji.name}:${emoji.id}`;
  }
  return emoji.name ?? "emoji";
}
function formatDiscordUserTag(user) {
  const discriminator = (user.discriminator ?? "").trim();
  if (discriminator && discriminator !== "0") {
    return `${user.username}#${discriminator}`;
  }
  return user.username ?? user.id;
}
function resolveTimestampMs(timestamp) {
  if (!timestamp) {
    return undefined;
  }
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? undefined : parsed;
} /* v9-145f34e4191a2ee5 */
