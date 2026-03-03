"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.listGuildEmojisDiscord = listGuildEmojisDiscord;exports.uploadEmojiDiscord = uploadEmojiDiscord;exports.uploadStickerDiscord = uploadStickerDiscord;var _v = require("discord-api-types/v10");
var _media = require("../web/media.js");
var _sendShared = require("./send.shared.js");
var _sendTypes = require("./send.types.js");
async function listGuildEmojisDiscord(guildId, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  return await rest.get(_v.Routes.guildEmojis(guildId));
}
async function uploadEmojiDiscord(payload, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  const media = await (0, _media.loadWebMediaRaw)(payload.mediaUrl, _sendTypes.DISCORD_MAX_EMOJI_BYTES);
  const contentType = media.contentType?.toLowerCase();
  if (!contentType ||
  !["image/png", "image/jpeg", "image/jpg", "image/gif"].includes(contentType)) {
    throw new Error("Discord emoji uploads require a PNG, JPG, or GIF image");
  }
  const image = `data:${contentType};base64,${media.buffer.toString("base64")}`;
  const roleIds = (payload.roleIds ?? []).map((id) => id.trim()).filter(Boolean);
  return await rest.post(_v.Routes.guildEmojis(payload.guildId), {
    body: {
      name: (0, _sendShared.normalizeEmojiName)(payload.name, "Emoji name"),
      image,
      roles: roleIds.length ? roleIds : undefined
    }
  });
}
async function uploadStickerDiscord(payload, opts = {}) {
  const rest = (0, _sendShared.resolveDiscordRest)(opts);
  const media = await (0, _media.loadWebMediaRaw)(payload.mediaUrl, _sendTypes.DISCORD_MAX_STICKER_BYTES);
  const contentType = media.contentType?.toLowerCase();
  if (!contentType || !["image/png", "image/apng", "application/json"].includes(contentType)) {
    throw new Error("Discord sticker uploads require a PNG, APNG, or Lottie JSON file");
  }
  return await rest.post(_v.Routes.guildStickers(payload.guildId), {
    body: {
      name: (0, _sendShared.normalizeEmojiName)(payload.name, "Sticker name"),
      description: (0, _sendShared.normalizeEmojiName)(payload.description, "Sticker description"),
      tags: (0, _sendShared.normalizeEmojiName)(payload.tags, "Sticker tags"),
      files: [
      {
        data: media.buffer,
        name: media.fileName ?? "sticker",
        contentType
      }]

    }
  });
} /* v9-9f9626b0ab0347d0 */
