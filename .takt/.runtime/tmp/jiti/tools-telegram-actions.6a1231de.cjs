"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleTelegramAction = handleTelegramAction;exports.readTelegramButtons = readTelegramButtons;var _inlineButtons = require("../../telegram/inline-buttons.js");
var _reactionLevel = require("../../telegram/reaction-level.js");
var _send = require("../../telegram/send.js");
var _stickerCache = require("../../telegram/sticker-cache.js");
var _token = require("../../telegram/token.js");
var _common = require("./common.js");
function readTelegramButtons(params) {
  const raw = params.buttons;
  if (raw == null) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    throw new Error("buttons must be an array of button rows");
  }
  const rows = raw.map((row, rowIndex) => {
    if (!Array.isArray(row)) {
      throw new Error(`buttons[${rowIndex}] must be an array`);
    }
    return row.map((button, buttonIndex) => {
      if (!button || typeof button !== "object") {
        throw new Error(`buttons[${rowIndex}][${buttonIndex}] must be an object`);
      }
      const text = typeof button.text === "string" ?
      button.text.trim() :
      "";
      const callbackData = typeof button.callback_data === "string" ?
      button.callback_data.trim() :
      "";
      if (!text || !callbackData) {
        throw new Error(`buttons[${rowIndex}][${buttonIndex}] requires text and callback_data`);
      }
      if (callbackData.length > 64) {
        throw new Error(`buttons[${rowIndex}][${buttonIndex}] callback_data too long (max 64 chars)`);
      }
      return { text, callback_data: callbackData };
    });
  });
  const filtered = rows.filter((row) => row.length > 0);
  return filtered.length > 0 ? filtered : undefined;
}
async function handleTelegramAction(params, cfg) {
  const action = (0, _common.readStringParam)(params, "action", { required: true });
  const accountId = (0, _common.readStringParam)(params, "accountId");
  const isActionEnabled = (0, _common.createActionGate)(cfg.channels?.telegram?.actions);
  if (action === "react") {
    // Check reaction level first
    const reactionLevelInfo = (0, _reactionLevel.resolveTelegramReactionLevel)({
      cfg,
      accountId: accountId ?? undefined
    });
    if (!reactionLevelInfo.agentReactionsEnabled) {
      throw new Error(`Telegram agent reactions disabled (reactionLevel="${reactionLevelInfo.level}"). ` +
      `Set channels.telegram.reactionLevel to "minimal" or "extensive" to enable.`);
    }
    // Also check the existing action gate for backward compatibility
    if (!isActionEnabled("reactions")) {
      throw new Error("Telegram reactions are disabled via actions.reactions.");
    }
    const chatId = (0, _common.readStringOrNumberParam)(params, "chatId", {
      required: true
    });
    const messageId = (0, _common.readNumberParam)(params, "messageId", {
      required: true,
      integer: true
    });
    const { emoji, remove, isEmpty } = (0, _common.readReactionParams)(params, {
      removeErrorMessage: "Emoji is required to remove a Telegram reaction."
    });
    const token = (0, _token.resolveTelegramToken)(cfg, { accountId }).token;
    if (!token) {
      throw new Error("Telegram bot token missing. Set TELEGRAM_BOT_TOKEN or channels.telegram.botToken.");
    }
    await (0, _send.reactMessageTelegram)(chatId ?? "", messageId ?? 0, emoji ?? "", {
      token,
      remove,
      accountId: accountId ?? undefined
    });
    if (!remove && !isEmpty) {
      return (0, _common.jsonResult)({ ok: true, added: emoji });
    }
    return (0, _common.jsonResult)({ ok: true, removed: true });
  }
  if (action === "sendMessage") {
    if (!isActionEnabled("sendMessage")) {
      throw new Error("Telegram sendMessage is disabled.");
    }
    const to = (0, _common.readStringParam)(params, "to", { required: true });
    const mediaUrl = (0, _common.readStringParam)(params, "mediaUrl");
    // Allow content to be omitted when sending media-only (e.g., voice notes)
    const content = (0, _common.readStringParam)(params, "content", {
      required: !mediaUrl,
      allowEmpty: true
    }) ?? "";
    const buttons = readTelegramButtons(params);
    if (buttons) {
      const inlineButtonsScope = (0, _inlineButtons.resolveTelegramInlineButtonsScope)({
        cfg,
        accountId: accountId ?? undefined
      });
      if (inlineButtonsScope === "off") {
        throw new Error('Telegram inline buttons are disabled. Set channels.telegram.capabilities.inlineButtons to "dm", "group", "all", or "allowlist".');
      }
      if (inlineButtonsScope === "dm" || inlineButtonsScope === "group") {
        const targetType = (0, _inlineButtons.resolveTelegramTargetChatType)(to);
        if (targetType === "unknown") {
          throw new Error(`Telegram inline buttons require a numeric chat id when inlineButtons="${inlineButtonsScope}".`);
        }
        if (inlineButtonsScope === "dm" && targetType !== "direct") {
          throw new Error('Telegram inline buttons are limited to DMs when inlineButtons="dm".');
        }
        if (inlineButtonsScope === "group" && targetType !== "group") {
          throw new Error('Telegram inline buttons are limited to groups when inlineButtons="group".');
        }
      }
    }
    // Optional threading parameters for forum topics and reply chains
    const replyToMessageId = (0, _common.readNumberParam)(params, "replyToMessageId", {
      integer: true
    });
    const messageThreadId = (0, _common.readNumberParam)(params, "messageThreadId", {
      integer: true
    });
    const quoteText = (0, _common.readStringParam)(params, "quoteText");
    const token = (0, _token.resolveTelegramToken)(cfg, { accountId }).token;
    if (!token) {
      throw new Error("Telegram bot token missing. Set TELEGRAM_BOT_TOKEN or channels.telegram.botToken.");
    }
    const result = await (0, _send.sendMessageTelegram)(to, content, {
      token,
      accountId: accountId ?? undefined,
      mediaUrl: mediaUrl || undefined,
      buttons,
      replyToMessageId: replyToMessageId ?? undefined,
      messageThreadId: messageThreadId ?? undefined,
      quoteText: quoteText ?? undefined,
      asVoice: typeof params.asVoice === "boolean" ? params.asVoice : undefined,
      silent: typeof params.silent === "boolean" ? params.silent : undefined
    });
    return (0, _common.jsonResult)({
      ok: true,
      messageId: result.messageId,
      chatId: result.chatId
    });
  }
  if (action === "deleteMessage") {
    if (!isActionEnabled("deleteMessage")) {
      throw new Error("Telegram deleteMessage is disabled.");
    }
    const chatId = (0, _common.readStringOrNumberParam)(params, "chatId", {
      required: true
    });
    const messageId = (0, _common.readNumberParam)(params, "messageId", {
      required: true,
      integer: true
    });
    const token = (0, _token.resolveTelegramToken)(cfg, { accountId }).token;
    if (!token) {
      throw new Error("Telegram bot token missing. Set TELEGRAM_BOT_TOKEN or channels.telegram.botToken.");
    }
    await (0, _send.deleteMessageTelegram)(chatId ?? "", messageId ?? 0, {
      token,
      accountId: accountId ?? undefined
    });
    return (0, _common.jsonResult)({ ok: true, deleted: true });
  }
  if (action === "editMessage") {
    if (!isActionEnabled("editMessage")) {
      throw new Error("Telegram editMessage is disabled.");
    }
    const chatId = (0, _common.readStringOrNumberParam)(params, "chatId", {
      required: true
    });
    const messageId = (0, _common.readNumberParam)(params, "messageId", {
      required: true,
      integer: true
    });
    const content = (0, _common.readStringParam)(params, "content", {
      required: true,
      allowEmpty: false
    });
    const buttons = readTelegramButtons(params);
    if (buttons) {
      const inlineButtonsScope = (0, _inlineButtons.resolveTelegramInlineButtonsScope)({
        cfg,
        accountId: accountId ?? undefined
      });
      if (inlineButtonsScope === "off") {
        throw new Error('Telegram inline buttons are disabled. Set channels.telegram.capabilities.inlineButtons to "dm", "group", "all", or "allowlist".');
      }
    }
    const token = (0, _token.resolveTelegramToken)(cfg, { accountId }).token;
    if (!token) {
      throw new Error("Telegram bot token missing. Set TELEGRAM_BOT_TOKEN or channels.telegram.botToken.");
    }
    const result = await (0, _send.editMessageTelegram)(chatId ?? "", messageId ?? 0, content, {
      token,
      accountId: accountId ?? undefined,
      buttons
    });
    return (0, _common.jsonResult)({
      ok: true,
      messageId: result.messageId,
      chatId: result.chatId
    });
  }
  if (action === "sendSticker") {
    if (!isActionEnabled("sticker", false)) {
      throw new Error("Telegram sticker actions are disabled. Set channels.telegram.actions.sticker to true.");
    }
    const to = (0, _common.readStringParam)(params, "to", { required: true });
    const fileId = (0, _common.readStringParam)(params, "fileId", { required: true });
    const replyToMessageId = (0, _common.readNumberParam)(params, "replyToMessageId", {
      integer: true
    });
    const messageThreadId = (0, _common.readNumberParam)(params, "messageThreadId", {
      integer: true
    });
    const token = (0, _token.resolveTelegramToken)(cfg, { accountId }).token;
    if (!token) {
      throw new Error("Telegram bot token missing. Set TELEGRAM_BOT_TOKEN or channels.telegram.botToken.");
    }
    const result = await (0, _send.sendStickerTelegram)(to, fileId, {
      token,
      accountId: accountId ?? undefined,
      replyToMessageId: replyToMessageId ?? undefined,
      messageThreadId: messageThreadId ?? undefined
    });
    return (0, _common.jsonResult)({
      ok: true,
      messageId: result.messageId,
      chatId: result.chatId
    });
  }
  if (action === "searchSticker") {
    if (!isActionEnabled("sticker", false)) {
      throw new Error("Telegram sticker actions are disabled. Set channels.telegram.actions.sticker to true.");
    }
    const query = (0, _common.readStringParam)(params, "query", { required: true });
    const limit = (0, _common.readNumberParam)(params, "limit", { integer: true }) ?? 5;
    const results = (0, _stickerCache.searchStickers)(query, limit);
    return (0, _common.jsonResult)({
      ok: true,
      count: results.length,
      stickers: results.map((s) => ({
        fileId: s.fileId,
        emoji: s.emoji,
        description: s.description,
        setName: s.setName
      }))
    });
  }
  if (action === "stickerCacheStats") {
    const stats = (0, _stickerCache.getCacheStats)();
    return (0, _common.jsonResult)({ ok: true, ...stats });
  }
  throw new Error(`Unsupported Telegram action: ${action}`);
} /* v9-77bb65106a9334a2 */
