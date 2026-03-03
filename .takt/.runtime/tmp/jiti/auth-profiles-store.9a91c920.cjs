"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ensureAuthProfileStore = ensureAuthProfileStore;exports.loadAuthProfileStore = loadAuthProfileStore;exports.saveAuthProfileStore = saveAuthProfileStore;exports.updateAuthProfileStoreWithLock = updateAuthProfileStoreWithLock;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _properLockfile = _interopRequireDefault(require("proper-lockfile"));
var _paths = require("../../config/paths.js");
var _jsonFile = require("../../infra/json-file.js");
var _constants = require("./constants.js");
var _externalCliSync = require("./external-cli-sync.js");
var _paths2 = require("./paths.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function _syncAuthProfileStore(target, source) {
  target.version = source.version;
  target.profiles = source.profiles;
  target.order = source.order;
  target.lastGood = source.lastGood;
  target.usageStats = source.usageStats;
}
async function updateAuthProfileStoreWithLock(params) {
  const authPath = (0, _paths2.resolveAuthStorePath)(params.agentDir);
  (0, _paths2.ensureAuthStoreFile)(authPath);
  let release;
  try {
    release = await _properLockfile.default.lock(authPath, _constants.AUTH_STORE_LOCK_OPTIONS);
    const store = ensureAuthProfileStore(params.agentDir);
    const shouldSave = params.updater(store);
    if (shouldSave) {
      saveAuthProfileStore(store, params.agentDir);
    }
    return store;
  }
  catch {
    return null;
  } finally
  {
    if (release) {
      try {
        await release();
      }
      catch {

        // ignore unlock errors
      }}
  }
}
function coerceLegacyStore(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw;
  if ("profiles" in record) {
    return null;
  }
  const entries = {};
  for (const [key, value] of Object.entries(record)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const typed = value;
    if (typed.type !== "api_key" && typed.type !== "oauth" && typed.type !== "token") {
      continue;
    }
    entries[key] = {
      ...typed,
      provider: String(typed.provider ?? key)
    };
  }
  return Object.keys(entries).length > 0 ? entries : null;
}
function coerceAuthStore(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw;
  if (!record.profiles || typeof record.profiles !== "object") {
    return null;
  }
  const profiles = record.profiles;
  const normalized = {};
  for (const [key, value] of Object.entries(profiles)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const typed = value;
    if (typed.type !== "api_key" && typed.type !== "oauth" && typed.type !== "token") {
      continue;
    }
    if (!typed.provider) {
      continue;
    }
    normalized[key] = typed;
  }
  const order = record.order && typeof record.order === "object" ?
  Object.entries(record.order).reduce((acc, [provider, value]) => {
    if (!Array.isArray(value)) {
      return acc;
    }
    const list = value.
    map((entry) => typeof entry === "string" ? entry.trim() : "").
    filter(Boolean);
    if (list.length === 0) {
      return acc;
    }
    acc[provider] = list;
    return acc;
  }, {}) :
  undefined;
  return {
    version: Number(record.version ?? _constants.AUTH_STORE_VERSION),
    profiles: normalized,
    order,
    lastGood: record.lastGood && typeof record.lastGood === "object" ?
    record.lastGood :
    undefined,
    usageStats: record.usageStats && typeof record.usageStats === "object" ?
    record.usageStats :
    undefined
  };
}
function mergeRecord(base, override) {
  if (!base && !override) {
    return undefined;
  }
  if (!base) {
    return { ...override };
  }
  if (!override) {
    return { ...base };
  }
  return { ...base, ...override };
}
function mergeAuthProfileStores(base, override) {
  if (Object.keys(override.profiles).length === 0 &&
  !override.order &&
  !override.lastGood &&
  !override.usageStats) {
    return base;
  }
  return {
    version: Math.max(base.version, override.version ?? base.version),
    profiles: { ...base.profiles, ...override.profiles },
    order: mergeRecord(base.order, override.order),
    lastGood: mergeRecord(base.lastGood, override.lastGood),
    usageStats: mergeRecord(base.usageStats, override.usageStats)
  };
}
function mergeOAuthFileIntoStore(store) {
  const oauthPath = (0, _paths.resolveOAuthPath)();
  const oauthRaw = (0, _jsonFile.loadJsonFile)(oauthPath);
  if (!oauthRaw || typeof oauthRaw !== "object") {
    return false;
  }
  const oauthEntries = oauthRaw;
  let mutated = false;
  for (const [provider, creds] of Object.entries(oauthEntries)) {
    if (!creds || typeof creds !== "object") {
      continue;
    }
    const profileId = `${provider}:default`;
    if (store.profiles[profileId]) {
      continue;
    }
    store.profiles[profileId] = {
      type: "oauth",
      provider,
      ...creds
    };
    mutated = true;
  }
  return mutated;
}
function loadAuthProfileStore() {
  const authPath = (0, _paths2.resolveAuthStorePath)();
  const raw = (0, _jsonFile.loadJsonFile)(authPath);
  const asStore = coerceAuthStore(raw);
  if (asStore) {
    // Sync from external CLI tools on every load
    const synced = (0, _externalCliSync.syncExternalCliCredentials)(asStore);
    if (synced) {
      (0, _jsonFile.saveJsonFile)(authPath, asStore);
    }
    return asStore;
  }
  const legacyRaw = (0, _jsonFile.loadJsonFile)((0, _paths2.resolveLegacyAuthStorePath)());
  const legacy = coerceLegacyStore(legacyRaw);
  if (legacy) {
    const store = {
      version: _constants.AUTH_STORE_VERSION,
      profiles: {}
    };
    for (const [provider, cred] of Object.entries(legacy)) {
      const profileId = `${provider}:default`;
      if (cred.type === "api_key") {
        store.profiles[profileId] = {
          type: "api_key",
          provider: String(cred.provider ?? provider),
          key: cred.key,
          ...(cred.email ? { email: cred.email } : {})
        };
      } else
      if (cred.type === "token") {
        store.profiles[profileId] = {
          type: "token",
          provider: String(cred.provider ?? provider),
          token: cred.token,
          ...(typeof cred.expires === "number" ? { expires: cred.expires } : {}),
          ...(cred.email ? { email: cred.email } : {})
        };
      } else
      {
        store.profiles[profileId] = {
          type: "oauth",
          provider: String(cred.provider ?? provider),
          access: cred.access,
          refresh: cred.refresh,
          expires: cred.expires,
          ...(cred.enterpriseUrl ? { enterpriseUrl: cred.enterpriseUrl } : {}),
          ...(cred.projectId ? { projectId: cred.projectId } : {}),
          ...(cred.accountId ? { accountId: cred.accountId } : {}),
          ...(cred.email ? { email: cred.email } : {})
        };
      }
    }
    (0, _externalCliSync.syncExternalCliCredentials)(store);
    return store;
  }
  const store = { version: _constants.AUTH_STORE_VERSION, profiles: {} };
  (0, _externalCliSync.syncExternalCliCredentials)(store);
  return store;
}
function loadAuthProfileStoreForAgent(agentDir, _options) {
  const authPath = (0, _paths2.resolveAuthStorePath)(agentDir);
  const raw = (0, _jsonFile.loadJsonFile)(authPath);
  const asStore = coerceAuthStore(raw);
  if (asStore) {
    // Sync from external CLI tools on every load
    const synced = (0, _externalCliSync.syncExternalCliCredentials)(asStore);
    if (synced) {
      (0, _jsonFile.saveJsonFile)(authPath, asStore);
    }
    return asStore;
  }
  // Fallback: inherit auth-profiles from main agent if subagent has none
  if (agentDir) {
    const mainAuthPath = (0, _paths2.resolveAuthStorePath)(); // without agentDir = main
    const mainRaw = (0, _jsonFile.loadJsonFile)(mainAuthPath);
    const mainStore = coerceAuthStore(mainRaw);
    if (mainStore && Object.keys(mainStore.profiles).length > 0) {
      // Clone main store to subagent directory for auth inheritance
      (0, _jsonFile.saveJsonFile)(authPath, mainStore);
      _constants.log.info("inherited auth-profiles from main agent", { agentDir });
      return mainStore;
    }
  }
  const legacyRaw = (0, _jsonFile.loadJsonFile)((0, _paths2.resolveLegacyAuthStorePath)(agentDir));
  const legacy = coerceLegacyStore(legacyRaw);
  const store = {
    version: _constants.AUTH_STORE_VERSION,
    profiles: {}
  };
  if (legacy) {
    for (const [provider, cred] of Object.entries(legacy)) {
      const profileId = `${provider}:default`;
      if (cred.type === "api_key") {
        store.profiles[profileId] = {
          type: "api_key",
          provider: String(cred.provider ?? provider),
          key: cred.key,
          ...(cred.email ? { email: cred.email } : {})
        };
      } else
      if (cred.type === "token") {
        store.profiles[profileId] = {
          type: "token",
          provider: String(cred.provider ?? provider),
          token: cred.token,
          ...(typeof cred.expires === "number" ? { expires: cred.expires } : {}),
          ...(cred.email ? { email: cred.email } : {})
        };
      } else
      {
        store.profiles[profileId] = {
          type: "oauth",
          provider: String(cred.provider ?? provider),
          access: cred.access,
          refresh: cred.refresh,
          expires: cred.expires,
          ...(cred.enterpriseUrl ? { enterpriseUrl: cred.enterpriseUrl } : {}),
          ...(cred.projectId ? { projectId: cred.projectId } : {}),
          ...(cred.accountId ? { accountId: cred.accountId } : {}),
          ...(cred.email ? { email: cred.email } : {})
        };
      }
    }
  }
  const mergedOAuth = mergeOAuthFileIntoStore(store);
  const syncedCli = (0, _externalCliSync.syncExternalCliCredentials)(store);
  const shouldWrite = legacy !== null || mergedOAuth || syncedCli;
  if (shouldWrite) {
    (0, _jsonFile.saveJsonFile)(authPath, store);
  }
  // PR #368: legacy auth.json could get re-migrated from other agent dirs,
  // overwriting fresh OAuth creds with stale tokens (fixes #363). Delete only
  // after we've successfully written auth-profiles.json.
  if (shouldWrite && legacy !== null) {
    const legacyPath = (0, _paths2.resolveLegacyAuthStorePath)(agentDir);
    try {
      _nodeFs.default.unlinkSync(legacyPath);
    }
    catch (err) {
      if (err?.code !== "ENOENT") {
        _constants.log.warn("failed to delete legacy auth.json after migration", {
          err,
          legacyPath
        });
      }
    }
  }
  return store;
}
function ensureAuthProfileStore(agentDir, options) {
  const store = loadAuthProfileStoreForAgent(agentDir, options);
  const authPath = (0, _paths2.resolveAuthStorePath)(agentDir);
  const mainAuthPath = (0, _paths2.resolveAuthStorePath)();
  if (!agentDir || authPath === mainAuthPath) {
    return store;
  }
  const mainStore = loadAuthProfileStoreForAgent(undefined, options);
  const merged = mergeAuthProfileStores(mainStore, store);
  return merged;
}
function saveAuthProfileStore(store, agentDir) {
  const authPath = (0, _paths2.resolveAuthStorePath)(agentDir);
  const payload = {
    version: _constants.AUTH_STORE_VERSION,
    profiles: store.profiles,
    order: store.order ?? undefined,
    lastGood: store.lastGood ?? undefined,
    usageStats: store.usageStats ?? undefined
  };
  (0, _jsonFile.saveJsonFile)(authPath, payload);
} /* v9-8b08bd3bfa42045d */
