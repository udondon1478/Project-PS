"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.persistInlineDirectives = persistInlineDirectives;exports.resolveDefaultModel = resolveDefaultModel;var _agentScope = require("../../agents/agent-scope.js");
var _context = require("../../agents/context.js");
var _defaults = require("../../agents/defaults.js");
var _modelSelection = require("../../agents/model-selection.js");
var _sessions = require("../../config/sessions.js");
var _systemEvents = require("../../infra/system-events.js");
var _levelOverrides = require("../../sessions/level-overrides.js");
var _modelOverrides = require("../../sessions/model-overrides.js");
var _directiveHandlingAuth = require("./directive-handling.auth.js");
var _directiveHandlingShared = require("./directive-handling.shared.js");
async function persistInlineDirectives(params) {
  const { directives, cfg, sessionEntry, sessionStore, sessionKey, storePath, elevatedEnabled, elevatedAllowed, defaultProvider, defaultModel, aliasIndex, allowedModelKeys, initialModelLabel, formatModelSwitchEvent, agentCfg } = params;
  let { provider, model } = params;
  const activeAgentId = sessionKey ?
  (0, _agentScope.resolveSessionAgentId)({ sessionKey, config: cfg }) :
  (0, _agentScope.resolveDefaultAgentId)(cfg);
  const agentDir = (0, _agentScope.resolveAgentDir)(cfg, activeAgentId);
  if (sessionEntry && sessionStore && sessionKey) {
    const prevElevatedLevel = sessionEntry.elevatedLevel ??
    agentCfg?.elevatedDefault ?? (
    elevatedAllowed ? "on" : "off");
    const prevReasoningLevel = sessionEntry.reasoningLevel ?? "off";
    let elevatedChanged = directives.hasElevatedDirective &&
    directives.elevatedLevel !== undefined &&
    elevatedEnabled &&
    elevatedAllowed;
    let reasoningChanged = directives.hasReasoningDirective && directives.reasoningLevel !== undefined;
    let updated = false;
    if (directives.hasThinkDirective && directives.thinkLevel) {
      if (directives.thinkLevel === "off") {
        delete sessionEntry.thinkingLevel;
      } else
      {
        sessionEntry.thinkingLevel = directives.thinkLevel;
      }
      updated = true;
    }
    if (directives.hasVerboseDirective && directives.verboseLevel) {
      (0, _levelOverrides.applyVerboseOverride)(sessionEntry, directives.verboseLevel);
      updated = true;
    }
    if (directives.hasReasoningDirective && directives.reasoningLevel) {
      if (directives.reasoningLevel === "off") {
        delete sessionEntry.reasoningLevel;
      } else
      {
        sessionEntry.reasoningLevel = directives.reasoningLevel;
      }
      reasoningChanged =
      reasoningChanged ||
      directives.reasoningLevel !== prevReasoningLevel &&
      directives.reasoningLevel !== undefined;
      updated = true;
    }
    if (directives.hasElevatedDirective &&
    directives.elevatedLevel &&
    elevatedEnabled &&
    elevatedAllowed) {
      // Persist "off" explicitly so inline `/elevated off` overrides defaults.
      sessionEntry.elevatedLevel = directives.elevatedLevel;
      elevatedChanged =
      elevatedChanged ||
      directives.elevatedLevel !== prevElevatedLevel && directives.elevatedLevel !== undefined;
      updated = true;
    }
    if (directives.hasExecDirective && directives.hasExecOptions) {
      if (directives.execHost) {
        sessionEntry.execHost = directives.execHost;
        updated = true;
      }
      if (directives.execSecurity) {
        sessionEntry.execSecurity = directives.execSecurity;
        updated = true;
      }
      if (directives.execAsk) {
        sessionEntry.execAsk = directives.execAsk;
        updated = true;
      }
      if (directives.execNode) {
        sessionEntry.execNode = directives.execNode;
        updated = true;
      }
    }
    const modelDirective = directives.hasModelDirective && params.effectiveModelDirective ?
    params.effectiveModelDirective :
    undefined;
    if (modelDirective) {
      const resolved = (0, _modelSelection.resolveModelRefFromString)({
        raw: modelDirective,
        defaultProvider,
        aliasIndex
      });
      if (resolved) {
        const key = (0, _modelSelection.modelKey)(resolved.ref.provider, resolved.ref.model);
        if (allowedModelKeys.size === 0 || allowedModelKeys.has(key)) {
          let profileOverride;
          if (directives.rawModelProfile) {
            const profileResolved = (0, _directiveHandlingAuth.resolveProfileOverride)({
              rawProfile: directives.rawModelProfile,
              provider: resolved.ref.provider,
              cfg,
              agentDir
            });
            if (profileResolved.error) {
              throw new Error(profileResolved.error);
            }
            profileOverride = profileResolved.profileId;
          }
          const isDefault = resolved.ref.provider === defaultProvider && resolved.ref.model === defaultModel;
          const { updated: modelUpdated } = (0, _modelOverrides.applyModelOverrideToSessionEntry)({
            entry: sessionEntry,
            selection: {
              provider: resolved.ref.provider,
              model: resolved.ref.model,
              isDefault
            },
            profileOverride
          });
          provider = resolved.ref.provider;
          model = resolved.ref.model;
          const nextLabel = `${provider}/${model}`;
          if (nextLabel !== initialModelLabel) {
            (0, _systemEvents.enqueueSystemEvent)(formatModelSwitchEvent(nextLabel, resolved.alias), {
              sessionKey,
              contextKey: `model:${nextLabel}`
            });
          }
          updated = updated || modelUpdated;
        }
      }
    }
    if (directives.hasQueueDirective && directives.queueReset) {
      delete sessionEntry.queueMode;
      delete sessionEntry.queueDebounceMs;
      delete sessionEntry.queueCap;
      delete sessionEntry.queueDrop;
      updated = true;
    }
    if (updated) {
      sessionEntry.updatedAt = Date.now();
      sessionStore[sessionKey] = sessionEntry;
      if (storePath) {
        await (0, _sessions.updateSessionStore)(storePath, (store) => {
          store[sessionKey] = sessionEntry;
        });
      }
      if (elevatedChanged) {
        const nextElevated = sessionEntry.elevatedLevel ?? "off";
        (0, _systemEvents.enqueueSystemEvent)((0, _directiveHandlingShared.formatElevatedEvent)(nextElevated), {
          sessionKey,
          contextKey: "mode:elevated"
        });
      }
      if (reasoningChanged) {
        const nextReasoning = sessionEntry.reasoningLevel ?? "off";
        (0, _systemEvents.enqueueSystemEvent)((0, _directiveHandlingShared.formatReasoningEvent)(nextReasoning), {
          sessionKey,
          contextKey: "mode:reasoning"
        });
      }
    }
  }
  return {
    provider,
    model,
    contextTokens: agentCfg?.contextTokens ?? (0, _context.lookupContextTokens)(model) ?? _defaults.DEFAULT_CONTEXT_TOKENS
  };
}
function resolveDefaultModel(params) {
  const mainModel = (0, _modelSelection.resolveDefaultModelForAgent)({
    cfg: params.cfg,
    agentId: params.agentId
  });
  const defaultProvider = mainModel.provider;
  const defaultModel = mainModel.model;
  const aliasIndex = (0, _modelSelection.buildModelAliasIndex)({
    cfg: params.cfg,
    defaultProvider
  });
  return { defaultProvider, defaultModel, aliasIndex };
} /* v9-fd9d841936114d2a */
