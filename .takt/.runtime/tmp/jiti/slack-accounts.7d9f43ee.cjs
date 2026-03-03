"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.listEnabledSlackAccounts = listEnabledSlackAccounts;exports.listSlackAccountIds = listSlackAccountIds;exports.resolveDefaultSlackAccountId = resolveDefaultSlackAccountId;exports.resolveSlackAccount = resolveSlackAccount;exports.resolveSlackReplyToMode = resolveSlackReplyToMode;var _chatType = require("../channels/chat-type.js");
var _sessionKey = require("../routing/session-key.js");
var _token = require("./token.js");
function listConfiguredAccountIds(cfg) {
  const accounts = cfg.channels?.slack?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return [];
  }
  return Object.keys(accounts).filter(Boolean);
}
function listSlackAccountIds(cfg) {
  const ids = listConfiguredAccountIds(cfg);
  if (ids.length === 0) {
    return [_sessionKey.DEFAULT_ACCOUNT_ID];
  }
  return ids.toSorted((a, b) => a.localeCompare(b));
}
function resolveDefaultSlackAccountId(cfg) {
  const ids = listSlackAccountIds(cfg);
  if (ids.includes(_sessionKey.DEFAULT_ACCOUNT_ID)) {
    return _sessionKey.DEFAULT_ACCOUNT_ID;
  }
  return ids[0] ?? _sessionKey.DEFAULT_ACCOUNT_ID;
}
function resolveAccountConfig(cfg, accountId) {
  const accounts = cfg.channels?.slack?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return undefined;
  }
  return accounts[accountId];
}
function mergeSlackAccountConfig(cfg, accountId) {
  const { accounts: _ignored, ...base } = cfg.channels?.slack ?? {};
  const account = resolveAccountConfig(cfg, accountId) ?? {};
  return { ...base, ...account };
}
function resolveSlackAccount(params) {
  const accountId = (0, _sessionKey.normalizeAccountId)(params.accountId);
  const baseEnabled = params.cfg.channels?.slack?.enabled !== false;
  const merged = mergeSlackAccountConfig(params.cfg, accountId);
  const accountEnabled = merged.enabled !== false;
  const enabled = baseEnabled && accountEnabled;
  const allowEnv = accountId === _sessionKey.DEFAULT_ACCOUNT_ID;
  const envBot = allowEnv ? (0, _token.resolveSlackBotToken)(process.env.SLACK_BOT_TOKEN) : undefined;
  const envApp = allowEnv ? (0, _token.resolveSlackAppToken)(process.env.SLACK_APP_TOKEN) : undefined;
  const configBot = (0, _token.resolveSlackBotToken)(merged.botToken);
  const configApp = (0, _token.resolveSlackAppToken)(merged.appToken);
  const botToken = configBot ?? envBot;
  const appToken = configApp ?? envApp;
  const botTokenSource = configBot ? "config" : envBot ? "env" : "none";
  const appTokenSource = configApp ? "config" : envApp ? "env" : "none";
  return {
    accountId,
    enabled,
    name: merged.name?.trim() || undefined,
    botToken,
    appToken,
    botTokenSource,
    appTokenSource,
    config: merged,
    groupPolicy: merged.groupPolicy,
    textChunkLimit: merged.textChunkLimit,
    mediaMaxMb: merged.mediaMaxMb,
    reactionNotifications: merged.reactionNotifications,
    reactionAllowlist: merged.reactionAllowlist,
    replyToMode: merged.replyToMode,
    replyToModeByChatType: merged.replyToModeByChatType,
    actions: merged.actions,
    slashCommand: merged.slashCommand,
    dm: merged.dm,
    channels: merged.channels
  };
}
function listEnabledSlackAccounts(cfg) {
  return listSlackAccountIds(cfg).
  map((accountId) => resolveSlackAccount({ cfg, accountId })).
  filter((account) => account.enabled);
}
function resolveSlackReplyToMode(account, chatType) {
  const normalized = (0, _chatType.normalizeChatType)(chatType ?? undefined);
  if (normalized && account.replyToModeByChatType?.[normalized] !== undefined) {
    return account.replyToModeByChatType[normalized] ?? "off";
  }
  if (normalized === "direct" && account.dm?.replyToMode !== undefined) {
    return account.dm.replyToMode;
  }
  return account.replyToMode ?? "off";
} /* v9-4bc589b6335c06ba */
