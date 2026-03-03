"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.cacheSticker = cacheSticker;exports.describeStickerImage = describeStickerImage;exports.getAllCachedStickers = getAllCachedStickers;exports.getCacheStats = getCacheStats;exports.getCachedSticker = getCachedSticker;exports.searchStickers = searchStickers;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _modelAuth = require("../agents/model-auth.js");
var _modelCatalog = require("../agents/model-catalog.js");
var _modelSelection = require("../agents/model-selection.js");
var _paths = require("../config/paths.js");
var _globals = require("../globals.js");
var _jsonFile = require("../infra/json-file.js");
var _runner = require("../media-understanding/runner.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
const CACHE_FILE = _nodePath.default.join(_paths.STATE_DIR, "telegram", "sticker-cache.json");
const CACHE_VERSION = 1;
function loadCache() {
  const data = (0, _jsonFile.loadJsonFile)(CACHE_FILE);
  if (!data || typeof data !== "object") {
    return { version: CACHE_VERSION, stickers: {} };
  }
  const cache = data;
  if (cache.version !== CACHE_VERSION) {
    // Future: handle migration if needed
    return { version: CACHE_VERSION, stickers: {} };
  }
  return cache;
}
function saveCache(cache) {
  (0, _jsonFile.saveJsonFile)(CACHE_FILE, cache);
}
/**
 * Get a cached sticker by its unique ID.
 */
function getCachedSticker(fileUniqueId) {
  const cache = loadCache();
  return cache.stickers[fileUniqueId] ?? null;
}
/**
 * Add or update a sticker in the cache.
 */
function cacheSticker(sticker) {
  const cache = loadCache();
  cache.stickers[sticker.fileUniqueId] = sticker;
  saveCache(cache);
}
/**
 * Search cached stickers by text query (fuzzy match on description + emoji + setName).
 */
function searchStickers(query, limit = 10) {
  const cache = loadCache();
  const queryLower = query.toLowerCase();
  const results = [];
  for (const sticker of Object.values(cache.stickers)) {
    let score = 0;
    const descLower = sticker.description.toLowerCase();
    // Exact substring match in description
    if (descLower.includes(queryLower)) {
      score += 10;
    }
    // Word-level matching
    const queryWords = queryLower.split(/\s+/).filter(Boolean);
    const descWords = descLower.split(/\s+/);
    for (const qWord of queryWords) {
      if (descWords.some((dWord) => dWord.includes(qWord))) {
        score += 5;
      }
    }
    // Emoji match
    if (sticker.emoji && query.includes(sticker.emoji)) {
      score += 8;
    }
    // Set name match
    if (sticker.setName?.toLowerCase().includes(queryLower)) {
      score += 3;
    }
    if (score > 0) {
      results.push({ sticker, score });
    }
  }
  return results.
  toSorted((a, b) => b.score - a.score).
  slice(0, limit).
  map((r) => r.sticker);
}
/**
 * Get all cached stickers (for debugging/listing).
 */
function getAllCachedStickers() {
  const cache = loadCache();
  return Object.values(cache.stickers);
}
/**
 * Get cache statistics.
 */
function getCacheStats() {
  const cache = loadCache();
  const stickers = Object.values(cache.stickers);
  if (stickers.length === 0) {
    return { count: 0 };
  }
  const sorted = [...stickers].toSorted((a, b) => new Date(a.cachedAt).getTime() - new Date(b.cachedAt).getTime());
  return {
    count: stickers.length,
    oldestAt: sorted[0]?.cachedAt,
    newestAt: sorted[sorted.length - 1]?.cachedAt
  };
}
const STICKER_DESCRIPTION_PROMPT = "Describe this sticker image in 1-2 sentences. Focus on what the sticker depicts (character, object, action, emotion). Be concise and objective.";
const VISION_PROVIDERS = ["openai", "anthropic", "google", "minimax"];
/**
 * Describe a sticker image using vision API.
 * Auto-detects an available vision provider based on configured API keys.
 * Returns null if no vision provider is available.
 */
async function describeStickerImage(params) {
  const { imagePath, cfg, agentDir, agentId } = params;
  const defaultModel = (0, _modelSelection.resolveDefaultModelForAgent)({ cfg, agentId });
  let activeModel = undefined;
  let catalog = [];
  try {
    catalog = await (0, _modelCatalog.loadModelCatalog)({ config: cfg });
    const entry = (0, _modelCatalog.findModelInCatalog)(catalog, defaultModel.provider, defaultModel.model);
    const supportsVision = (0, _modelCatalog.modelSupportsVision)(entry);
    if (supportsVision) {
      activeModel = { provider: defaultModel.provider, model: defaultModel.model };
    }
  }
  catch {

    // Ignore catalog failures; fall back to auto selection.
  }const hasProviderKey = async (provider) => {
    try {
      await (0, _modelAuth.resolveApiKeyForProvider)({ provider, cfg, agentDir });
      return true;
    }
    catch {
      return false;
    }
  };
  const selectCatalogModel = (provider) => {
    const entries = catalog.filter((entry) => entry.provider.toLowerCase() === provider.toLowerCase() && (0, _modelCatalog.modelSupportsVision)(entry));
    if (entries.length === 0) {
      return undefined;
    }
    const defaultId = provider === "openai" ?
    "gpt-5-mini" :
    provider === "anthropic" ?
    "claude-opus-4-5" :
    provider === "google" ?
    "gemini-3-flash-preview" :
    "MiniMax-VL-01";
    const preferred = entries.find((entry) => entry.id === defaultId);
    return preferred ?? entries[0];
  };
  let resolved = null;
  if (activeModel &&
  VISION_PROVIDERS.includes(activeModel.provider) && (
  await hasProviderKey(activeModel.provider))) {
    resolved = activeModel;
  }
  if (!resolved) {
    for (const provider of VISION_PROVIDERS) {
      if (!(await hasProviderKey(provider))) {
        continue;
      }
      const entry = selectCatalogModel(provider);
      if (entry) {
        resolved = { provider, model: entry.id };
        break;
      }
    }
  }
  if (!resolved) {
    resolved = await (0, _runner.resolveAutoImageModel)({
      cfg,
      agentDir,
      activeModel
    });
  }
  if (!resolved?.model) {
    (0, _globals.logVerbose)("telegram: no vision provider available for sticker description");
    return null;
  }
  const { provider, model } = resolved;
  (0, _globals.logVerbose)(`telegram: describing sticker with ${provider}/${model}`);
  try {
    const buffer = await _promises.default.readFile(imagePath);
    // Dynamic import to avoid circular dependency
    const { describeImageWithModel } = await Promise.resolve().then(() => jitiImport("../media-understanding/providers/image.js").then((m) => _interopRequireWildcard(m)));
    const result = await describeImageWithModel({
      buffer,
      fileName: "sticker.webp",
      mime: "image/webp",
      prompt: STICKER_DESCRIPTION_PROMPT,
      cfg,
      agentDir: agentDir ?? "",
      provider,
      model,
      maxTokens: 150,
      timeoutMs: 30000
    });
    return result.text;
  }
  catch (err) {
    (0, _globals.logVerbose)(`telegram: failed to describe sticker: ${String(err)}`);
    return null;
  }
} /* v9-5ba35cc431498538 */
