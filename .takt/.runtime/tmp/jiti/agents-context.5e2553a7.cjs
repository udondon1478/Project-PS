"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.lookupContextTokens = lookupContextTokens;

var _config = require("../config/config.js");
var _agentPaths = require("./agent-paths.js");
var _modelsConfig = require("./models-config.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);} // Lazy-load pi-coding-agent model metadata so we can infer context windows when
// the agent reports a model id. This includes custom models.json entries.
const MODEL_CACHE = new Map();const loadPromise = (async () => {
  try {
    const { discoverAuthStorage, discoverModels } = await Promise.resolve().then(() => jitiImport("./pi-model-discovery.js").then((m) => _interopRequireWildcard(m)));
    const cfg = (0, _config.loadConfig)();
    await (0, _modelsConfig.ensureOpenClawModelsJson)(cfg);
    const agentDir = (0, _agentPaths.resolveOpenClawAgentDir)();
    const authStorage = discoverAuthStorage(agentDir);
    const modelRegistry = discoverModels(authStorage, agentDir);
    const models = modelRegistry.getAll();
    for (const m of models) {
      if (!m?.id) {
        continue;
      }
      if (typeof m.contextWindow === "number" && m.contextWindow > 0) {
        MODEL_CACHE.set(m.id, m.contextWindow);
      }
    }
  }
  catch {

    // If pi-ai isn't available, leave cache empty; lookup will fall back.
  }})();
function lookupContextTokens(modelId) {
  if (!modelId) {
    return undefined;
  }
  // Best-effort: kick off loading, but don't block.
  void loadPromise;
  return MODEL_CACHE.get(modelId);
} /* v9-5fd9c32c5bc4cb59 */
