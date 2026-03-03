"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildInlineProviderModels = buildInlineProviderModels;exports.buildModelAliasLines = buildModelAliasLines;exports.resolveModel = resolveModel;var _agentPaths = require("../agent-paths.js");
var _defaults = require("../defaults.js");
var _modelCompat = require("../model-compat.js");
var _modelSelection = require("../model-selection.js");
var _piModelDiscovery = require("../pi-model-discovery.js");
function buildInlineProviderModels(providers) {
  return Object.entries(providers).flatMap(([providerId, entry]) => {
    const trimmed = providerId.trim();
    if (!trimmed) {
      return [];
    }
    return (entry?.models ?? []).map((model) => ({
      ...model,
      provider: trimmed,
      baseUrl: entry?.baseUrl,
      api: model.api ?? entry?.api
    }));
  });
}
function buildModelAliasLines(cfg) {
  const models = cfg?.agents?.defaults?.models ?? {};
  const entries = [];
  for (const [keyRaw, entryRaw] of Object.entries(models)) {
    const model = String(keyRaw ?? "").trim();
    if (!model) {
      continue;
    }
    const alias = String(entryRaw?.alias ?? "").trim();
    if (!alias) {
      continue;
    }
    entries.push({ alias, model });
  }
  return entries.
  toSorted((a, b) => a.alias.localeCompare(b.alias)).
  map((entry) => `- ${entry.alias}: ${entry.model}`);
}
function resolveModel(provider, modelId, agentDir, cfg) {
  const resolvedAgentDir = agentDir ?? (0, _agentPaths.resolveOpenClawAgentDir)();
  const authStorage = (0, _piModelDiscovery.discoverAuthStorage)(resolvedAgentDir);
  const modelRegistry = (0, _piModelDiscovery.discoverModels)(authStorage, resolvedAgentDir);
  const model = modelRegistry.find(provider, modelId);
  if (!model) {
    const providers = cfg?.models?.providers ?? {};
    const inlineModels = buildInlineProviderModels(providers);
    const normalizedProvider = (0, _modelSelection.normalizeProviderId)(provider);
    const inlineMatch = inlineModels.find((entry) => (0, _modelSelection.normalizeProviderId)(entry.provider) === normalizedProvider && entry.id === modelId);
    if (inlineMatch) {
      const normalized = (0, _modelCompat.normalizeModelCompat)(inlineMatch);
      return {
        model: normalized,
        authStorage,
        modelRegistry
      };
    }
    const providerCfg = providers[provider];
    if (providerCfg || modelId.startsWith("mock-")) {
      const fallbackModel = (0, _modelCompat.normalizeModelCompat)({
        id: modelId,
        name: modelId,
        api: providerCfg?.api ?? "openai-responses",
        provider,
        baseUrl: providerCfg?.baseUrl,
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: providerCfg?.models?.[0]?.contextWindow ?? _defaults.DEFAULT_CONTEXT_TOKENS,
        maxTokens: providerCfg?.models?.[0]?.maxTokens ?? _defaults.DEFAULT_CONTEXT_TOKENS
      });
      return { model: fallbackModel, authStorage, modelRegistry };
    }
    return {
      error: `Unknown model: ${provider}/${modelId}`,
      authStorage,
      modelRegistry
    };
  }
  return { model: (0, _modelCompat.normalizeModelCompat)(model), authStorage, modelRegistry };
} /* v9-a78433defeca4559 */
