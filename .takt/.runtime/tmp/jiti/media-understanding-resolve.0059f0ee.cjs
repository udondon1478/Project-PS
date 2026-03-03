"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveCapabilityConfig = resolveCapabilityConfig;exports.resolveConcurrency = resolveConcurrency;exports.resolveEntriesWithActiveFallback = resolveEntriesWithActiveFallback;exports.resolveMaxBytes = resolveMaxBytes;exports.resolveMaxChars = resolveMaxChars;exports.resolveModelEntries = resolveModelEntries;exports.resolvePrompt = resolvePrompt;exports.resolveScopeDecision = resolveScopeDecision;exports.resolveTimeoutMs = resolveTimeoutMs;var _globals = require("../globals.js");
var _defaults = require("./defaults.js");
var _index = require("./providers/index.js");
var _scope = require("./scope.js");
function resolveTimeoutMs(seconds, fallbackSeconds) {
  const value = typeof seconds === "number" && Number.isFinite(seconds) ? seconds : fallbackSeconds;
  return Math.max(1000, Math.floor(value * 1000));
}
function resolvePrompt(capability, prompt, maxChars) {
  const base = prompt?.trim() || _defaults.DEFAULT_PROMPT[capability];
  if (!maxChars || capability === "audio") {
    return base;
  }
  return `${base} Respond in at most ${maxChars} characters.`;
}
function resolveMaxChars(params) {
  const { capability, entry, cfg } = params;
  const configured = entry.maxChars ?? params.config?.maxChars ?? cfg.tools?.media?.[capability]?.maxChars;
  if (typeof configured === "number") {
    return configured;
  }
  return _defaults.DEFAULT_MAX_CHARS_BY_CAPABILITY[capability];
}
function resolveMaxBytes(params) {
  const configured = params.entry.maxBytes ??
  params.config?.maxBytes ??
  params.cfg.tools?.media?.[params.capability]?.maxBytes;
  if (typeof configured === "number") {
    return configured;
  }
  return _defaults.DEFAULT_MAX_BYTES[params.capability];
}
function resolveCapabilityConfig(cfg, capability) {
  return cfg.tools?.media?.[capability];
}
function resolveScopeDecision(params) {
  return (0, _scope.resolveMediaUnderstandingScope)({
    scope: params.scope,
    sessionKey: params.ctx.SessionKey,
    channel: params.ctx.Surface ?? params.ctx.Provider,
    chatType: (0, _scope.normalizeMediaUnderstandingChatType)(params.ctx.ChatType)
  });
}
function resolveEntryCapabilities(params) {
  const entryType = params.entry.type ?? (params.entry.command ? "cli" : "provider");
  if (entryType === "cli") {
    return undefined;
  }
  const providerId = (0, _index.normalizeMediaProviderId)(params.entry.provider ?? "");
  if (!providerId) {
    return undefined;
  }
  return params.providerRegistry.get(providerId)?.capabilities;
}
function resolveModelEntries(params) {
  const { cfg, capability, config } = params;
  const sharedModels = cfg.tools?.media?.models ?? [];
  const entries = [
  ...(config?.models ?? []).map((entry) => ({ entry, source: "capability" })),
  ...sharedModels.map((entry) => ({ entry, source: "shared" }))];

  if (entries.length === 0) {
    return [];
  }
  return entries.
  filter(({ entry, source }) => {
    const caps = entry.capabilities && entry.capabilities.length > 0 ?
    entry.capabilities :
    source === "shared" ?
    resolveEntryCapabilities({ entry, providerRegistry: params.providerRegistry }) :
    undefined;
    if (!caps || caps.length === 0) {
      if (source === "shared") {
        if ((0, _globals.shouldLogVerbose)()) {
          (0, _globals.logVerbose)(`Skipping shared media model without capabilities: ${entry.provider ?? entry.command ?? "unknown"}`);
        }
        return false;
      }
      return true;
    }
    return caps.includes(capability);
  }).
  map(({ entry }) => entry);
}
function resolveConcurrency(cfg) {
  const configured = cfg.tools?.media?.concurrency;
  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
    return Math.floor(configured);
  }
  return _defaults.DEFAULT_MEDIA_CONCURRENCY;
}
function resolveEntriesWithActiveFallback(params) {
  const entries = resolveModelEntries({
    cfg: params.cfg,
    capability: params.capability,
    config: params.config,
    providerRegistry: params.providerRegistry
  });
  if (entries.length > 0) {
    return entries;
  }
  if (params.config?.enabled !== true) {
    return entries;
  }
  const activeProviderRaw = params.activeModel?.provider?.trim();
  if (!activeProviderRaw) {
    return entries;
  }
  const activeProvider = (0, _index.normalizeMediaProviderId)(activeProviderRaw);
  if (!activeProvider) {
    return entries;
  }
  const capabilities = params.providerRegistry.get(activeProvider)?.capabilities;
  if (!capabilities || !capabilities.includes(params.capability)) {
    return entries;
  }
  return [
  {
    type: "provider",
    provider: activeProvider,
    model: params.activeModel?.model
  }];

} /* v9-02b5fe6e49fe791d */
