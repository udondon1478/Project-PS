"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.hasAnyWhatsAppAuth = hasAnyWhatsAppAuth;exports.listEnabledWhatsAppAccounts = listEnabledWhatsAppAccounts;exports.listWhatsAppAccountIds = listWhatsAppAccountIds;exports.listWhatsAppAuthDirs = listWhatsAppAuthDirs;exports.resolveDefaultWhatsAppAccountId = resolveDefaultWhatsAppAccountId;exports.resolveWhatsAppAccount = resolveWhatsAppAccount;exports.resolveWhatsAppAuthDir = resolveWhatsAppAuthDir;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _paths = require("../config/paths.js");
var _sessionKey = require("../routing/session-key.js");
var _utils = require("../utils.js");
var _authStore = require("./auth-store.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function listConfiguredAccountIds(cfg) {
  const accounts = cfg.channels?.whatsapp?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return [];
  }
  return Object.keys(accounts).filter(Boolean);
}
function listWhatsAppAuthDirs(cfg) {
  const oauthDir = (0, _paths.resolveOAuthDir)();
  const whatsappDir = _nodePath.default.join(oauthDir, "whatsapp");
  const authDirs = new Set([oauthDir, _nodePath.default.join(whatsappDir, _sessionKey.DEFAULT_ACCOUNT_ID)]);
  const accountIds = listConfiguredAccountIds(cfg);
  for (const accountId of accountIds) {
    authDirs.add(resolveWhatsAppAuthDir({ cfg, accountId }).authDir);
  }
  try {
    const entries = _nodeFs.default.readdirSync(whatsappDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      authDirs.add(_nodePath.default.join(whatsappDir, entry.name));
    }
  }
  catch {

    // ignore missing dirs
  }return Array.from(authDirs);
}
function hasAnyWhatsAppAuth(cfg) {
  return listWhatsAppAuthDirs(cfg).some((authDir) => (0, _authStore.hasWebCredsSync)(authDir));
}
function listWhatsAppAccountIds(cfg) {
  const ids = listConfiguredAccountIds(cfg);
  if (ids.length === 0) {
    return [_sessionKey.DEFAULT_ACCOUNT_ID];
  }
  return ids.toSorted((a, b) => a.localeCompare(b));
}
function resolveDefaultWhatsAppAccountId(cfg) {
  const ids = listWhatsAppAccountIds(cfg);
  if (ids.includes(_sessionKey.DEFAULT_ACCOUNT_ID)) {
    return _sessionKey.DEFAULT_ACCOUNT_ID;
  }
  return ids[0] ?? _sessionKey.DEFAULT_ACCOUNT_ID;
}
function resolveAccountConfig(cfg, accountId) {
  const accounts = cfg.channels?.whatsapp?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return undefined;
  }
  const entry = accounts[accountId];
  return entry;
}
function resolveDefaultAuthDir(accountId) {
  return _nodePath.default.join((0, _paths.resolveOAuthDir)(), "whatsapp", (0, _sessionKey.normalizeAccountId)(accountId));
}
function resolveLegacyAuthDir() {
  // Legacy Baileys creds lived in the same directory as OAuth tokens.
  return (0, _paths.resolveOAuthDir)();
}
function legacyAuthExists(authDir) {
  try {
    return _nodeFs.default.existsSync(_nodePath.default.join(authDir, "creds.json"));
  }
  catch {
    return false;
  }
}
function resolveWhatsAppAuthDir(params) {
  const accountId = params.accountId.trim() || _sessionKey.DEFAULT_ACCOUNT_ID;
  const account = resolveAccountConfig(params.cfg, accountId);
  const configured = account?.authDir?.trim();
  if (configured) {
    return { authDir: (0, _utils.resolveUserPath)(configured), isLegacy: false };
  }
  const defaultDir = resolveDefaultAuthDir(accountId);
  if (accountId === _sessionKey.DEFAULT_ACCOUNT_ID) {
    const legacyDir = resolveLegacyAuthDir();
    if (legacyAuthExists(legacyDir) && !legacyAuthExists(defaultDir)) {
      return { authDir: legacyDir, isLegacy: true };
    }
  }
  return { authDir: defaultDir, isLegacy: false };
}
function resolveWhatsAppAccount(params) {
  const rootCfg = params.cfg.channels?.whatsapp;
  const accountId = params.accountId?.trim() || resolveDefaultWhatsAppAccountId(params.cfg);
  const accountCfg = resolveAccountConfig(params.cfg, accountId);
  const enabled = accountCfg?.enabled !== false;
  const { authDir, isLegacy } = resolveWhatsAppAuthDir({
    cfg: params.cfg,
    accountId
  });
  return {
    accountId,
    name: accountCfg?.name?.trim() || undefined,
    enabled,
    sendReadReceipts: accountCfg?.sendReadReceipts ?? rootCfg?.sendReadReceipts ?? true,
    messagePrefix: accountCfg?.messagePrefix ?? rootCfg?.messagePrefix ?? params.cfg.messages?.messagePrefix,
    authDir,
    isLegacyAuthDir: isLegacy,
    selfChatMode: accountCfg?.selfChatMode ?? rootCfg?.selfChatMode,
    dmPolicy: accountCfg?.dmPolicy ?? rootCfg?.dmPolicy,
    allowFrom: accountCfg?.allowFrom ?? rootCfg?.allowFrom,
    groupAllowFrom: accountCfg?.groupAllowFrom ?? rootCfg?.groupAllowFrom,
    groupPolicy: accountCfg?.groupPolicy ?? rootCfg?.groupPolicy,
    textChunkLimit: accountCfg?.textChunkLimit ?? rootCfg?.textChunkLimit,
    chunkMode: accountCfg?.chunkMode ?? rootCfg?.chunkMode,
    mediaMaxMb: accountCfg?.mediaMaxMb ?? rootCfg?.mediaMaxMb,
    blockStreaming: accountCfg?.blockStreaming ?? rootCfg?.blockStreaming,
    ackReaction: accountCfg?.ackReaction ?? rootCfg?.ackReaction,
    groups: accountCfg?.groups ?? rootCfg?.groups,
    debounceMs: accountCfg?.debounceMs ?? rootCfg?.debounceMs
  };
}
function listEnabledWhatsAppAccounts(cfg) {
  return listWhatsAppAccountIds(cfg).
  map((accountId) => resolveWhatsAppAccount({ cfg, accountId })).
  filter((account) => account.enabled);
} /* v9-d73d281e8972ebd0 */
