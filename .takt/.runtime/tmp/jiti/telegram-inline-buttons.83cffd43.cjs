"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isTelegramInlineButtonsEnabled = isTelegramInlineButtonsEnabled;exports.resolveTelegramInlineButtonsScope = resolveTelegramInlineButtonsScope;exports.resolveTelegramTargetChatType = resolveTelegramTargetChatType;var _accounts = require("./accounts.js");
var _targets = require("./targets.js");
const DEFAULT_INLINE_BUTTONS_SCOPE = "allowlist";
function normalizeInlineButtonsScope(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "off" ||
  trimmed === "dm" ||
  trimmed === "group" ||
  trimmed === "all" ||
  trimmed === "allowlist") {
    return trimmed;
  }
  return undefined;
}
function resolveInlineButtonsScopeFromCapabilities(capabilities) {
  if (!capabilities) {
    return DEFAULT_INLINE_BUTTONS_SCOPE;
  }
  if (Array.isArray(capabilities)) {
    const enabled = capabilities.some((entry) => String(entry).trim().toLowerCase() === "inlinebuttons");
    return enabled ? "all" : "off";
  }
  if (typeof capabilities === "object") {
    const inlineButtons = capabilities.inlineButtons;
    return normalizeInlineButtonsScope(inlineButtons) ?? DEFAULT_INLINE_BUTTONS_SCOPE;
  }
  return DEFAULT_INLINE_BUTTONS_SCOPE;
}
function resolveTelegramInlineButtonsScope(params) {
  const account = (0, _accounts.resolveTelegramAccount)({ cfg: params.cfg, accountId: params.accountId });
  return resolveInlineButtonsScopeFromCapabilities(account.config.capabilities);
}
function isTelegramInlineButtonsEnabled(params) {
  if (params.accountId) {
    return resolveTelegramInlineButtonsScope(params) !== "off";
  }
  const accountIds = (0, _accounts.listTelegramAccountIds)(params.cfg);
  if (accountIds.length === 0) {
    return resolveTelegramInlineButtonsScope(params) !== "off";
  }
  return accountIds.some((accountId) => resolveTelegramInlineButtonsScope({ cfg: params.cfg, accountId }) !== "off");
}
function resolveTelegramTargetChatType(target) {
  if (!target.trim()) {
    return "unknown";
  }
  const parsed = (0, _targets.parseTelegramTarget)(target);
  const chatId = parsed.chatId.trim();
  if (!chatId) {
    return "unknown";
  }
  if (/^-?\d+$/.test(chatId)) {
    return chatId.startsWith("-") ? "group" : "direct";
  }
  return "unknown";
} /* v9-c859617cc8dd3b1f */
