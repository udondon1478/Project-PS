"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.__setModelCatalogImportForTest = __setModelCatalogImportForTest;exports.findModelInCatalog = findModelInCatalog;exports.loadModelCatalog = loadModelCatalog;exports.modelSupportsVision = modelSupportsVision;exports.resetModelCatalogCacheForTest = resetModelCatalogCacheForTest;var _config = require("../config/config.js");
var _agentPaths = require("./agent-paths.js");
var _modelsConfig = require("./models-config.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
let modelCatalogPromise = null;
let hasLoggedModelCatalogError = false;
const defaultImportPiSdk = () => Promise.resolve().then(() => jitiImport("./pi-model-discovery.js").then((m) => _interopRequireWildcard(m)));
let importPiSdk = defaultImportPiSdk;
function resetModelCatalogCacheForTest() {
  modelCatalogPromise = null;
  hasLoggedModelCatalogError = false;
  importPiSdk = defaultImportPiSdk;
}
// Test-only escape hatch: allow mocking the dynamic import to simulate transient failures.
function __setModelCatalogImportForTest(loader) {
  importPiSdk = loader ?? defaultImportPiSdk;
}
async function loadModelCatalog(params) {
  if (params?.useCache === false) {
    modelCatalogPromise = null;
  }
  if (modelCatalogPromise) {
    return modelCatalogPromise;
  }
  modelCatalogPromise = (async () => {
    const models = [];
    const sortModels = (entries) => entries.sort((a, b) => {
      const p = a.provider.localeCompare(b.provider);
      if (p !== 0) {
        return p;
      }
      return a.name.localeCompare(b.name);
    });
    try {
      const cfg = params?.config ?? (0, _config.loadConfig)();
      await (0, _modelsConfig.ensureOpenClawModelsJson)(cfg);
      // IMPORTANT: keep the dynamic import *inside* the try/catch.
      // If this fails once (e.g. during a pnpm install that temporarily swaps node_modules),
      // we must not poison the cache with a rejected promise (otherwise all channel handlers
      // will keep failing until restart).
      const piSdk = await importPiSdk();
      const agentDir = (0, _agentPaths.resolveOpenClawAgentDir)();
      const { join } = await Promise.resolve().then(() => jitiImport("node:path").then((m) => _interopRequireWildcard(m)));
      const authStorage = new piSdk.AuthStorage(join(agentDir, "auth.json"));
      const registry = new piSdk.ModelRegistry(authStorage, join(agentDir, "models.json"));
      const entries = Array.isArray(registry) ? registry : registry.getAll();
      for (const entry of entries) {
        const id = String(entry?.id ?? "").trim();
        if (!id) {
          continue;
        }
        const provider = String(entry?.provider ?? "").trim();
        if (!provider) {
          continue;
        }
        const name = String(entry?.name ?? id).trim() || id;
        const contextWindow = typeof entry?.contextWindow === "number" && entry.contextWindow > 0 ?
        entry.contextWindow :
        undefined;
        const reasoning = typeof entry?.reasoning === "boolean" ? entry.reasoning : undefined;
        const input = Array.isArray(entry?.input) ? entry.input : undefined;
        models.push({ id, name, provider, contextWindow, reasoning, input });
      }
      if (models.length === 0) {
        // If we found nothing, don't cache this result so we can try again.
        modelCatalogPromise = null;
      }
      return sortModels(models);
    }
    catch (error) {
      if (!hasLoggedModelCatalogError) {
        hasLoggedModelCatalogError = true;
        console.warn(`[model-catalog] Failed to load model catalog: ${String(error)}`);
      }
      // Don't poison the cache on transient dependency/filesystem issues.
      modelCatalogPromise = null;
      if (models.length > 0) {
        return sortModels(models);
      }
      return [];
    }
  })();
  return modelCatalogPromise;
}
/**
 * Check if a model supports image input based on its catalog entry.
 */
function modelSupportsVision(entry) {
  return entry?.input?.includes("image") ?? false;
}
/**
 * Find a model in the catalog by provider and model ID.
 */
function findModelInCatalog(catalog, provider, modelId) {
  const normalizedProvider = provider.toLowerCase().trim();
  const normalizedModelId = modelId.toLowerCase().trim();
  return catalog.find((entry) => entry.provider.toLowerCase() === normalizedProvider &&
  entry.id.toLowerCase() === normalizedModelId);
} /* v9-081094ccc5aa70dc */
