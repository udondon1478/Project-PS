"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applyAccountNameToChannelSection = applyAccountNameToChannelSection;exports.migrateBaseNameToDefaultAccount = migrateBaseNameToDefaultAccount;var _sessionKey = require("../../routing/session-key.js");
function channelHasAccounts(cfg, channelKey) {
  const channels = cfg.channels;
  const base = channels?.[channelKey];
  return Boolean(base?.accounts && Object.keys(base.accounts).length > 0);
}
function shouldStoreNameInAccounts(params) {
  if (params.alwaysUseAccounts) {
    return true;
  }
  if (params.accountId !== _sessionKey.DEFAULT_ACCOUNT_ID) {
    return true;
  }
  return channelHasAccounts(params.cfg, params.channelKey);
}
function applyAccountNameToChannelSection(params) {
  const trimmed = params.name?.trim();
  if (!trimmed) {
    return params.cfg;
  }
  const accountId = (0, _sessionKey.normalizeAccountId)(params.accountId);
  const channels = params.cfg.channels;
  const baseConfig = channels?.[params.channelKey];
  const base = typeof baseConfig === "object" && baseConfig ? baseConfig : undefined;
  const useAccounts = shouldStoreNameInAccounts({
    cfg: params.cfg,
    channelKey: params.channelKey,
    accountId,
    alwaysUseAccounts: params.alwaysUseAccounts
  });
  if (!useAccounts && accountId === _sessionKey.DEFAULT_ACCOUNT_ID) {
    const safeBase = base ?? {};
    return {
      ...params.cfg,
      channels: {
        ...params.cfg.channels,
        [params.channelKey]: {
          ...safeBase,
          name: trimmed
        }
      }
    };
  }
  const baseAccounts = base?.accounts ?? {};
  const existingAccount = baseAccounts[accountId] ?? {};
  const baseWithoutName = accountId === _sessionKey.DEFAULT_ACCOUNT_ID ?
  (({ name: _ignored, ...rest }) => rest)(base ?? {}) :
  base ?? {};
  return {
    ...params.cfg,
    channels: {
      ...params.cfg.channels,
      [params.channelKey]: {
        ...baseWithoutName,
        accounts: {
          ...baseAccounts,
          [accountId]: {
            ...existingAccount,
            name: trimmed
          }
        }
      }
    }
  };
}
function migrateBaseNameToDefaultAccount(params) {
  if (params.alwaysUseAccounts) {
    return params.cfg;
  }
  const channels = params.cfg.channels;
  const base = channels?.[params.channelKey];
  const baseName = base?.name?.trim();
  if (!baseName) {
    return params.cfg;
  }
  const accounts = {
    ...base?.accounts
  };
  const defaultAccount = accounts[_sessionKey.DEFAULT_ACCOUNT_ID] ?? {};
  if (!defaultAccount.name) {
    accounts[_sessionKey.DEFAULT_ACCOUNT_ID] = { ...defaultAccount, name: baseName };
  }
  const { name: _ignored, ...rest } = base ?? {};
  return {
    ...params.cfg,
    channels: {
      ...params.cfg.channels,
      [params.channelKey]: {
        ...rest,
        accounts
      }
    }
  };
} /* v9-9118cd9e985203b3 */
