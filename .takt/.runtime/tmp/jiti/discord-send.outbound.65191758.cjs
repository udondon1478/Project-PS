"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.sendMessageDiscord = sendMessageDiscord;exports.sendPollDiscord = sendPollDiscord;exports.sendStickerDiscord = sendStickerDiscord;var _v = require("discord-api-types/v10");
var _chunk = require("../auto-reply/chunk.js");
var _config = require("../config/config.js");
var _markdownTables = require("../config/markdown-tables.js");
var _channelActivity = require("../infra/channel-activity.js");
var _tables = require("../markdown/tables.js");
var _accounts = require("./accounts.js");
var _sendShared = require("./send.shared.js");
async function sendMessageDiscord(to, text, opts = {}) {
  const cfg = (0, _config.loadConfig)();
  const accountInfo = (0, _accounts.resolveDiscordAccount)({
    cfg,
    accountId: opts.accountId
  });
  const tableMode = (0, _markdownTables.resolveMarkdownTableMode)({
    cfg,
    channel: "discord",
    accountId: accountInfo.accountId
  });
  const chunkMode = (0, _chunk.resolveChunkMode)(cfg, "discord", accountInfo.accountId);
  const textWithTables = (0, _tables.convertMarkdownTables)(text ?? "", tableMode);
  const { token, rest, request } = (0, _sendShared.createDiscordClient)(opts, cfg);
  const recipient = await (0, _sendShared.parseAndResolveRecipient)(to, opts.accountId);
  const { channelId } = await (0, _sendShared.resolveChannelId)(rest, recipient, request);
  let result;
  try {
    if (opts.mediaUrl) {
      result = await (0, _sendShared.sendDiscordMedia)(rest, channelId, textWithTables, opts.mediaUrl, opts.replyTo, request, accountInfo.config.maxLinesPerMessage, opts.embeds, chunkMode);
    } else
    {
      result = await (0, _sendShared.sendDiscordText)(rest, channelId, textWithTables, opts.replyTo, request, accountInfo.config.maxLinesPerMessage, opts.embeds, chunkMode);
    }
  }
  catch (err) {
    throw await (0, _sendShared.buildDiscordSendError)(err, {
      channelId,
      rest,
      token,
      hasMedia: Boolean(opts.mediaUrl)
    });
  }
  (0, _channelActivity.recordChannelActivity)({
    channel: "discord",
    accountId: accountInfo.accountId,
    direction: "outbound"
  });
  return {
    messageId: result.id ? String(result.id) : "unknown",
    channelId: String(result.channel_id ?? channelId)
  };
}
async function sendStickerDiscord(to, stickerIds, opts = {}) {
  const cfg = (0, _config.loadConfig)();
  const { rest, request } = (0, _sendShared.createDiscordClient)(opts, cfg);
  const recipient = await (0, _sendShared.parseAndResolveRecipient)(to, opts.accountId);
  const { channelId } = await (0, _sendShared.resolveChannelId)(rest, recipient, request);
  const content = opts.content?.trim();
  const stickers = (0, _sendShared.normalizeStickerIds)(stickerIds);
  const res = await request(() => rest.post(_v.Routes.channelMessages(channelId), {
    body: {
      content: content || undefined,
      sticker_ids: stickers
    }
  }), "sticker");
  return {
    messageId: res.id ? String(res.id) : "unknown",
    channelId: String(res.channel_id ?? channelId)
  };
}
async function sendPollDiscord(to, poll, opts = {}) {
  const cfg = (0, _config.loadConfig)();
  const { rest, request } = (0, _sendShared.createDiscordClient)(opts, cfg);
  const recipient = await (0, _sendShared.parseAndResolveRecipient)(to, opts.accountId);
  const { channelId } = await (0, _sendShared.resolveChannelId)(rest, recipient, request);
  const content = opts.content?.trim();
  const payload = (0, _sendShared.normalizeDiscordPollInput)(poll);
  const res = await request(() => rest.post(_v.Routes.channelMessages(channelId), {
    body: {
      content: content || undefined,
      poll: payload
    }
  }), "poll");
  return {
    messageId: res.id ? String(res.id) : "unknown",
    channelId: String(res.channel_id ?? channelId)
  };
} /* v9-12d3dc02e493eeb7 */
