"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleDirectiveOnly = handleDirectiveOnly;var _agentScope = require("../../agents/agent-scope.js");
var _sandbox = require("../../agents/sandbox.js");
var _sessions = require("../../config/sessions.js");
var _systemEvents = require("../../infra/system-events.js");
var _levelOverrides = require("../../sessions/level-overrides.js");
var _modelOverrides = require("../../sessions/model-overrides.js");
var _thinking = require("../thinking.js");
var _directiveHandlingModel = require("./directive-handling.model.js");
var _directiveHandlingQueueValidation = require("./directive-handling.queue-validation.js");
var _directiveHandlingShared = require("./directive-handling.shared.js");
function resolveExecDefaults(params) {
  const globalExec = params.cfg.tools?.exec;
  const agentExec = params.agentId ?
  (0, _agentScope.resolveAgentConfig)(params.cfg, params.agentId)?.tools?.exec :
  undefined;
  return {
    host: params.sessionEntry?.execHost ??
    agentExec?.host ??
    globalExec?.host ??
    "sandbox",
    security: params.sessionEntry?.execSecurity ??
    agentExec?.security ??
    globalExec?.security ??
    "deny",
    ask: params.sessionEntry?.execAsk ??
    agentExec?.ask ??
    globalExec?.ask ??
    "on-miss",
    node: params.sessionEntry?.execNode ?? agentExec?.node ?? globalExec?.node
  };
}
async function handleDirectiveOnly(params) {
  const { directives, sessionEntry, sessionStore, sessionKey, storePath, elevatedEnabled, elevatedAllowed, defaultProvider, defaultModel, aliasIndex, allowedModelKeys, allowedModelCatalog, resetModelOverride, provider, model, initialModelLabel, formatModelSwitchEvent, currentThinkLevel, currentVerboseLevel, currentReasoningLevel, currentElevatedLevel } = params;
  const activeAgentId = (0, _agentScope.resolveSessionAgentId)({
    sessionKey: params.sessionKey,
    config: params.cfg
  });
  const agentDir = (0, _agentScope.resolveAgentDir)(params.cfg, activeAgentId);
  const runtimeIsSandboxed = (0, _sandbox.resolveSandboxRuntimeStatus)({
    cfg: params.cfg,
    sessionKey: params.sessionKey
  }).sandboxed;
  const shouldHintDirectRuntime = directives.hasElevatedDirective && !runtimeIsSandboxed;
  const modelInfo = await (0, _directiveHandlingModel.maybeHandleModelDirectiveInfo)({
    directives,
    cfg: params.cfg,
    agentDir,
    activeAgentId,
    provider,
    model,
    defaultProvider,
    defaultModel,
    aliasIndex,
    allowedModelCatalog,
    resetModelOverride
  });
  if (modelInfo) {
    return modelInfo;
  }
  const modelResolution = (0, _directiveHandlingModel.resolveModelSelectionFromDirective)({
    directives,
    cfg: params.cfg,
    agentDir,
    defaultProvider,
    defaultModel,
    aliasIndex,
    allowedModelKeys,
    allowedModelCatalog,
    provider
  });
  if (modelResolution.errorText) {
    return { text: modelResolution.errorText };
  }
  const modelSelection = modelResolution.modelSelection;
  const profileOverride = modelResolution.profileOverride;
  const resolvedProvider = modelSelection?.provider ?? provider;
  const resolvedModel = modelSelection?.model ?? model;
  if (directives.hasThinkDirective && !directives.thinkLevel) {
    // If no argument was provided, show the current level
    if (!directives.rawThinkLevel) {
      const level = currentThinkLevel ?? "off";
      return {
        text: (0, _directiveHandlingShared.withOptions)(`Current thinking level: ${level}.`, (0, _thinking.formatThinkingLevels)(resolvedProvider, resolvedModel))
      };
    }
    return {
      text: `Unrecognized thinking level "${directives.rawThinkLevel}". Valid levels: ${(0, _thinking.formatThinkingLevels)(resolvedProvider, resolvedModel)}.`
    };
  }
  if (directives.hasVerboseDirective && !directives.verboseLevel) {
    if (!directives.rawVerboseLevel) {
      const level = currentVerboseLevel ?? "off";
      return {
        text: (0, _directiveHandlingShared.withOptions)(`Current verbose level: ${level}.`, "on, full, off")
      };
    }
    return {
      text: `Unrecognized verbose level "${directives.rawVerboseLevel}". Valid levels: off, on, full.`
    };
  }
  if (directives.hasReasoningDirective && !directives.reasoningLevel) {
    if (!directives.rawReasoningLevel) {
      const level = currentReasoningLevel ?? "off";
      return {
        text: (0, _directiveHandlingShared.withOptions)(`Current reasoning level: ${level}.`, "on, off, stream")
      };
    }
    return {
      text: `Unrecognized reasoning level "${directives.rawReasoningLevel}". Valid levels: on, off, stream.`
    };
  }
  if (directives.hasElevatedDirective && !directives.elevatedLevel) {
    if (!directives.rawElevatedLevel) {
      if (!elevatedEnabled || !elevatedAllowed) {
        return {
          text: (0, _directiveHandlingShared.formatElevatedUnavailableText)({
            runtimeSandboxed: runtimeIsSandboxed,
            failures: params.elevatedFailures,
            sessionKey: params.sessionKey
          })
        };
      }
      const level = currentElevatedLevel ?? "off";
      return {
        text: [
        (0, _directiveHandlingShared.withOptions)(`Current elevated level: ${level}.`, "on, off, ask, full"),
        shouldHintDirectRuntime ? (0, _directiveHandlingShared.formatElevatedRuntimeHint)() : null].

        filter(Boolean).
        join("\n")
      };
    }
    return {
      text: `Unrecognized elevated level "${directives.rawElevatedLevel}". Valid levels: off, on, ask, full.`
    };
  }
  if (directives.hasElevatedDirective && (!elevatedEnabled || !elevatedAllowed)) {
    return {
      text: (0, _directiveHandlingShared.formatElevatedUnavailableText)({
        runtimeSandboxed: runtimeIsSandboxed,
        failures: params.elevatedFailures,
        sessionKey: params.sessionKey
      })
    };
  }
  if (directives.hasExecDirective) {
    if (directives.invalidExecHost) {
      return {
        text: `Unrecognized exec host "${directives.rawExecHost ?? ""}". Valid hosts: sandbox, gateway, node.`
      };
    }
    if (directives.invalidExecSecurity) {
      return {
        text: `Unrecognized exec security "${directives.rawExecSecurity ?? ""}". Valid: deny, allowlist, full.`
      };
    }
    if (directives.invalidExecAsk) {
      return {
        text: `Unrecognized exec ask "${directives.rawExecAsk ?? ""}". Valid: off, on-miss, always.`
      };
    }
    if (directives.invalidExecNode) {
      return {
        text: "Exec node requires a value."
      };
    }
    if (!directives.hasExecOptions) {
      const execDefaults = resolveExecDefaults({
        cfg: params.cfg,
        sessionEntry,
        agentId: activeAgentId
      });
      const nodeLabel = execDefaults.node ? `node=${execDefaults.node}` : "node=(unset)";
      return {
        text: (0, _directiveHandlingShared.withOptions)(`Current exec defaults: host=${execDefaults.host}, security=${execDefaults.security}, ask=${execDefaults.ask}, ${nodeLabel}.`, "host=sandbox|gateway|node, security=deny|allowlist|full, ask=off|on-miss|always, node=<id>")
      };
    }
  }
  const queueAck = (0, _directiveHandlingQueueValidation.maybeHandleQueueDirective)({
    directives,
    cfg: params.cfg,
    channel: provider,
    sessionEntry
  });
  if (queueAck) {
    return queueAck;
  }
  if (directives.hasThinkDirective &&
  directives.thinkLevel === "xhigh" &&
  !(0, _thinking.supportsXHighThinking)(resolvedProvider, resolvedModel)) {
    return {
      text: `Thinking level "xhigh" is only supported for ${(0, _thinking.formatXHighModelHint)()}.`
    };
  }
  const nextThinkLevel = directives.hasThinkDirective ?
  directives.thinkLevel :
  sessionEntry?.thinkingLevel ?? currentThinkLevel;
  const shouldDowngradeXHigh = !directives.hasThinkDirective &&
  nextThinkLevel === "xhigh" &&
  !(0, _thinking.supportsXHighThinking)(resolvedProvider, resolvedModel);
  const prevElevatedLevel = currentElevatedLevel ??
  sessionEntry.elevatedLevel ?? (
  elevatedAllowed ? "on" : "off");
  const prevReasoningLevel = currentReasoningLevel ?? sessionEntry.reasoningLevel ?? "off";
  let elevatedChanged = directives.hasElevatedDirective &&
  directives.elevatedLevel !== undefined &&
  elevatedEnabled &&
  elevatedAllowed;
  let reasoningChanged = directives.hasReasoningDirective && directives.reasoningLevel !== undefined;
  if (directives.hasThinkDirective && directives.thinkLevel) {
    if (directives.thinkLevel === "off") {
      delete sessionEntry.thinkingLevel;
    } else
    {
      sessionEntry.thinkingLevel = directives.thinkLevel;
    }
  }
  if (shouldDowngradeXHigh) {
    sessionEntry.thinkingLevel = "high";
  }
  if (directives.hasVerboseDirective && directives.verboseLevel) {
    (0, _levelOverrides.applyVerboseOverride)(sessionEntry, directives.verboseLevel);
  }
  if (directives.hasReasoningDirective && directives.reasoningLevel) {
    if (directives.reasoningLevel === "off") {
      delete sessionEntry.reasoningLevel;
    } else
    {
      sessionEntry.reasoningLevel = directives.reasoningLevel;
    }
    reasoningChanged =
    directives.reasoningLevel !== prevReasoningLevel && directives.reasoningLevel !== undefined;
  }
  if (directives.hasElevatedDirective && directives.elevatedLevel) {
    // Unlike other toggles, elevated defaults can be "on".
    // Persist "off" explicitly so `/elevated off` actually overrides defaults.
    sessionEntry.elevatedLevel = directives.elevatedLevel;
    elevatedChanged =
    elevatedChanged ||
    directives.elevatedLevel !== prevElevatedLevel && directives.elevatedLevel !== undefined;
  }
  if (directives.hasExecDirective && directives.hasExecOptions) {
    if (directives.execHost) {
      sessionEntry.execHost = directives.execHost;
    }
    if (directives.execSecurity) {
      sessionEntry.execSecurity = directives.execSecurity;
    }
    if (directives.execAsk) {
      sessionEntry.execAsk = directives.execAsk;
    }
    if (directives.execNode) {
      sessionEntry.execNode = directives.execNode;
    }
  }
  if (modelSelection) {
    (0, _modelOverrides.applyModelOverrideToSessionEntry)({
      entry: sessionEntry,
      selection: modelSelection,
      profileOverride
    });
  }
  if (directives.hasQueueDirective && directives.queueReset) {
    delete sessionEntry.queueMode;
    delete sessionEntry.queueDebounceMs;
    delete sessionEntry.queueCap;
    delete sessionEntry.queueDrop;
  } else
  if (directives.hasQueueDirective) {
    if (directives.queueMode) {
      sessionEntry.queueMode = directives.queueMode;
    }
    if (typeof directives.debounceMs === "number") {
      sessionEntry.queueDebounceMs = directives.debounceMs;
    }
    if (typeof directives.cap === "number") {
      sessionEntry.queueCap = directives.cap;
    }
    if (directives.dropPolicy) {
      sessionEntry.queueDrop = directives.dropPolicy;
    }
  }
  sessionEntry.updatedAt = Date.now();
  sessionStore[sessionKey] = sessionEntry;
  if (storePath) {
    await (0, _sessions.updateSessionStore)(storePath, (store) => {
      store[sessionKey] = sessionEntry;
    });
  }
  if (modelSelection) {
    const nextLabel = `${modelSelection.provider}/${modelSelection.model}`;
    if (nextLabel !== initialModelLabel) {
      (0, _systemEvents.enqueueSystemEvent)(formatModelSwitchEvent(nextLabel, modelSelection.alias), {
        sessionKey,
        contextKey: `model:${nextLabel}`
      });
    }
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
  const parts = [];
  if (directives.hasThinkDirective && directives.thinkLevel) {
    parts.push(directives.thinkLevel === "off" ?
    "Thinking disabled." :
    `Thinking level set to ${directives.thinkLevel}.`);
  }
  if (directives.hasVerboseDirective && directives.verboseLevel) {
    parts.push(directives.verboseLevel === "off" ?
    (0, _directiveHandlingShared.formatDirectiveAck)("Verbose logging disabled.") :
    directives.verboseLevel === "full" ?
    (0, _directiveHandlingShared.formatDirectiveAck)("Verbose logging set to full.") :
    (0, _directiveHandlingShared.formatDirectiveAck)("Verbose logging enabled."));
  }
  if (directives.hasReasoningDirective && directives.reasoningLevel) {
    parts.push(directives.reasoningLevel === "off" ?
    (0, _directiveHandlingShared.formatDirectiveAck)("Reasoning visibility disabled.") :
    directives.reasoningLevel === "stream" ?
    (0, _directiveHandlingShared.formatDirectiveAck)("Reasoning stream enabled (Telegram only).") :
    (0, _directiveHandlingShared.formatDirectiveAck)("Reasoning visibility enabled."));
  }
  if (directives.hasElevatedDirective && directives.elevatedLevel) {
    parts.push(directives.elevatedLevel === "off" ?
    (0, _directiveHandlingShared.formatDirectiveAck)("Elevated mode disabled.") :
    directives.elevatedLevel === "full" ?
    (0, _directiveHandlingShared.formatDirectiveAck)("Elevated mode set to full (auto-approve).") :
    (0, _directiveHandlingShared.formatDirectiveAck)("Elevated mode set to ask (approvals may still apply)."));
    if (shouldHintDirectRuntime) {
      parts.push((0, _directiveHandlingShared.formatElevatedRuntimeHint)());
    }
  }
  if (directives.hasExecDirective && directives.hasExecOptions) {
    const execParts = [];
    if (directives.execHost) {
      execParts.push(`host=${directives.execHost}`);
    }
    if (directives.execSecurity) {
      execParts.push(`security=${directives.execSecurity}`);
    }
    if (directives.execAsk) {
      execParts.push(`ask=${directives.execAsk}`);
    }
    if (directives.execNode) {
      execParts.push(`node=${directives.execNode}`);
    }
    if (execParts.length > 0) {
      parts.push((0, _directiveHandlingShared.formatDirectiveAck)(`Exec defaults set (${execParts.join(", ")}).`));
    }
  }
  if (shouldDowngradeXHigh) {
    parts.push(`Thinking level set to high (xhigh not supported for ${resolvedProvider}/${resolvedModel}).`);
  }
  if (modelSelection) {
    const label = `${modelSelection.provider}/${modelSelection.model}`;
    const labelWithAlias = modelSelection.alias ? `${modelSelection.alias} (${label})` : label;
    parts.push(modelSelection.isDefault ?
    `Model reset to default (${labelWithAlias}).` :
    `Model set to ${labelWithAlias}.`);
    if (profileOverride) {
      parts.push(`Auth profile set to ${profileOverride}.`);
    }
  }
  if (directives.hasQueueDirective && directives.queueMode) {
    parts.push((0, _directiveHandlingShared.formatDirectiveAck)(`Queue mode set to ${directives.queueMode}.`));
  } else
  if (directives.hasQueueDirective && directives.queueReset) {
    parts.push((0, _directiveHandlingShared.formatDirectiveAck)("Queue mode reset to default."));
  }
  if (directives.hasQueueDirective && typeof directives.debounceMs === "number") {
    parts.push((0, _directiveHandlingShared.formatDirectiveAck)(`Queue debounce set to ${directives.debounceMs}ms.`));
  }
  if (directives.hasQueueDirective && typeof directives.cap === "number") {
    parts.push((0, _directiveHandlingShared.formatDirectiveAck)(`Queue cap set to ${directives.cap}.`));
  }
  if (directives.hasQueueDirective && directives.dropPolicy) {
    parts.push((0, _directiveHandlingShared.formatDirectiveAck)(`Queue drop set to ${directives.dropPolicy}.`));
  }
  const ack = parts.join(" ").trim();
  if (!ack && directives.hasStatusDirective) {
    return undefined;
  }
  return { text: ack || "OK." };
} /* v9-b9811d18c3584fa3 */
