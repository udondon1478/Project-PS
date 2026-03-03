"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.listDiscordAccountIds = listDiscordAccountIds;exports.listEnabledDiscordAccounts = listEnabledDiscordAccounts;exports.resolveDefaultDiscordAccountId = resolveDefaultDiscordAccountId;exports.resolveDiscordAccount = resolveDiscordAccount;var _sessionKey = require("../routing/session-key.js");
var _token = require("./token.js");
function listConfiguredAccountIds(cfg) {
  const accounts = cfg.channels?.discord?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return [];
  }
  return Object.keys(accounts).filter(Boolean);
}
function listDiscordAccountIds(cfg) {
  const ids = listConfiguredAccountIds(cfg);
  if (ids.length === 0) {
    return [_sessionKey.DEFAULT_ACCOUNT_ID];
  }
  return ids.toSorted((a, b) => a.localeCompare(b));
}
function resolveDefaultDiscordAccountId(cfg) {
  const ids = listDiscordAccountIds(cfg);
  if (ids.includes(_sessionKey.DEFAULT_ACCOUNT_ID)) {
    return _sessionKey.DEFAULT_ACCOUNT_ID;
  }
  return ids[0] ?? _sessionKey.DEFAULT_ACCOUNT_ID;
}
function resolveAccountConfig(cfg, accountId) {
  const accounts = cfg.channels?.discord?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return undefined;
  }
  return accounts[accountId];
}
function mergeDiscordAccountConfig(cfg, accountId) {
  const { accounts: _ignored, ...base } = cfg.channels?.discord ?? {};
  const account = resolveAccountConfig(cfg, accountId) ?? {};
  return { ...base, ...account };
}
function resolveDiscordAccount(params) {
  const accountId = (0, _sessionKey.normalizeAccountId)(params.accountId);
  const baseEnabled = params.cfg.channels?.discord?.enabled !== false;
  const merged = mergeDiscordAccountConfig(params.cfg, accountId);
  const accountEnabled = merged.enabled !== false;
  const enabled = baseEnabled && accountEnabled;
  const tokenResolution = (0, _token.resolveDiscordToken)(params.cfg, { accountId });
  return {
    accountId,
    enabled,
    name: merged.name?.trim() || undefined,
    token: tokenResolution.token,
    tokenSource: tokenResolution.source,
    config: merged
  };
}
function listEnabledDiscordAccounts(cfg) {
  return listDiscordAccountIds(cfg).
  map((accountId) => resolveDiscordAccount({ cfg, accountId })).
  filter((account) => account.enabled);
} /* v9-103933f859c6443c */
