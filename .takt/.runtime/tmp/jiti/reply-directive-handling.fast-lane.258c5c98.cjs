"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applyInlineDirectivesFastLane = applyInlineDirectivesFastLane;var _directiveHandlingImpl = require("./directive-handling.impl.js");
var _directiveHandlingParse = require("./directive-handling.parse.js");
async function applyInlineDirectivesFastLane(params) {
  const { directives, commandAuthorized, ctx, cfg, agentId, isGroup, sessionEntry, sessionStore, sessionKey, storePath, elevatedEnabled, elevatedAllowed, elevatedFailures, messageProviderKey, defaultProvider, defaultModel, aliasIndex, allowedModelKeys, allowedModelCatalog, resetModelOverride, formatModelSwitchEvent, modelState } = params;
  let { provider, model } = params;
  if (!commandAuthorized ||
  (0, _directiveHandlingParse.isDirectiveOnly)({
    directives,
    cleanedBody: directives.cleaned,
    ctx,
    cfg,
    agentId,
    isGroup
  })) {
    return { directiveAck: undefined, provider, model };
  }
  const agentCfg = params.agentCfg;
  const resolvedDefaultThinkLevel = sessionEntry?.thinkingLevel ??
  agentCfg?.thinkingDefault ?? (
  await modelState.resolveDefaultThinkingLevel());
  const currentThinkLevel = resolvedDefaultThinkLevel;
  const currentVerboseLevel = sessionEntry?.verboseLevel ??
  agentCfg?.verboseDefault;
  const currentReasoningLevel = sessionEntry?.reasoningLevel ?? "off";
  const currentElevatedLevel = sessionEntry?.elevatedLevel ??
  agentCfg?.elevatedDefault;
  const directiveAck = await (0, _directiveHandlingImpl.handleDirectiveOnly)({
    cfg,
    directives,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    elevatedEnabled,
    elevatedAllowed,
    elevatedFailures,
    messageProviderKey,
    defaultProvider,
    defaultModel,
    aliasIndex,
    allowedModelKeys,
    allowedModelCatalog,
    resetModelOverride,
    provider,
    model,
    initialModelLabel: params.initialModelLabel,
    formatModelSwitchEvent,
    currentThinkLevel,
    currentVerboseLevel,
    currentReasoningLevel,
    currentElevatedLevel
  });
  if (sessionEntry?.providerOverride) {
    provider = sessionEntry.providerOverride;
  }
  if (sessionEntry?.modelOverride) {
    model = sessionEntry.modelOverride;
  }
  return { directiveAck, provider, model };
} /* v9-4ce44672370be9fb */
