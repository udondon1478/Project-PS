"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.deleteAccountFromConfigSection = deleteAccountFromConfigSection;exports.setAccountEnabledInConfigSection = setAccountEnabledInConfigSection;var _sessionKey = require("../../routing/session-key.js");
function setAccountEnabledInConfigSection(params) {
  const accountKey = params.accountId || _sessionKey.DEFAULT_ACCOUNT_ID;
  const channels = params.cfg.channels;
  const base = channels?.[params.sectionKey];
  const hasAccounts = Boolean(base?.accounts);
  if (params.allowTopLevel && accountKey === _sessionKey.DEFAULT_ACCOUNT_ID && !hasAccounts) {
    return {
      ...params.cfg,
      channels: {
        ...params.cfg.channels,
        [params.sectionKey]: {
          ...base,
          enabled: params.enabled
        }
      }
    };
  }
  const baseAccounts = base?.accounts ?? {};
  const existing = baseAccounts[accountKey] ?? {};
  return {
    ...params.cfg,
    channels: {
      ...params.cfg.channels,
      [params.sectionKey]: {
        ...base,
        accounts: {
          ...baseAccounts,
          [accountKey]: {
            ...existing,
            enabled: params.enabled
          }
        }
      }
    }
  };
}
function deleteAccountFromConfigSection(params) {
  const accountKey = params.accountId || _sessionKey.DEFAULT_ACCOUNT_ID;
  const channels = params.cfg.channels;
  const base = channels?.[params.sectionKey];
  if (!base) {
    return params.cfg;
  }
  const baseAccounts = base.accounts && typeof base.accounts === "object" ? { ...base.accounts } : undefined;
  if (accountKey !== _sessionKey.DEFAULT_ACCOUNT_ID) {
    const accounts = baseAccounts ? { ...baseAccounts } : {};
    delete accounts[accountKey];
    return {
      ...params.cfg,
      channels: {
        ...params.cfg.channels,
        [params.sectionKey]: {
          ...base,
          accounts: Object.keys(accounts).length ? accounts : undefined
        }
      }
    };
  }
  if (baseAccounts && Object.keys(baseAccounts).length > 0) {
    delete baseAccounts[accountKey];
    const baseRecord = { ...base };
    for (const field of params.clearBaseFields ?? []) {
      if (field in baseRecord) {
        baseRecord[field] = undefined;
      }
    }
    return {
      ...params.cfg,
      channels: {
        ...params.cfg.channels,
        [params.sectionKey]: {
          ...baseRecord,
          accounts: Object.keys(baseAccounts).length ? baseAccounts : undefined
        }
      }
    };
  }
  const nextChannels = { ...params.cfg.channels };
  delete nextChannels[params.sectionKey];
  const nextCfg = { ...params.cfg };
  if (Object.keys(nextChannels).length > 0) {
    nextCfg.channels = nextChannels;
  } else
  {
    delete nextCfg.channels;
  }
  return nextCfg;
} /* v9-b07bf565fcd627ad */
