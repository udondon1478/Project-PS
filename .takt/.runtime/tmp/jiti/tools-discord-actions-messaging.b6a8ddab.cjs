"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleDiscordMessagingAction = handleDiscordMessagingAction;var _send = require("../../discord/send.js");
var _targets = require("../../discord/targets.js");
var _dateTime = require("../date-time.js");
var _common = require("./common.js");
function parseDiscordMessageLink(link) {
  const normalized = link.trim();
  const match = normalized.match(/^(?:https?:\/\/)?(?:ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)(?:\/?|\?.*)$/i);
  if (!match) {
    throw new Error("Invalid Discord message link. Expected https://discord.com/channels/<guildId>/<channelId>/<messageId>.");
  }
  return {
    guildId: match[1],
    channelId: match[2],
    messageId: match[3]
  };
}
async function handleDiscordMessagingAction(action, params, isActionEnabled) {
  const resolveChannelId = () => (0, _targets.resolveDiscordChannelId)((0, _common.readStringParam)(params, "channelId", {
    required: true
  }));
  const accountId = (0, _common.readStringParam)(params, "accountId");
  const normalizeMessage = (message) => {
    if (!message || typeof message !== "object") {
      return message;
    }
    return (0, _dateTime.withNormalizedTimestamp)(message, message.timestamp);
  };
  switch (action) {
    case "react":{
        if (!isActionEnabled("reactions")) {
          throw new Error("Discord reactions are disabled.");
        }
        const channelId = resolveChannelId();
        const messageId = (0, _common.readStringParam)(params, "messageId", {
          required: true
        });
        const { emoji, remove, isEmpty } = (0, _common.readReactionParams)(params, {
          removeErrorMessage: "Emoji is required to remove a Discord reaction."
        });
        if (remove) {
          if (accountId) {
            await (0, _send.removeReactionDiscord)(channelId, messageId, emoji, { accountId });
          } else
          {
            await (0, _send.removeReactionDiscord)(channelId, messageId, emoji);
          }
          return (0, _common.jsonResult)({ ok: true, removed: emoji });
        }
        if (isEmpty) {
          const removed = accountId ?
          await (0, _send.removeOwnReactionsDiscord)(channelId, messageId, { accountId }) :
          await (0, _send.removeOwnReactionsDiscord)(channelId, messageId);
          return (0, _common.jsonResult)({ ok: true, removed: removed.removed });
        }
        if (accountId) {
          await (0, _send.reactMessageDiscord)(channelId, messageId, emoji, { accountId });
        } else
        {
          await (0, _send.reactMessageDiscord)(channelId, messageId, emoji);
        }
        return (0, _common.jsonResult)({ ok: true, added: emoji });
      }
    case "reactions":{
        if (!isActionEnabled("reactions")) {
          throw new Error("Discord reactions are disabled.");
        }
        const channelId = resolveChannelId();
        const messageId = (0, _common.readStringParam)(params, "messageId", {
          required: true
        });
        const limitRaw = params.limit;
        const limit = typeof limitRaw === "number" && Number.isFinite(limitRaw) ? limitRaw : undefined;
        const reactions = await (0, _send.fetchReactionsDiscord)(channelId, messageId, {
          ...(accountId ? { accountId } : {}),
          limit
        });
        return (0, _common.jsonResult)({ ok: true, reactions });
      }
    case "sticker":{
        if (!isActionEnabled("stickers")) {
          throw new Error("Discord stickers are disabled.");
        }
        const to = (0, _common.readStringParam)(params, "to", { required: true });
        const content = (0, _common.readStringParam)(params, "content");
        const stickerIds = (0, _common.readStringArrayParam)(params, "stickerIds", {
          required: true,
          label: "stickerIds"
        });
        await (0, _send.sendStickerDiscord)(to, stickerIds, {
          ...(accountId ? { accountId } : {}),
          content
        });
        return (0, _common.jsonResult)({ ok: true });
      }
    case "poll":{
        if (!isActionEnabled("polls")) {
          throw new Error("Discord polls are disabled.");
        }
        const to = (0, _common.readStringParam)(params, "to", { required: true });
        const content = (0, _common.readStringParam)(params, "content");
        const question = (0, _common.readStringParam)(params, "question", {
          required: true
        });
        const answers = (0, _common.readStringArrayParam)(params, "answers", {
          required: true,
          label: "answers"
        });
        const allowMultiselectRaw = params.allowMultiselect;
        const allowMultiselect = typeof allowMultiselectRaw === "boolean" ? allowMultiselectRaw : undefined;
        const durationRaw = params.durationHours;
        const durationHours = typeof durationRaw === "number" && Number.isFinite(durationRaw) ? durationRaw : undefined;
        const maxSelections = allowMultiselect ? Math.max(2, answers.length) : 1;
        await (0, _send.sendPollDiscord)(to, { question, options: answers, maxSelections, durationHours }, { ...(accountId ? { accountId } : {}), content });
        return (0, _common.jsonResult)({ ok: true });
      }
    case "permissions":{
        if (!isActionEnabled("permissions")) {
          throw new Error("Discord permissions are disabled.");
        }
        const channelId = resolveChannelId();
        const permissions = accountId ?
        await (0, _send.fetchChannelPermissionsDiscord)(channelId, { accountId }) :
        await (0, _send.fetchChannelPermissionsDiscord)(channelId);
        return (0, _common.jsonResult)({ ok: true, permissions });
      }
    case "fetchMessage":{
        if (!isActionEnabled("messages")) {
          throw new Error("Discord message reads are disabled.");
        }
        const messageLink = (0, _common.readStringParam)(params, "messageLink");
        let guildId = (0, _common.readStringParam)(params, "guildId");
        let channelId = (0, _common.readStringParam)(params, "channelId");
        let messageId = (0, _common.readStringParam)(params, "messageId");
        if (messageLink) {
          const parsed = parseDiscordMessageLink(messageLink);
          guildId = parsed.guildId;
          channelId = parsed.channelId;
          messageId = parsed.messageId;
        }
        if (!guildId || !channelId || !messageId) {
          throw new Error("Discord message fetch requires guildId, channelId, and messageId (or a valid messageLink).");
        }
        const message = accountId ?
        await (0, _send.fetchMessageDiscord)(channelId, messageId, { accountId }) :
        await (0, _send.fetchMessageDiscord)(channelId, messageId);
        return (0, _common.jsonResult)({
          ok: true,
          message: normalizeMessage(message),
          guildId,
          channelId,
          messageId
        });
      }
    case "readMessages":{
        if (!isActionEnabled("messages")) {
          throw new Error("Discord message reads are disabled.");
        }
        const channelId = resolveChannelId();
        const query = {
          limit: typeof params.limit === "number" && Number.isFinite(params.limit) ?
          params.limit :
          undefined,
          before: (0, _common.readStringParam)(params, "before"),
          after: (0, _common.readStringParam)(params, "after"),
          around: (0, _common.readStringParam)(params, "around")
        };
        const messages = accountId ?
        await (0, _send.readMessagesDiscord)(channelId, query, { accountId }) :
        await (0, _send.readMessagesDiscord)(channelId, query);
        return (0, _common.jsonResult)({
          ok: true,
          messages: messages.map((message) => normalizeMessage(message))
        });
      }
    case "sendMessage":{
        if (!isActionEnabled("messages")) {
          throw new Error("Discord message sends are disabled.");
        }
        const to = (0, _common.readStringParam)(params, "to", { required: true });
        const content = (0, _common.readStringParam)(params, "content", {
          required: true
        });
        const mediaUrl = (0, _common.readStringParam)(params, "mediaUrl");
        const replyTo = (0, _common.readStringParam)(params, "replyTo");
        const embeds = Array.isArray(params.embeds) && params.embeds.length > 0 ? params.embeds : undefined;
        const result = await (0, _send.sendMessageDiscord)(to, content, {
          ...(accountId ? { accountId } : {}),
          mediaUrl,
          replyTo,
          embeds
        });
        return (0, _common.jsonResult)({ ok: true, result });
      }
    case "editMessage":{
        if (!isActionEnabled("messages")) {
          throw new Error("Discord message edits are disabled.");
        }
        const channelId = resolveChannelId();
        const messageId = (0, _common.readStringParam)(params, "messageId", {
          required: true
        });
        const content = (0, _common.readStringParam)(params, "content", {
          required: true
        });
        const message = accountId ?
        await (0, _send.editMessageDiscord)(channelId, messageId, { content }, { accountId }) :
        await (0, _send.editMessageDiscord)(channelId, messageId, { content });
        return (0, _common.jsonResult)({ ok: true, message });
      }
    case "deleteMessage":{
        if (!isActionEnabled("messages")) {
          throw new Error("Discord message deletes are disabled.");
        }
        const channelId = resolveChannelId();
        const messageId = (0, _common.readStringParam)(params, "messageId", {
          required: true
        });
        if (accountId) {
          await (0, _send.deleteMessageDiscord)(channelId, messageId, { accountId });
        } else
        {
          await (0, _send.deleteMessageDiscord)(channelId, messageId);
        }
        return (0, _common.jsonResult)({ ok: true });
      }
    case "threadCreate":{
        if (!isActionEnabled("threads")) {
          throw new Error("Discord threads are disabled.");
        }
        const channelId = resolveChannelId();
        const name = (0, _common.readStringParam)(params, "name", { required: true });
        const messageId = (0, _common.readStringParam)(params, "messageId");
        const autoArchiveMinutesRaw = params.autoArchiveMinutes;
        const autoArchiveMinutes = typeof autoArchiveMinutesRaw === "number" && Number.isFinite(autoArchiveMinutesRaw) ?
        autoArchiveMinutesRaw :
        undefined;
        const thread = accountId ?
        await (0, _send.createThreadDiscord)(channelId, { name, messageId, autoArchiveMinutes }, { accountId }) :
        await (0, _send.createThreadDiscord)(channelId, { name, messageId, autoArchiveMinutes });
        return (0, _common.jsonResult)({ ok: true, thread });
      }
    case "threadList":{
        if (!isActionEnabled("threads")) {
          throw new Error("Discord threads are disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const channelId = (0, _common.readStringParam)(params, "channelId");
        const includeArchived = typeof params.includeArchived === "boolean" ? params.includeArchived : undefined;
        const before = (0, _common.readStringParam)(params, "before");
        const limit = typeof params.limit === "number" && Number.isFinite(params.limit) ?
        params.limit :
        undefined;
        const threads = accountId ?
        await (0, _send.listThreadsDiscord)({
          guildId,
          channelId,
          includeArchived,
          before,
          limit
        }, { accountId }) :
        await (0, _send.listThreadsDiscord)({
          guildId,
          channelId,
          includeArchived,
          before,
          limit
        });
        return (0, _common.jsonResult)({ ok: true, threads });
      }
    case "threadReply":{
        if (!isActionEnabled("threads")) {
          throw new Error("Discord threads are disabled.");
        }
        const channelId = resolveChannelId();
        const content = (0, _common.readStringParam)(params, "content", {
          required: true
        });
        const mediaUrl = (0, _common.readStringParam)(params, "mediaUrl");
        const replyTo = (0, _common.readStringParam)(params, "replyTo");
        const result = await (0, _send.sendMessageDiscord)(`channel:${channelId}`, content, {
          ...(accountId ? { accountId } : {}),
          mediaUrl,
          replyTo
        });
        return (0, _common.jsonResult)({ ok: true, result });
      }
    case "pinMessage":{
        if (!isActionEnabled("pins")) {
          throw new Error("Discord pins are disabled.");
        }
        const channelId = resolveChannelId();
        const messageId = (0, _common.readStringParam)(params, "messageId", {
          required: true
        });
        if (accountId) {
          await (0, _send.pinMessageDiscord)(channelId, messageId, { accountId });
        } else
        {
          await (0, _send.pinMessageDiscord)(channelId, messageId);
        }
        return (0, _common.jsonResult)({ ok: true });
      }
    case "unpinMessage":{
        if (!isActionEnabled("pins")) {
          throw new Error("Discord pins are disabled.");
        }
        const channelId = resolveChannelId();
        const messageId = (0, _common.readStringParam)(params, "messageId", {
          required: true
        });
        if (accountId) {
          await (0, _send.unpinMessageDiscord)(channelId, messageId, { accountId });
        } else
        {
          await (0, _send.unpinMessageDiscord)(channelId, messageId);
        }
        return (0, _common.jsonResult)({ ok: true });
      }
    case "listPins":{
        if (!isActionEnabled("pins")) {
          throw new Error("Discord pins are disabled.");
        }
        const channelId = resolveChannelId();
        const pins = accountId ?
        await (0, _send.listPinsDiscord)(channelId, { accountId }) :
        await (0, _send.listPinsDiscord)(channelId);
        return (0, _common.jsonResult)({ ok: true, pins: pins.map((pin) => normalizeMessage(pin)) });
      }
    case "searchMessages":{
        if (!isActionEnabled("search")) {
          throw new Error("Discord search is disabled.");
        }
        const guildId = (0, _common.readStringParam)(params, "guildId", {
          required: true
        });
        const content = (0, _common.readStringParam)(params, "content", {
          required: true
        });
        const channelId = (0, _common.readStringParam)(params, "channelId");
        const channelIds = (0, _common.readStringArrayParam)(params, "channelIds");
        const authorId = (0, _common.readStringParam)(params, "authorId");
        const authorIds = (0, _common.readStringArrayParam)(params, "authorIds");
        const limit = typeof params.limit === "number" && Number.isFinite(params.limit) ?
        params.limit :
        undefined;
        const channelIdList = [...(channelIds ?? []), ...(channelId ? [channelId] : [])];
        const authorIdList = [...(authorIds ?? []), ...(authorId ? [authorId] : [])];
        const results = accountId ?
        await (0, _send.searchMessagesDiscord)({
          guildId,
          content,
          channelIds: channelIdList.length ? channelIdList : undefined,
          authorIds: authorIdList.length ? authorIdList : undefined,
          limit
        }, { accountId }) :
        await (0, _send.searchMessagesDiscord)({
          guildId,
          content,
          channelIds: channelIdList.length ? channelIdList : undefined,
          authorIds: authorIdList.length ? authorIdList : undefined,
          limit
        });
        if (!results || typeof results !== "object") {
          return (0, _common.jsonResult)({ ok: true, results });
        }
        const resultsRecord = results;
        const messages = resultsRecord.messages;
        const normalizedMessages = Array.isArray(messages) ?
        messages.map((group) => Array.isArray(group) ? group.map((msg) => normalizeMessage(msg)) : group) :
        messages;
        return (0, _common.jsonResult)({
          ok: true,
          results: {
            ...resultsRecord,
            messages: normalizedMessages
          }
        });
      }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
} /* v9-21c249e280a82861 */
