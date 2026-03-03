"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveProfileOverride = exports.resolveAuthLabel = exports.formatAuthLabel = void 0;var _authProfiles = require("../../agents/auth-profiles.js");
var _modelAuth = require("../../agents/model-auth.js");
var _modelSelection = require("../../agents/model-selection.js");
var _utils = require("../../utils.js");
const maskApiKey = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "missing";
  }
  if (trimmed.length <= 16) {
    return trimmed;
  }
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-8)}`;
};
const resolveAuthLabel = async (provider, cfg, modelsPath, agentDir, mode = "compact") => {
  const formatPath = (value) => (0, _utils.shortenHomePath)(value);
  const store = (0, _modelAuth.ensureAuthProfileStore)(agentDir, {
    allowKeychainPrompt: false
  });
  const order = (0, _modelAuth.resolveAuthProfileOrder)({ cfg, store, provider });
  const providerKey = (0, _modelSelection.normalizeProviderId)(provider);
  const lastGood = (() => {
    const map = store.lastGood;
    if (!map) {
      return undefined;
    }
    for (const [key, value] of Object.entries(map)) {
      if ((0, _modelSelection.normalizeProviderId)(key) === providerKey) {
        return value;
      }
    }
    return undefined;
  })();
  const nextProfileId = order[0];
  const now = Date.now();
  const formatUntil = (timestampMs) => {
    const remainingMs = Math.max(0, timestampMs - now);
    const minutes = Math.round(remainingMs / 60_000);
    if (minutes < 1) {
      return "soon";
    }
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.round(minutes / 60);
    if (hours < 48) {
      return `${hours}h`;
    }
    const days = Math.round(hours / 24);
    return `${days}d`;
  };
  if (order.length > 0) {
    if (mode === "compact") {
      const profileId = nextProfileId;
      if (!profileId) {
        return { label: "missing", source: "missing" };
      }
      const profile = store.profiles[profileId];
      const configProfile = cfg.auth?.profiles?.[profileId];
      const missing = !profile ||
      configProfile?.provider && configProfile.provider !== profile.provider ||
      configProfile?.mode &&
      configProfile.mode !== profile.type &&
      !(configProfile.mode === "oauth" && profile.type === "token");
      const more = order.length > 1 ? ` (+${order.length - 1})` : "";
      if (missing) {
        return { label: `${profileId} missing${more}`, source: "" };
      }
      if (profile.type === "api_key") {
        return {
          label: `${profileId} api-key ${maskApiKey(profile.key)}${more}`,
          source: ""
        };
      }
      if (profile.type === "token") {
        const exp = typeof profile.expires === "number" &&
        Number.isFinite(profile.expires) &&
        profile.expires > 0 ?
        profile.expires <= now ?
        " expired" :
        ` exp ${formatUntil(profile.expires)}` :
        "";
        return {
          label: `${profileId} token ${maskApiKey(profile.token)}${exp}${more}`,
          source: ""
        };
      }
      const display = (0, _authProfiles.resolveAuthProfileDisplayLabel)({ cfg, store, profileId });
      const label = display === profileId ? profileId : display;
      const exp = typeof profile.expires === "number" &&
      Number.isFinite(profile.expires) &&
      profile.expires > 0 ?
      profile.expires <= now ?
      " expired" :
      ` exp ${formatUntil(profile.expires)}` :
      "";
      return { label: `${label} oauth${exp}${more}`, source: "" };
    }
    const labels = order.map((profileId) => {
      const profile = store.profiles[profileId];
      const configProfile = cfg.auth?.profiles?.[profileId];
      const flags = [];
      if (profileId === nextProfileId) {
        flags.push("next");
      }
      if (lastGood && profileId === lastGood) {
        flags.push("lastGood");
      }
      if ((0, _authProfiles.isProfileInCooldown)(store, profileId)) {
        const until = store.usageStats?.[profileId]?.cooldownUntil;
        if (typeof until === "number" && Number.isFinite(until) && until > now) {
          flags.push(`cooldown ${formatUntil(until)}`);
        } else
        {
          flags.push("cooldown");
        }
      }
      if (!profile ||
      configProfile?.provider && configProfile.provider !== profile.provider ||
      configProfile?.mode &&
      configProfile.mode !== profile.type &&
      !(configProfile.mode === "oauth" && profile.type === "token")) {
        const suffix = flags.length > 0 ? ` (${flags.join(", ")})` : "";
        return `${profileId}=missing${suffix}`;
      }
      if (profile.type === "api_key") {
        const suffix = flags.length > 0 ? ` (${flags.join(", ")})` : "";
        return `${profileId}=${maskApiKey(profile.key)}${suffix}`;
      }
      if (profile.type === "token") {
        if (typeof profile.expires === "number" &&
        Number.isFinite(profile.expires) &&
        profile.expires > 0) {
          flags.push(profile.expires <= now ? "expired" : `exp ${formatUntil(profile.expires)}`);
        }
        const suffix = flags.length > 0 ? ` (${flags.join(", ")})` : "";
        return `${profileId}=token:${maskApiKey(profile.token)}${suffix}`;
      }
      const display = (0, _authProfiles.resolveAuthProfileDisplayLabel)({
        cfg,
        store,
        profileId
      });
      const suffix = display === profileId ?
      "" :
      display.startsWith(profileId) ?
      display.slice(profileId.length).trim() :
      `(${display})`;
      if (typeof profile.expires === "number" &&
      Number.isFinite(profile.expires) &&
      profile.expires > 0) {
        flags.push(profile.expires <= now ? "expired" : `exp ${formatUntil(profile.expires)}`);
      }
      const suffixLabel = suffix ? ` ${suffix}` : "";
      const suffixFlags = flags.length > 0 ? ` (${flags.join(", ")})` : "";
      return `${profileId}=OAuth${suffixLabel}${suffixFlags}`;
    });
    return {
      label: labels.join(", "),
      source: `auth-profiles.json: ${formatPath((0, _authProfiles.resolveAuthStorePathForDisplay)(agentDir))}`
    };
  }
  const envKey = (0, _modelAuth.resolveEnvApiKey)(provider);
  if (envKey) {
    const isOAuthEnv = envKey.source.includes("ANTHROPIC_OAUTH_TOKEN") ||
    envKey.source.toLowerCase().includes("oauth");
    const label = isOAuthEnv ? "OAuth (env)" : maskApiKey(envKey.apiKey);
    return { label, source: mode === "verbose" ? envKey.source : "" };
  }
  const customKey = (0, _modelAuth.getCustomProviderApiKey)(cfg, provider);
  if (customKey) {
    return {
      label: maskApiKey(customKey),
      source: mode === "verbose" ? `models.json: ${formatPath(modelsPath)}` : ""
    };
  }
  return { label: "missing", source: "missing" };
};exports.resolveAuthLabel = resolveAuthLabel;
const formatAuthLabel = (auth) => {
  if (!auth.source || auth.source === auth.label || auth.source === "missing") {
    return auth.label;
  }
  return `${auth.label} (${auth.source})`;
};exports.formatAuthLabel = formatAuthLabel;
const resolveProfileOverride = (params) => {
  const raw = params.rawProfile?.trim();
  if (!raw) {
    return {};
  }
  const store = (0, _modelAuth.ensureAuthProfileStore)(params.agentDir, {
    allowKeychainPrompt: false
  });
  const profile = store.profiles[raw];
  if (!profile) {
    return { error: `Auth profile "${raw}" not found.` };
  }
  if (profile.provider !== params.provider) {
    return {
      error: `Auth profile "${raw}" is for ${profile.provider}, not ${params.provider}.`
    };
  }
  return { profileId: raw };
};exports.resolveProfileOverride = resolveProfileOverride; /* v9-2827981fadb51f08 */
