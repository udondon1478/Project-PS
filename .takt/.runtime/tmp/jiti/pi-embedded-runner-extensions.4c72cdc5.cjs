"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildEmbeddedExtensionPaths = buildEmbeddedExtensionPaths;Object.defineProperty(exports, "ensurePiCompactionReserveTokens", { enumerable: true, get: function () {return _piSettings.ensurePiCompactionReserveTokens;} });var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUrl = require("node:url");
var _contextWindowGuard = require("../context-window-guard.js");
var _defaults = require("../defaults.js");
var _compactionSafeguardRuntime = require("../pi-extensions/compaction-safeguard-runtime.js");
var _runtime = require("../pi-extensions/context-pruning/runtime.js");
var _settings = require("../pi-extensions/context-pruning/settings.js");
var _tools = require("../pi-extensions/context-pruning/tools.js");
var _piSettings = require("../pi-settings.js");
var _cacheTtl = require("./cache-ttl.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function resolvePiExtensionPath(id) {
  const self = (0, _nodeUrl.fileURLToPath)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/agents/pi-embedded-runner/extensions.js");
  const dir = _nodePath.default.dirname(self);
  // In dev this file is `.ts` (tsx), in production it's `.js`.
  const ext = _nodePath.default.extname(self) === ".ts" ? "ts" : "js";
  return _nodePath.default.join(dir, "..", "pi-extensions", `${id}.${ext}`);
}
function resolveContextWindowTokens(params) {
  return (0, _contextWindowGuard.resolveContextWindowInfo)({
    cfg: params.cfg,
    provider: params.provider,
    modelId: params.modelId,
    modelContextWindow: params.model?.contextWindow,
    defaultTokens: _defaults.DEFAULT_CONTEXT_TOKENS
  }).tokens;
}
function buildContextPruningExtension(params) {
  const raw = params.cfg?.agents?.defaults?.contextPruning;
  if (raw?.mode !== "cache-ttl") {
    return {};
  }
  if (!(0, _cacheTtl.isCacheTtlEligibleProvider)(params.provider, params.modelId)) {
    return {};
  }
  const settings = (0, _settings.computeEffectiveSettings)(raw);
  if (!settings) {
    return {};
  }
  (0, _runtime.setContextPruningRuntime)(params.sessionManager, {
    settings,
    contextWindowTokens: resolveContextWindowTokens(params),
    isToolPrunable: (0, _tools.makeToolPrunablePredicate)(settings.tools),
    lastCacheTouchAt: (0, _cacheTtl.readLastCacheTtlTimestamp)(params.sessionManager)
  });
  return {
    additionalExtensionPaths: [resolvePiExtensionPath("context-pruning")]
  };
}
function resolveCompactionMode(cfg) {
  return cfg?.agents?.defaults?.compaction?.mode === "safeguard" ? "safeguard" : "default";
}
function buildEmbeddedExtensionPaths(params) {
  const paths = [];
  if (resolveCompactionMode(params.cfg) === "safeguard") {
    const compactionCfg = params.cfg?.agents?.defaults?.compaction;
    const contextWindowInfo = (0, _contextWindowGuard.resolveContextWindowInfo)({
      cfg: params.cfg,
      provider: params.provider,
      modelId: params.modelId,
      modelContextWindow: params.model?.contextWindow,
      defaultTokens: _defaults.DEFAULT_CONTEXT_TOKENS
    });
    (0, _compactionSafeguardRuntime.setCompactionSafeguardRuntime)(params.sessionManager, {
      maxHistoryShare: compactionCfg?.maxHistoryShare,
      contextWindowTokens: contextWindowInfo.tokens
    });
    paths.push(resolvePiExtensionPath("compaction-safeguard"));
  }
  const pruning = buildContextPruningExtension(params);
  if (pruning.additionalExtensionPaths) {
    paths.push(...pruning.additionalExtensionPaths);
  }
  return paths;
} /* v9-f77dbe4099520d3a */
