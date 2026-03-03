"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.telegramMessageActions = void 0;var _common = require("../../../agents/tools/common.js");
var _telegramActions = require("../../../agents/tools/telegram-actions.js");
var _accounts = require("../../../telegram/accounts.js");
var _inlineButtons = require("../../../telegram/inline-buttons.js");
const providerId = "telegram";
function readTelegramSendParams(params) {
  const to = (0, _common.readStringParam)(params, "to", { required: true });
  const mediaUrl = (0, _common.readStringParam)(params, "media", { trim: false });
  const message = (0, _common.readStringParam)(params, "message", { required: !mediaUrl, allowEmpty: true });
  const caption = (0, _common.readStringParam)(params, "caption", { allowEmpty: true });
  const content = message || caption || "";
  const replyTo = (0, _common.readStringParam)(params, "replyTo");
  const threadId = (0, _common.readStringParam)(params, "threadId");
  const buttons = params.buttons;
  const asVoice = typeof params.asVoice === "boolean" ? params.asVoice : undefined;
  const silent = typeof params.silent === "boolean" ? params.silent : undefined;
  const quoteText = (0, _common.readStringParam)(params, "quoteText");
  return {
    to,
    content,
    mediaUrl: mediaUrl ?? undefined,
    replyToMessageId: replyTo ?? undefined,
    messageThreadId: threadId ?? undefined,
    buttons,
    asVoice,
    silent,
    quoteText: quoteText ?? undefined
  };
}
const telegramMessageActions = exports.telegramMessageActions = {
  listActions: ({ cfg }) => {
    const accounts = (0, _accounts.listEnabledTelegramAccounts)(cfg).filter((account) => account.tokenSource !== "none");
    if (accounts.length === 0) {
      return [];
    }
    const gate = (0, _common.createActionGate)(cfg.channels?.telegram?.actions);
    const actions = new Set(["send"]);
    if (gate("reactions")) {
      actions.add("react");
    }
    if (gate("deleteMessage")) {
      actions.add("delete");
    }
    if (gate("editMessage")) {
      actions.add("edit");
    }
    if (gate("sticker", false)) {
      actions.add("sticker");
      actions.add("sticker-search");
    }
    return Array.from(actions);
  },
  supportsButtons: ({ cfg }) => {
    const accounts = (0, _accounts.listEnabledTelegramAccounts)(cfg).filter((account) => account.tokenSource !== "none");
    if (accounts.length === 0) {
      return false;
    }
    return accounts.some((account) => (0, _inlineButtons.isTelegramInlineButtonsEnabled)({ cfg, accountId: account.accountId }));
  },
  extractToolSend: ({ args }) => {
    const action = typeof args.action === "string" ? args.action.trim() : "";
    if (action !== "sendMessage") {
      return null;
    }
    const to = typeof args.to === "string" ? args.to : undefined;
    if (!to) {
      return null;
    }
    const accountId = typeof args.accountId === "string" ? args.accountId.trim() : undefined;
    return { to, accountId };
  },
  handleAction: async ({ action, params, cfg, accountId }) => {
    if (action === "send") {
      const sendParams = readTelegramSendParams(params);
      return await (0, _telegramActions.handleTelegramAction)({
        action: "sendMessage",
        ...sendParams,
        accountId: accountId ?? undefined
      }, cfg);
    }
    if (action === "react") {
      const messageId = (0, _common.readStringOrNumberParam)(params, "messageId", {
        required: true
      });
      const emoji = (0, _common.readStringParam)(params, "emoji", { allowEmpty: true });
      const remove = typeof params.remove === "boolean" ? params.remove : undefined;
      return await (0, _telegramActions.handleTelegramAction)({
        action: "react",
        chatId: (0, _common.readStringOrNumberParam)(params, "chatId") ??
        (0, _common.readStringOrNumberParam)(params, "channelId") ??
        (0, _common.readStringParam)(params, "to", { required: true }),
        messageId,
        emoji,
        remove,
        accountId: accountId ?? undefined
      }, cfg);
    }
    if (action === "delete") {
      const chatId = (0, _common.readStringOrNumberParam)(params, "chatId") ??
      (0, _common.readStringOrNumberParam)(params, "channelId") ??
      (0, _common.readStringParam)(params, "to", { required: true });
      const messageId = (0, _common.readNumberParam)(params, "messageId", {
        required: true,
        integer: true
      });
      return await (0, _telegramActions.handleTelegramAction)({
        action: "deleteMessage",
        chatId,
        messageId,
        accountId: accountId ?? undefined
      }, cfg);
    }
    if (action === "edit") {
      const chatId = (0, _common.readStringOrNumberParam)(params, "chatId") ??
      (0, _common.readStringOrNumberParam)(params, "channelId") ??
      (0, _common.readStringParam)(params, "to", { required: true });
      const messageId = (0, _common.readNumberParam)(params, "messageId", {
        required: true,
        integer: true
      });
      const message = (0, _common.readStringParam)(params, "message", { required: true, allowEmpty: false });
      const buttons = params.buttons;
      return await (0, _telegramActions.handleTelegramAction)({
        action: "editMessage",
        chatId,
        messageId,
        content: message,
        buttons,
        accountId: accountId ?? undefined
      }, cfg);
    }
    if (action === "sticker") {
      const to = (0, _common.readStringParam)(params, "to") ?? (0, _common.readStringParam)(params, "target", { required: true });
      // Accept stickerId (array from shared schema) and use first element as fileId
      const stickerIds = (0, _common.readStringArrayParam)(params, "stickerId");
      const fileId = stickerIds?.[0] ?? (0, _common.readStringParam)(params, "fileId", { required: true });
      const replyToMessageId = (0, _common.readNumberParam)(params, "replyTo", { integer: true });
      const messageThreadId = (0, _common.readNumberParam)(params, "threadId", { integer: true });
      return await (0, _telegramActions.handleTelegramAction)({
        action: "sendSticker",
        to,
        fileId,
        replyToMessageId: replyToMessageId ?? undefined,
        messageThreadId: messageThreadId ?? undefined,
        accountId: accountId ?? undefined
      }, cfg);
    }
    if (action === "sticker-search") {
      const query = (0, _common.readStringParam)(params, "query", { required: true });
      const limit = (0, _common.readNumberParam)(params, "limit", { integer: true });
      return await (0, _telegramActions.handleTelegramAction)({
        action: "searchSticker",
        query,
        limit: limit ?? undefined,
        accountId: accountId ?? undefined
      }, cfg);
    }
    throw new Error(`Action ${action} is not supported for provider ${providerId}.`);
  }
}; /* v9-fd1fa6231d833083 */
