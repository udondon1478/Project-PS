"use strict";Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, "ensureAuthProfileStore", { enumerable: true, get: function () {return _authProfiles.ensureAuthProfileStore;} });exports.getApiKeyForModel = getApiKeyForModel;exports.getCustomProviderApiKey = getCustomProviderApiKey;exports.requireApiKey = requireApiKey;exports.resolveApiKeyForProvider = resolveApiKeyForProvider;Object.defineProperty(exports, "resolveAuthProfileOrder", { enumerable: true, get: function () {return _authProfiles.resolveAuthProfileOrder;} });exports.resolveAwsSdkEnvVarName = resolveAwsSdkEnvVarName;exports.resolveEnvApiKey = resolveEnvApiKey;exports.resolveModelAuthMode = resolveModelAuthMode;var _piAi = require("@mariozechner/pi-ai");
var _nodePath = _interopRequireDefault(require("node:path"));
var _commandFormat = require("../cli/command-format.js");
var _shellEnv = require("../infra/shell-env.js");
var _authProfiles = require("./auth-profiles.js");
var _modelSelection = require("./model-selection.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}

const AWS_BEARER_ENV = "AWS_BEARER_TOKEN_BEDROCK";
const AWS_ACCESS_KEY_ENV = "AWS_ACCESS_KEY_ID";
const AWS_SECRET_KEY_ENV = "AWS_SECRET_ACCESS_KEY";
const AWS_PROFILE_ENV = "AWS_PROFILE";
function resolveProviderConfig(cfg, provider) {
  const providers = cfg?.models?.providers ?? {};
  const direct = providers[provider];
  if (direct) {
    return direct;
  }
  const normalized = (0, _modelSelection.normalizeProviderId)(provider);
  if (normalized === provider) {
    const matched = Object.entries(providers).find(([key]) => (0, _modelSelection.normalizeProviderId)(key) === normalized);
    return matched?.[1];
  }
  return providers[normalized] ??
  Object.entries(providers).find(([key]) => (0, _modelSelection.normalizeProviderId)(key) === normalized)?.[1];
}
function getCustomProviderApiKey(cfg, provider) {
  const entry = resolveProviderConfig(cfg, provider);
  const key = entry?.apiKey?.trim();
  return key || undefined;
}
function resolveProviderAuthOverride(cfg, provider) {
  const entry = resolveProviderConfig(cfg, provider);
  const auth = entry?.auth;
  if (auth === "api-key" || auth === "aws-sdk" || auth === "oauth" || auth === "token") {
    return auth;
  }
  return undefined;
}
function resolveEnvSourceLabel(params) {
  const shellApplied = params.envVars.some((envVar) => params.applied.has(envVar));
  const prefix = shellApplied ? "shell env: " : "env: ";
  return `${prefix}${params.label}`;
}
function resolveAwsSdkEnvVarName(env = process.env) {
  if (env[AWS_BEARER_ENV]?.trim()) {
    return AWS_BEARER_ENV;
  }
  if (env[AWS_ACCESS_KEY_ENV]?.trim() && env[AWS_SECRET_KEY_ENV]?.trim()) {
    return AWS_ACCESS_KEY_ENV;
  }
  if (env[AWS_PROFILE_ENV]?.trim()) {
    return AWS_PROFILE_ENV;
  }
  return undefined;
}
function resolveAwsSdkAuthInfo() {
  const applied = new Set((0, _shellEnv.getShellEnvAppliedKeys)());
  if (process.env[AWS_BEARER_ENV]?.trim()) {
    return {
      mode: "aws-sdk",
      source: resolveEnvSourceLabel({
        applied,
        envVars: [AWS_BEARER_ENV],
        label: AWS_BEARER_ENV
      })
    };
  }
  if (process.env[AWS_ACCESS_KEY_ENV]?.trim() && process.env[AWS_SECRET_KEY_ENV]?.trim()) {
    return {
      mode: "aws-sdk",
      source: resolveEnvSourceLabel({
        applied,
        envVars: [AWS_ACCESS_KEY_ENV, AWS_SECRET_KEY_ENV],
        label: `${AWS_ACCESS_KEY_ENV} + ${AWS_SECRET_KEY_ENV}`
      })
    };
  }
  if (process.env[AWS_PROFILE_ENV]?.trim()) {
    return {
      mode: "aws-sdk",
      source: resolveEnvSourceLabel({
        applied,
        envVars: [AWS_PROFILE_ENV],
        label: AWS_PROFILE_ENV
      })
    };
  }
  return { mode: "aws-sdk", source: "aws-sdk default chain" };
}
async function resolveApiKeyForProvider(params) {
  const { provider, cfg, profileId, preferredProfile } = params;
  const store = params.store ?? (0, _authProfiles.ensureAuthProfileStore)(params.agentDir);
  if (profileId) {
    const resolved = await (0, _authProfiles.resolveApiKeyForProfile)({
      cfg,
      store,
      profileId,
      agentDir: params.agentDir
    });
    if (!resolved) {
      throw new Error(`No credentials found for profile "${profileId}".`);
    }
    const mode = store.profiles[profileId]?.type;
    return {
      apiKey: resolved.apiKey,
      profileId,
      source: `profile:${profileId}`,
      mode: mode === "oauth" ? "oauth" : mode === "token" ? "token" : "api-key"
    };
  }
  const authOverride = resolveProviderAuthOverride(cfg, provider);
  if (authOverride === "aws-sdk") {
    return resolveAwsSdkAuthInfo();
  }
  const order = (0, _authProfiles.resolveAuthProfileOrder)({
    cfg,
    store,
    provider,
    preferredProfile
  });
  for (const candidate of order) {
    try {
      const resolved = await (0, _authProfiles.resolveApiKeyForProfile)({
        cfg,
        store,
        profileId: candidate,
        agentDir: params.agentDir
      });
      if (resolved) {
        const mode = store.profiles[candidate]?.type;
        return {
          apiKey: resolved.apiKey,
          profileId: candidate,
          source: `profile:${candidate}`,
          mode: mode === "oauth" ? "oauth" : mode === "token" ? "token" : "api-key"
        };
      }
    }
    catch {}
  }
  const envResolved = resolveEnvApiKey(provider);
  if (envResolved) {
    return {
      apiKey: envResolved.apiKey,
      source: envResolved.source,
      mode: envResolved.source.includes("OAUTH_TOKEN") ? "oauth" : "api-key"
    };
  }
  const customKey = getCustomProviderApiKey(cfg, provider);
  if (customKey) {
    return { apiKey: customKey, source: "models.json", mode: "api-key" };
  }
  const normalized = (0, _modelSelection.normalizeProviderId)(provider);
  if (authOverride === undefined && normalized === "amazon-bedrock") {
    return resolveAwsSdkAuthInfo();
  }
  if (provider === "openai") {
    const hasCodex = (0, _authProfiles.listProfilesForProvider)(store, "openai-codex").length > 0;
    if (hasCodex) {
      throw new Error('No API key found for provider "openai". You are authenticated with OpenAI Codex OAuth. Use openai-codex/gpt-5.2 (ChatGPT OAuth) or set OPENAI_API_KEY for openai/gpt-5.2.');
    }
  }
  const authStorePath = (0, _authProfiles.resolveAuthStorePathForDisplay)(params.agentDir);
  const resolvedAgentDir = _nodePath.default.dirname(authStorePath);
  throw new Error([
  `No API key found for provider "${provider}".`,
  `Auth store: ${authStorePath} (agentDir: ${resolvedAgentDir}).`,
  `Configure auth for this agent (${(0, _commandFormat.formatCliCommand)("openclaw agents add <id>")}) or copy auth-profiles.json from the main agentDir.`].
  join(" "));
}
function resolveEnvApiKey(provider) {
  const normalized = (0, _modelSelection.normalizeProviderId)(provider);
  const applied = new Set((0, _shellEnv.getShellEnvAppliedKeys)());
  const pick = (envVar) => {
    const value = process.env[envVar]?.trim();
    if (!value) {
      return null;
    }
    const source = applied.has(envVar) ? `shell env: ${envVar}` : `env: ${envVar}`;
    return { apiKey: value, source };
  };
  if (normalized === "github-copilot") {
    return pick("COPILOT_GITHUB_TOKEN") ?? pick("GH_TOKEN") ?? pick("GITHUB_TOKEN");
  }
  if (normalized === "anthropic") {
    return pick("ANTHROPIC_OAUTH_TOKEN") ?? pick("ANTHROPIC_API_KEY");
  }
  if (normalized === "chutes") {
    return pick("CHUTES_OAUTH_TOKEN") ?? pick("CHUTES_API_KEY");
  }
  if (normalized === "zai") {
    return pick("ZAI_API_KEY") ?? pick("Z_AI_API_KEY");
  }
  if (normalized === "google-vertex") {
    const envKey = (0, _piAi.getEnvApiKey)(normalized);
    if (!envKey) {
      return null;
    }
    return { apiKey: envKey, source: "gcloud adc" };
  }
  if (normalized === "opencode") {
    return pick("OPENCODE_API_KEY") ?? pick("OPENCODE_ZEN_API_KEY");
  }
  if (normalized === "qwen-portal") {
    return pick("QWEN_OAUTH_TOKEN") ?? pick("QWEN_PORTAL_API_KEY");
  }
  if (normalized === "minimax-portal") {
    return pick("MINIMAX_OAUTH_TOKEN") ?? pick("MINIMAX_API_KEY");
  }
  if (normalized === "kimi-coding") {
    return pick("KIMI_API_KEY") ?? pick("KIMICODE_API_KEY");
  }
  const envMap = {
    openai: "OPENAI_API_KEY",
    google: "GEMINI_API_KEY",
    groq: "GROQ_API_KEY",
    deepgram: "DEEPGRAM_API_KEY",
    cerebras: "CEREBRAS_API_KEY",
    xai: "XAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    "vercel-ai-gateway": "AI_GATEWAY_API_KEY",
    moonshot: "MOONSHOT_API_KEY",
    minimax: "MINIMAX_API_KEY",
    xiaomi: "XIAOMI_API_KEY",
    synthetic: "SYNTHETIC_API_KEY",
    venice: "VENICE_API_KEY",
    mistral: "MISTRAL_API_KEY",
    opencode: "OPENCODE_API_KEY"
  };
  const envVar = envMap[normalized];
  if (!envVar) {
    return null;
  }
  return pick(envVar);
}
function resolveModelAuthMode(provider, cfg, store) {
  const resolved = provider?.trim();
  if (!resolved) {
    return undefined;
  }
  const authOverride = resolveProviderAuthOverride(cfg, resolved);
  if (authOverride === "aws-sdk") {
    return "aws-sdk";
  }
  const authStore = store ?? (0, _authProfiles.ensureAuthProfileStore)();
  const profiles = (0, _authProfiles.listProfilesForProvider)(authStore, resolved);
  if (profiles.length > 0) {
    const modes = new Set(profiles.
    map((id) => authStore.profiles[id]?.type).
    filter((mode) => Boolean(mode)));
    const distinct = ["oauth", "token", "api_key"].filter((k) => modes.has(k));
    if (distinct.length >= 2) {
      return "mixed";
    }
    if (modes.has("oauth")) {
      return "oauth";
    }
    if (modes.has("token")) {
      return "token";
    }
    if (modes.has("api_key")) {
      return "api-key";
    }
  }
  if (authOverride === undefined && (0, _modelSelection.normalizeProviderId)(resolved) === "amazon-bedrock") {
    return "aws-sdk";
  }
  const envKey = resolveEnvApiKey(resolved);
  if (envKey?.apiKey) {
    return envKey.source.includes("OAUTH_TOKEN") ? "oauth" : "api-key";
  }
  if (getCustomProviderApiKey(cfg, resolved)) {
    return "api-key";
  }
  return "unknown";
}
async function getApiKeyForModel(params) {
  return resolveApiKeyForProvider({
    provider: params.model.provider,
    cfg: params.cfg,
    profileId: params.profileId,
    preferredProfile: params.preferredProfile,
    store: params.store,
    agentDir: params.agentDir
  });
}
function requireApiKey(auth, provider) {
  const key = auth.apiKey?.trim();
  if (key) {
    return key;
  }
  throw new Error(`No API key resolved for provider "${provider}" (auth mode: ${auth.mode}).`);
} /* v9-cd4a42210ea3e770 */
