"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.maybeHandleModelDirectiveInfo = maybeHandleModelDirectiveInfo;exports.resolveModelSelectionFromDirective = resolveModelSelectionFromDirective;var _authProfiles = require("../../agents/auth-profiles.js");
var _modelSelection = require("../../agents/model-selection.js");
var _utils = require("../../utils.js");
var _commandsModels = require("./commands-models.js");
var _directiveHandlingAuth = require("./directive-handling.auth.js");
var _directiveHandlingModelPicker = require("./directive-handling.model-picker.js");
var _modelSelection2 = require("./model-selection.js");
function buildModelPickerCatalog(params) {
  const resolvedDefault = (0, _modelSelection.resolveConfiguredModelRef)({
    cfg: params.cfg,
    defaultProvider: params.defaultProvider,
    defaultModel: params.defaultModel
  });
  const buildConfiguredCatalog = () => {
    const out = [];
    const keys = new Set();
    const pushRef = (ref, name) => {
      const provider = (0, _modelSelection.normalizeProviderId)(ref.provider);
      const id = String(ref.model ?? "").trim();
      if (!provider || !id) {
        return;
      }
      const key = (0, _modelSelection.modelKey)(provider, id);
      if (keys.has(key)) {
        return;
      }
      keys.add(key);
      out.push({ provider, id, name: name ?? id });
    };
    const pushRaw = (raw) => {
      const value = String(raw ?? "").trim();
      if (!value) {
        return;
      }
      const resolved = (0, _modelSelection.resolveModelRefFromString)({
        raw: value,
        defaultProvider: params.defaultProvider,
        aliasIndex: params.aliasIndex
      });
      if (!resolved) {
        return;
      }
      pushRef(resolved.ref);
    };
    pushRef(resolvedDefault);
    const modelConfig = params.cfg.agents?.defaults?.model;
    const modelFallbacks = modelConfig && typeof modelConfig === "object" ? modelConfig.fallbacks ?? [] : [];
    for (const fallback of modelFallbacks) {
      pushRaw(String(fallback ?? ""));
    }
    const imageConfig = params.cfg.agents?.defaults?.imageModel;
    if (imageConfig && typeof imageConfig === "object") {
      pushRaw(imageConfig.primary);
      for (const fallback of imageConfig.fallbacks ?? []) {
        pushRaw(String(fallback ?? ""));
      }
    }
    for (const raw of Object.keys(params.cfg.agents?.defaults?.models ?? {})) {
      pushRaw(raw);
    }
    return out;
  };
  const keys = new Set();
  const out = [];
  const push = (entry) => {
    const provider = (0, _modelSelection.normalizeProviderId)(entry.provider);
    const id = String(entry.id ?? "").trim();
    if (!provider || !id) {
      return;
    }
    const key = (0, _modelSelection.modelKey)(provider, id);
    if (keys.has(key)) {
      return;
    }
    keys.add(key);
    out.push({ provider, id, name: entry.name });
  };
  const hasAllowlist = Object.keys(params.cfg.agents?.defaults?.models ?? {}).length > 0;
  if (!hasAllowlist) {
    for (const entry of params.allowedModelCatalog) {
      push({
        provider: entry.provider,
        id: entry.id ?? "",
        name: entry.name
      });
    }
    for (const entry of buildConfiguredCatalog()) {
      push(entry);
    }
    return out;
  }
  // Prefer catalog entries (when available), but always merge in config-only
  // allowlist entries. This keeps custom providers/models visible in /model.
  for (const entry of params.allowedModelCatalog) {
    push({
      provider: entry.provider,
      id: entry.id ?? "",
      name: entry.name
    });
  }
  // Merge any configured allowlist keys that the catalog doesn't know about.
  for (const raw of Object.keys(params.cfg.agents?.defaults?.models ?? {})) {
    const resolved = (0, _modelSelection.resolveModelRefFromString)({
      raw: String(raw),
      defaultProvider: params.defaultProvider,
      aliasIndex: params.aliasIndex
    });
    if (!resolved) {
      continue;
    }
    push({
      provider: resolved.ref.provider,
      id: resolved.ref.model,
      name: resolved.ref.model
    });
  }
  // Ensure the configured default is always present (even when no allowlist).
  if (resolvedDefault.model) {
    push({
      provider: resolvedDefault.provider,
      id: resolvedDefault.model,
      name: resolvedDefault.model
    });
  }
  return out;
}
async function maybeHandleModelDirectiveInfo(params) {
  if (!params.directives.hasModelDirective) {
    return undefined;
  }
  const rawDirective = params.directives.rawModelDirective?.trim();
  const directive = rawDirective?.toLowerCase();
  const wantsStatus = directive === "status";
  const wantsSummary = !rawDirective;
  const wantsLegacyList = directive === "list";
  if (!wantsSummary && !wantsStatus && !wantsLegacyList) {
    return undefined;
  }
  if (params.directives.rawModelProfile) {
    return { text: "Auth profile override requires a model selection." };
  }
  const pickerCatalog = buildModelPickerCatalog({
    cfg: params.cfg,
    defaultProvider: params.defaultProvider,
    defaultModel: params.defaultModel,
    aliasIndex: params.aliasIndex,
    allowedModelCatalog: params.allowedModelCatalog
  });
  if (wantsLegacyList) {
    const reply = await (0, _commandsModels.resolveModelsCommandReply)({
      cfg: params.cfg,
      commandBodyNormalized: "/models"
    });
    return reply ?? { text: "No models available." };
  }
  if (wantsSummary) {
    const current = `${params.provider}/${params.model}`;
    return {
      text: [
      `Current: ${current}`,
      "",
      "Switch: /model <provider/model>",
      "Browse: /models (providers) or /models <provider> (models)",
      "More: /model status"].
      join("\n")
    };
  }
  const modelsPath = `${params.agentDir}/models.json`;
  const formatPath = (value) => (0, _utils.shortenHomePath)(value);
  const authMode = "verbose";
  if (pickerCatalog.length === 0) {
    return { text: "No models available." };
  }
  const authByProvider = new Map();
  for (const entry of pickerCatalog) {
    const provider = (0, _modelSelection.normalizeProviderId)(entry.provider);
    if (authByProvider.has(provider)) {
      continue;
    }
    const auth = await (0, _directiveHandlingAuth.resolveAuthLabel)(provider, params.cfg, modelsPath, params.agentDir, authMode);
    authByProvider.set(provider, (0, _directiveHandlingAuth.formatAuthLabel)(auth));
  }
  const current = `${params.provider}/${params.model}`;
  const defaultLabel = `${params.defaultProvider}/${params.defaultModel}`;
  const lines = [
  `Current: ${current}`,
  `Default: ${defaultLabel}`,
  `Agent: ${params.activeAgentId}`,
  `Auth file: ${formatPath((0, _authProfiles.resolveAuthStorePathForDisplay)(params.agentDir))}`];

  if (params.resetModelOverride) {
    lines.push(`(previous selection reset to default)`);
  }
  const byProvider = new Map();
  for (const entry of pickerCatalog) {
    const provider = (0, _modelSelection.normalizeProviderId)(entry.provider);
    const models = byProvider.get(provider);
    if (models) {
      models.push(entry);
      continue;
    }
    byProvider.set(provider, [entry]);
  }
  for (const provider of byProvider.keys()) {
    const models = byProvider.get(provider);
    if (!models) {
      continue;
    }
    const authLabel = authByProvider.get(provider) ?? "missing";
    const endpoint = (0, _directiveHandlingModelPicker.resolveProviderEndpointLabel)(provider, params.cfg);
    const endpointSuffix = endpoint.endpoint ?
    ` endpoint: ${endpoint.endpoint}` :
    " endpoint: default";
    const apiSuffix = endpoint.api ? ` api: ${endpoint.api}` : "";
    lines.push("");
    lines.push(`[${provider}]${endpointSuffix}${apiSuffix} auth: ${authLabel}`);
    for (const entry of models) {
      const label = `${provider}/${entry.id}`;
      const aliases = params.aliasIndex.byKey.get(label);
      const aliasSuffix = aliases && aliases.length > 0 ? ` (${aliases.join(", ")})` : "";
      lines.push(`  • ${label}${aliasSuffix}`);
    }
  }
  return { text: lines.join("\n") };
}
function resolveModelSelectionFromDirective(params) {
  if (!params.directives.hasModelDirective || !params.directives.rawModelDirective) {
    if (params.directives.rawModelProfile) {
      return { errorText: "Auth profile override requires a model selection." };
    }
    return {};
  }
  const raw = params.directives.rawModelDirective.trim();
  let modelSelection;
  if (/^[0-9]+$/.test(raw)) {
    return {
      errorText: [
      "Numeric model selection is not supported in chat.",
      "",
      "Browse: /models or /models <provider>",
      "Switch: /model <provider/model>"].
      join("\n")
    };
  }
  const explicit = (0, _modelSelection.resolveModelRefFromString)({
    raw,
    defaultProvider: params.defaultProvider,
    aliasIndex: params.aliasIndex
  });
  if (explicit) {
    const explicitKey = (0, _modelSelection.modelKey)(explicit.ref.provider, explicit.ref.model);
    if (params.allowedModelKeys.size === 0 || params.allowedModelKeys.has(explicitKey)) {
      modelSelection = {
        provider: explicit.ref.provider,
        model: explicit.ref.model,
        isDefault: explicit.ref.provider === params.defaultProvider &&
        explicit.ref.model === params.defaultModel,
        ...(explicit.alias ? { alias: explicit.alias } : {})
      };
    }
  }
  if (!modelSelection) {
    const resolved = (0, _modelSelection2.resolveModelDirectiveSelection)({
      raw,
      defaultProvider: params.defaultProvider,
      defaultModel: params.defaultModel,
      aliasIndex: params.aliasIndex,
      allowedModelKeys: params.allowedModelKeys
    });
    if (resolved.error) {
      return { errorText: resolved.error };
    }
    if (resolved.selection) {
      modelSelection = resolved.selection;
    }
  }
  let profileOverride;
  if (modelSelection && params.directives.rawModelProfile) {
    const profileResolved = (0, _directiveHandlingAuth.resolveProfileOverride)({
      rawProfile: params.directives.rawModelProfile,
      provider: modelSelection.provider,
      cfg: params.cfg,
      agentDir: params.agentDir
    });
    if (profileResolved.error) {
      return { errorText: profileResolved.error };
    }
    profileOverride = profileResolved.profileId;
  }
  return { modelSelection, profileOverride };
} /* v9-5edfbcb320f6027e */
