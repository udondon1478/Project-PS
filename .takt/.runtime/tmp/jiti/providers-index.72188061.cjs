"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildMediaUnderstandingRegistry = buildMediaUnderstandingRegistry;exports.getMediaUnderstandingProvider = getMediaUnderstandingProvider;exports.normalizeMediaProviderId = normalizeMediaProviderId;var _modelSelection = require("../../agents/model-selection.js");
var _index = require("./anthropic/index.js");
var _index2 = require("./deepgram/index.js");
var _index3 = require("./google/index.js");
var _index4 = require("./groq/index.js");
var _index5 = require("./minimax/index.js");
var _index6 = require("./openai/index.js");
const PROVIDERS = [
_index4.groqProvider,
_index6.openaiProvider,
_index3.googleProvider,
_index.anthropicProvider,
_index5.minimaxProvider,
_index2.deepgramProvider];

function normalizeMediaProviderId(id) {
  const normalized = (0, _modelSelection.normalizeProviderId)(id);
  if (normalized === "gemini") {
    return "google";
  }
  return normalized;
}
function buildMediaUnderstandingRegistry(overrides) {
  const registry = new Map();
  for (const provider of PROVIDERS) {
    registry.set(normalizeMediaProviderId(provider.id), provider);
  }
  if (overrides) {
    for (const [key, provider] of Object.entries(overrides)) {
      const normalizedKey = normalizeMediaProviderId(key);
      const existing = registry.get(normalizedKey);
      const merged = existing ?
      {
        ...existing,
        ...provider,
        capabilities: provider.capabilities ?? existing.capabilities
      } :
      provider;
      registry.set(normalizedKey, merged);
    }
  }
  return registry;
}
function getMediaUnderstandingProvider(id, registry) {
  return registry.get(normalizeMediaProviderId(id));
} /* v9-c66a5bffd039d947 */
