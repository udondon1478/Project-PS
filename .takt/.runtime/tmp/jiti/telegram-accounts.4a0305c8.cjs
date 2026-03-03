"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.listEnabledTelegramAccounts = listEnabledTelegramAccounts;exports.listTelegramAccountIds = listTelegramAccountIds;exports.resolveDefaultTelegramAccountId = resolveDefaultTelegramAccountId;exports.resolveTelegramAccount = resolveTelegramAccount;var _env = require("../infra/env.js");
var _bindings = require("../routing/bindings.js");
var _sessionKey = require("../routing/session-key.js");
var _token = require("./token.js");
const debugAccounts = (...args) => {
  if ((0, _env.isTruthyEnvValue)(process.env.OPENCLAW_DEBUG_TELEGRAM_ACCOUNTS)) {
    console.warn("[telegram:accounts]", ...args);
  }
};
function listConfiguredAccountIds(cfg) {
  const accounts = cfg.channels?.telegram?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return [];
  }
  const ids = new Set();
  for (const key of Object.keys(accounts)) {
    if (!key) {
      continue;
    }
    ids.add((0, _sessionKey.normalizeAccountId)(key));
  }
  return [...ids];
}
function listTelegramAccountIds(cfg) {
  const ids = Array.from(new Set([...listConfiguredAccountIds(cfg), ...(0, _bindings.listBoundAccountIds)(cfg, "telegram")]));
  debugAccounts("listTelegramAccountIds", ids);
  if (ids.length === 0) {
    return [_sessionKey.DEFAULT_ACCOUNT_ID];
  }
  return ids.toSorted((a, b) => a.localeCompare(b));
}
function resolveDefaultTelegramAccountId(cfg) {
  const boundDefault = (0, _bindings.resolveDefaultAgentBoundAccountId)(cfg, "telegram");
  if (boundDefault) {
    return boundDefault;
  }
  const ids = listTelegramAccountIds(cfg);
  if (ids.includes(_sessionKey.DEFAULT_ACCOUNT_ID)) {
    return _sessionKey.DEFAULT_ACCOUNT_ID;
  }
  return ids[0] ?? _sessionKey.DEFAULT_ACCOUNT_ID;
}
function resolveAccountConfig(cfg, accountId) {
  const accounts = cfg.channels?.telegram?.accounts;
  if (!accounts || typeof accounts !== "object") {
    return undefined;
  }
  const direct = accounts[accountId];
  if (direct) {
    return direct;
  }
  const normalized = (0, _sessionKey.normalizeAccountId)(accountId);
  const matchKey = Object.keys(accounts).find((key) => (0, _sessionKey.normalizeAccountId)(key) === normalized);
  return matchKey ? accounts[matchKey] : undefined;
}
function mergeTelegramAccountConfig(cfg, accountId) {
  const { accounts: _ignored, ...base } = cfg.channels?.telegram ??
  {};
  const account = resolveAccountConfig(cfg, accountId) ?? {};
  return { ...base, ...account };
}
function resolveTelegramAccount(params) {
  const hasExplicitAccountId = Boolean(params.accountId?.trim());
  const baseEnabled = params.cfg.channels?.telegram?.enabled !== false;
  const resolve = (accountId) => {
    const merged = mergeTelegramAccountConfig(params.cfg, accountId);
    const accountEnabled = merged.enabled !== false;
    const enabled = baseEnabled && accountEnabled;
    const tokenResolution = (0, _token.resolveTelegramToken)(params.cfg, { accountId });
    debugAccounts("resolve", {
      accountId,
      enabled,
      tokenSource: tokenResolution.source
    });
    return {
      accountId,
      enabled,
      name: merged.name?.trim() || undefined,
      token: tokenResolution.token,
      tokenSource: tokenResolution.source,
      config: merged
    };
  };
  const normalized = (0, _sessionKey.normalizeAccountId)(params.accountId);
  const primary = resolve(normalized);
  if (hasExplicitAccountId) {
    return primary;
  }
  if (primary.tokenSource !== "none") {
    return primary;
  }
  // If accountId is omitted, prefer a configured account token over failing on
  // the implicit "default" account. This keeps env-based setups working while
  // making config-only tokens work for things like heartbeats.
  const fallbackId = resolveDefaultTelegramAccountId(params.cfg);
  if (fallbackId === primary.accountId) {
    return primary;
  }
  const fallback = resolve(fallbackId);
  if (fallback.tokenSource === "none") {
    return primary;
  }
  return fallback;
}
function listEnabledTelegramAccounts(cfg) {
  return listTelegramAccountIds(cfg).
  map((accountId) => resolveTelegramAccount({ cfg, accountId })).
  filter((account) => account.enabled);
} /* v9-921e4807734bb4fd */
