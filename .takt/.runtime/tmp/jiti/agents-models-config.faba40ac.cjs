"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ensureOpenClawModelsJson = ensureOpenClawModelsJson;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _config = require("../config/config.js");
var _agentPaths = require("./agent-paths.js");
var _modelsConfigProviders = require("./models-config.providers.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const DEFAULT_MODE = "merge";
function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function mergeProviderModels(implicit, explicit) {
  const implicitModels = Array.isArray(implicit.models) ? implicit.models : [];
  const explicitModels = Array.isArray(explicit.models) ? explicit.models : [];
  if (implicitModels.length === 0) {
    return { ...implicit, ...explicit };
  }
  const getId = (model) => {
    if (!model || typeof model !== "object") {
      return "";
    }
    const id = model.id;
    return typeof id === "string" ? id.trim() : "";
  };
  const seen = new Set(explicitModels.map(getId).filter(Boolean));
  const mergedModels = [
  ...explicitModels,
  ...implicitModels.filter((model) => {
    const id = getId(model);
    if (!id) {
      return false;
    }
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  })];

  return {
    ...implicit,
    ...explicit,
    models: mergedModels
  };
}
function mergeProviders(params) {
  const out = params.implicit ? { ...params.implicit } : {};
  for (const [key, explicit] of Object.entries(params.explicit ?? {})) {
    const providerKey = key.trim();
    if (!providerKey) {
      continue;
    }
    const implicit = out[providerKey];
    out[providerKey] = implicit ? mergeProviderModels(implicit, explicit) : explicit;
  }
  return out;
}
async function readJson(pathname) {
  try {
    const raw = await _promises.default.readFile(pathname, "utf8");
    return JSON.parse(raw);
  }
  catch {
    return null;
  }
}
async function ensureOpenClawModelsJson(config, agentDirOverride) {
  const cfg = config ?? (0, _config.loadConfig)();
  const agentDir = agentDirOverride?.trim() ? agentDirOverride.trim() : (0, _agentPaths.resolveOpenClawAgentDir)();
  const explicitProviders = cfg.models?.providers ?? {};
  const implicitProviders = await (0, _modelsConfigProviders.resolveImplicitProviders)({ agentDir });
  const providers = mergeProviders({
    implicit: implicitProviders,
    explicit: explicitProviders
  });
  const implicitBedrock = await (0, _modelsConfigProviders.resolveImplicitBedrockProvider)({ agentDir, config: cfg });
  if (implicitBedrock) {
    const existing = providers["amazon-bedrock"];
    providers["amazon-bedrock"] = existing ?
    mergeProviderModels(implicitBedrock, existing) :
    implicitBedrock;
  }
  const implicitCopilot = await (0, _modelsConfigProviders.resolveImplicitCopilotProvider)({ agentDir });
  if (implicitCopilot && !providers["github-copilot"]) {
    providers["github-copilot"] = implicitCopilot;
  }
  if (Object.keys(providers).length === 0) {
    return { agentDir, wrote: false };
  }
  const mode = cfg.models?.mode ?? DEFAULT_MODE;
  const targetPath = _nodePath.default.join(agentDir, "models.json");
  let mergedProviders = providers;
  let existingRaw = "";
  if (mode === "merge") {
    const existing = await readJson(targetPath);
    if (isRecord(existing) && isRecord(existing.providers)) {
      const existingProviders = existing.providers;
      mergedProviders = { ...existingProviders, ...providers };
    }
  }
  const normalizedProviders = (0, _modelsConfigProviders.normalizeProviders)({
    providers: mergedProviders,
    agentDir
  });
  const next = `${JSON.stringify({ providers: normalizedProviders }, null, 2)}\n`;
  try {
    existingRaw = await _promises.default.readFile(targetPath, "utf8");
  }
  catch {
    existingRaw = "";
  }
  if (existingRaw === next) {
    return { agentDir, wrote: false };
  }
  await _promises.default.mkdir(agentDir, { recursive: true, mode: 0o700 });
  await _promises.default.writeFile(targetPath, next, { mode: 0o600 });
  return { agentDir, wrote: true };
} /* v9-32815039b6d70c0c */
