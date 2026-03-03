"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applyResetModelOverride = applyResetModelOverride;var _modelCatalog = require("../../agents/model-catalog.js");
var _modelSelection = require("../../agents/model-selection.js");
var _sessions = require("../../config/sessions.js");
var _modelOverrides = require("../../sessions/model-overrides.js");
var _inboundSenderMeta = require("./inbound-sender-meta.js");
var _modelSelection2 = require("./model-selection.js");
function splitBody(body) {
  const tokens = body.split(/\s+/).filter(Boolean);
  return {
    tokens,
    first: tokens[0],
    second: tokens[1],
    rest: tokens.slice(2)
  };
}
function buildSelectionFromExplicit(params) {
  const resolved = (0, _modelSelection.resolveModelRefFromString)({
    raw: params.raw,
    defaultProvider: params.defaultProvider,
    aliasIndex: params.aliasIndex
  });
  if (!resolved) {
    return undefined;
  }
  const key = (0, _modelSelection.modelKey)(resolved.ref.provider, resolved.ref.model);
  if (params.allowedModelKeys.size > 0 && !params.allowedModelKeys.has(key)) {
    return undefined;
  }
  const isDefault = resolved.ref.provider === params.defaultProvider && resolved.ref.model === params.defaultModel;
  return {
    provider: resolved.ref.provider,
    model: resolved.ref.model,
    isDefault,
    ...(resolved.alias ? { alias: resolved.alias } : undefined)
  };
}
function applySelectionToSession(params) {
  const { selection, sessionEntry, sessionStore, sessionKey, storePath } = params;
  if (!sessionEntry || !sessionStore || !sessionKey) {
    return;
  }
  const { updated } = (0, _modelOverrides.applyModelOverrideToSessionEntry)({
    entry: sessionEntry,
    selection
  });
  if (!updated) {
    return;
  }
  sessionStore[sessionKey] = sessionEntry;
  if (storePath) {
    (0, _sessions.updateSessionStore)(storePath, (store) => {
      store[sessionKey] = sessionEntry;
    }).catch(() => {

      // Ignore persistence errors; session still proceeds.
    });}
}
async function applyResetModelOverride(params) {
  if (!params.resetTriggered) {
    return {};
  }
  const rawBody = params.bodyStripped?.trim();
  if (!rawBody) {
    return {};
  }
  const { tokens, first, second } = splitBody(rawBody);
  if (!first) {
    return {};
  }
  const catalog = await (0, _modelCatalog.loadModelCatalog)({ config: params.cfg });
  const allowed = (0, _modelSelection.buildAllowedModelSet)({
    cfg: params.cfg,
    catalog,
    defaultProvider: params.defaultProvider,
    defaultModel: params.defaultModel
  });
  const allowedModelKeys = allowed.allowedKeys;
  if (allowedModelKeys.size === 0) {
    return {};
  }
  const providers = new Set();
  for (const key of allowedModelKeys) {
    const slash = key.indexOf("/");
    if (slash <= 0) {
      continue;
    }
    providers.add((0, _modelSelection.normalizeProviderId)(key.slice(0, slash)));
  }
  const resolveSelection = (raw) => (0, _modelSelection2.resolveModelDirectiveSelection)({
    raw,
    defaultProvider: params.defaultProvider,
    defaultModel: params.defaultModel,
    aliasIndex: params.aliasIndex,
    allowedModelKeys
  });
  let selection;
  let consumed = 0;
  if (providers.has((0, _modelSelection.normalizeProviderId)(first)) && second) {
    const composite = `${(0, _modelSelection.normalizeProviderId)(first)}/${second}`;
    const resolved = resolveSelection(composite);
    if (resolved.selection) {
      selection = resolved.selection;
      consumed = 2;
    }
  }
  if (!selection) {
    selection = buildSelectionFromExplicit({
      raw: first,
      defaultProvider: params.defaultProvider,
      defaultModel: params.defaultModel,
      aliasIndex: params.aliasIndex,
      allowedModelKeys
    });
    if (selection) {
      consumed = 1;
    }
  }
  if (!selection) {
    const resolved = resolveSelection(first);
    const allowFuzzy = providers.has((0, _modelSelection.normalizeProviderId)(first)) || first.trim().length >= 6;
    if (allowFuzzy) {
      selection = resolved.selection;
      if (selection) {
        consumed = 1;
      }
    }
  }
  if (!selection) {
    return {};
  }
  const cleanedBody = tokens.slice(consumed).join(" ").trim();
  params.sessionCtx.BodyStripped = (0, _inboundSenderMeta.formatInboundBodyWithSenderMeta)({
    ctx: params.ctx,
    body: cleanedBody
  });
  params.sessionCtx.BodyForCommands = cleanedBody;
  applySelectionToSession({
    selection,
    sessionEntry: params.sessionEntry,
    sessionStore: params.sessionStore,
    sessionKey: params.sessionKey,
    storePath: params.storePath
  });
  return { selection, cleanedBody };
} /* v9-0351a1f85ef34cf9 */
