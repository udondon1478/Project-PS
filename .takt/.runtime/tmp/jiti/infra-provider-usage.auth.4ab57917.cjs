"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveProviderAuths = resolveProviderAuths;var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _authProfiles = require("../agents/auth-profiles.js");
var _modelAuth = require("../agents/model-auth.js");
var _modelSelection = require("../agents/model-selection.js");
var _config = require("../config/config.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function parseGoogleToken(apiKey) {
  if (!apiKey) {
    return null;
  }
  try {
    const parsed = JSON.parse(apiKey);
    if (parsed && typeof parsed.token === "string") {
      return { token: parsed.token };
    }
  }
  catch {

    // ignore
  }return null;
}
function resolveZaiApiKey() {
  const envDirect = process.env.ZAI_API_KEY?.trim() || process.env.Z_AI_API_KEY?.trim();
  if (envDirect) {
    return envDirect;
  }
  const envResolved = (0, _modelAuth.resolveEnvApiKey)("zai");
  if (envResolved?.apiKey) {
    return envResolved.apiKey;
  }
  const cfg = (0, _config.loadConfig)();
  const key = (0, _modelAuth.getCustomProviderApiKey)(cfg, "zai") || (0, _modelAuth.getCustomProviderApiKey)(cfg, "z-ai");
  if (key) {
    return key;
  }
  const store = (0, _authProfiles.ensureAuthProfileStore)();
  const apiProfile = [
  ...(0, _authProfiles.listProfilesForProvider)(store, "zai"),
  ...(0, _authProfiles.listProfilesForProvider)(store, "z-ai")].
  find((id) => store.profiles[id]?.type === "api_key");
  if (apiProfile) {
    const cred = store.profiles[apiProfile];
    if (cred?.type === "api_key" && cred.key?.trim()) {
      return cred.key.trim();
    }
  }
  try {
    const authPath = _nodePath.default.join(_nodeOs.default.homedir(), ".pi", "agent", "auth.json");
    if (!_nodeFs.default.existsSync(authPath)) {
      return undefined;
    }
    const data = JSON.parse(_nodeFs.default.readFileSync(authPath, "utf-8"));
    return data["z-ai"]?.access || data.zai?.access;
  }
  catch {
    return undefined;
  }
}
function resolveMinimaxApiKey() {
  const envDirect = process.env.MINIMAX_CODE_PLAN_KEY?.trim() || process.env.MINIMAX_API_KEY?.trim();
  if (envDirect) {
    return envDirect;
  }
  const envResolved = (0, _modelAuth.resolveEnvApiKey)("minimax");
  if (envResolved?.apiKey) {
    return envResolved.apiKey;
  }
  const cfg = (0, _config.loadConfig)();
  const key = (0, _modelAuth.getCustomProviderApiKey)(cfg, "minimax");
  if (key) {
    return key;
  }
  const store = (0, _authProfiles.ensureAuthProfileStore)();
  const apiProfile = (0, _authProfiles.listProfilesForProvider)(store, "minimax").find((id) => {
    const cred = store.profiles[id];
    return cred?.type === "api_key" || cred?.type === "token";
  });
  if (!apiProfile) {
    return undefined;
  }
  const cred = store.profiles[apiProfile];
  if (cred?.type === "api_key" && cred.key?.trim()) {
    return cred.key.trim();
  }
  if (cred?.type === "token" && cred.token?.trim()) {
    return cred.token.trim();
  }
  return undefined;
}
function resolveXiaomiApiKey() {
  const envDirect = process.env.XIAOMI_API_KEY?.trim();
  if (envDirect) {
    return envDirect;
  }
  const envResolved = (0, _modelAuth.resolveEnvApiKey)("xiaomi");
  if (envResolved?.apiKey) {
    return envResolved.apiKey;
  }
  const cfg = (0, _config.loadConfig)();
  const key = (0, _modelAuth.getCustomProviderApiKey)(cfg, "xiaomi");
  if (key) {
    return key;
  }
  const store = (0, _authProfiles.ensureAuthProfileStore)();
  const apiProfile = (0, _authProfiles.listProfilesForProvider)(store, "xiaomi").find((id) => {
    const cred = store.profiles[id];
    return cred?.type === "api_key" || cred?.type === "token";
  });
  if (!apiProfile) {
    return undefined;
  }
  const cred = store.profiles[apiProfile];
  if (cred?.type === "api_key" && cred.key?.trim()) {
    return cred.key.trim();
  }
  if (cred?.type === "token" && cred.token?.trim()) {
    return cred.token.trim();
  }
  return undefined;
}
async function resolveOAuthToken(params) {
  const cfg = (0, _config.loadConfig)();
  const store = (0, _authProfiles.ensureAuthProfileStore)(params.agentDir, {
    allowKeychainPrompt: false
  });
  const order = (0, _authProfiles.resolveAuthProfileOrder)({
    cfg,
    store,
    provider: params.provider
  });
  const candidates = order;
  const deduped = [];
  for (const entry of candidates) {
    if (!deduped.includes(entry)) {
      deduped.push(entry);
    }
  }
  for (const profileId of deduped) {
    const cred = store.profiles[profileId];
    if (!cred || cred.type !== "oauth" && cred.type !== "token") {
      continue;
    }
    try {
      const resolved = await (0, _authProfiles.resolveApiKeyForProfile)({
        // Usage snapshots should work even if config profile metadata is stale.
        // (e.g. config says api_key but the store has a token profile.)
        cfg: undefined,
        store,
        profileId,
        agentDir: params.agentDir
      });
      if (!resolved?.apiKey) {
        continue;
      }
      let token = resolved.apiKey;
      if (params.provider === "google-gemini-cli" || params.provider === "google-antigravity") {
        const parsed = parseGoogleToken(resolved.apiKey);
        token = parsed?.token ?? resolved.apiKey;
      }
      return {
        provider: params.provider,
        token,
        accountId: cred.type === "oauth" && "accountId" in cred ?
        cred.accountId :
        undefined
      };
    }
    catch {

      // ignore
    }}
  return null;
}
function resolveOAuthProviders(agentDir) {
  const store = (0, _authProfiles.ensureAuthProfileStore)(agentDir, {
    allowKeychainPrompt: false
  });
  const cfg = (0, _config.loadConfig)();
  const providers = [
  "anthropic",
  "github-copilot",
  "google-gemini-cli",
  "google-antigravity",
  "openai-codex"];

  const isOAuthLikeCredential = (id) => {
    const cred = store.profiles[id];
    return cred?.type === "oauth" || cred?.type === "token";
  };
  return providers.filter((provider) => {
    const profiles = (0, _authProfiles.listProfilesForProvider)(store, provider).filter(isOAuthLikeCredential);
    if (profiles.length > 0) {
      return true;
    }
    const normalized = (0, _modelSelection.normalizeProviderId)(provider);
    const configuredProfiles = Object.entries(cfg.auth?.profiles ?? {}).
    filter(([, profile]) => (0, _modelSelection.normalizeProviderId)(profile.provider) === normalized).
    map(([id]) => id).
    filter(isOAuthLikeCredential);
    return configuredProfiles.length > 0;
  });
}
async function resolveProviderAuths(params) {
  if (params.auth) {
    return params.auth;
  }
  const oauthProviders = resolveOAuthProviders(params.agentDir);
  const auths = [];
  for (const provider of params.providers) {
    if (provider === "zai") {
      const apiKey = resolveZaiApiKey();
      if (apiKey) {
        auths.push({ provider, token: apiKey });
      }
      continue;
    }
    if (provider === "minimax") {
      const apiKey = resolveMinimaxApiKey();
      if (apiKey) {
        auths.push({ provider, token: apiKey });
      }
      continue;
    }
    if (provider === "xiaomi") {
      const apiKey = resolveXiaomiApiKey();
      if (apiKey) {
        auths.push({ provider, token: apiKey });
      }
      continue;
    }
    if (!oauthProviders.includes(provider)) {
      continue;
    }
    const auth = await resolveOAuthToken({
      provider,
      agentDir: params.agentDir
    });
    if (auth) {
      auths.push(auth);
    }
  }
  return auths;
} /* v9-3c6f684125a7b52e */
