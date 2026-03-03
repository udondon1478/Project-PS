"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.listEnabledIMessageAccounts = listEnabledIMessageAccounts;exports.listIMessageAccountIds = listIMessageAccountIds;exports.resolveDefaultIMessageAccountId = resolveDefaultIMessageAccountId;exports.resolveIMessageAccount = resolveIMessageAccount;var _sessionKey = require("../routing/session-key.js");
function listConfiguredAccountIds(cfg) {
  const accounts = cfg.channels?.imessage?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return [];
  }
  return Object.keys(accounts).filter(Boolean);
}
function listIMessageAccountIds(cfg) {
  const ids = listConfiguredAccountIds(cfg);
  if (ids.length === 0) {
    return [_sessionKey.DEFAULT_ACCOUNT_ID];
  }
  return ids.toSorted((a, b) => a.localeCompare(b));
}
function resolveDefaultIMessageAccountId(cfg) {
  const ids = listIMessageAccountIds(cfg);
  if (ids.includes(_sessionKey.DEFAULT_ACCOUNT_ID)) {
    return _sessionKey.DEFAULT_ACCOUNT_ID;
  }
  return ids[0] ?? _sessionKey.DEFAULT_ACCOUNT_ID;
}
function resolveAccountConfig(cfg, accountId) {
  const accounts = cfg.channels?.imessage?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return undefined;
  }
  return accounts[accountId];
}
function mergeIMessageAccountConfig(cfg, accountId) {
  const { accounts: _ignored, ...base } = cfg.channels?.imessage ??
  {};
  const account = resolveAccountConfig(cfg, accountId) ?? {};
  return { ...base, ...account };
}
function resolveIMessageAccount(params) {
  const accountId = (0, _sessionKey.normalizeAccountId)(params.accountId);
  const baseEnabled = params.cfg.channels?.imessage?.enabled !== false;
  const merged = mergeIMessageAccountConfig(params.cfg, accountId);
  const accountEnabled = merged.enabled !== false;
  const configured = Boolean(merged.cliPath?.trim() ||
  merged.dbPath?.trim() ||
  merged.service ||
  merged.region?.trim() ||
  merged.allowFrom && merged.allowFrom.length > 0 ||
  merged.groupAllowFrom && merged.groupAllowFrom.length > 0 ||
  merged.dmPolicy ||
  merged.groupPolicy ||
  typeof merged.includeAttachments === "boolean" ||
  typeof merged.mediaMaxMb === "number" ||
  typeof merged.textChunkLimit === "number" ||
  merged.groups && Object.keys(merged.groups).length > 0);
  return {
    accountId,
    enabled: baseEnabled && accountEnabled,
    name: merged.name?.trim() || undefined,
    config: merged,
    configured
  };
}
function listEnabledIMessageAccounts(cfg) {
  return listIMessageAccountIds(cfg).
  map((accountId) => resolveIMessageAccount({ cfg, accountId })).
  filter((account) => account.enabled);
} /* v9-28089c8f8f37f6aa */
