"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.runMemoryFlushIfNeeded = runMemoryFlushIfNeeded;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _agentScope = require("../../agents/agent-scope.js");
var _modelFallback = require("../../agents/model-fallback.js");
var _modelSelection = require("../../agents/model-selection.js");
var _piEmbedded = require("../../agents/pi-embedded.js");
var _sandbox = require("../../agents/sandbox.js");
var _sessions = require("../../config/sessions.js");
var _globals = require("../../globals.js");
var _agentEvents = require("../../infra/agent-events.js");
var _agentRunnerUtils = require("./agent-runner-utils.js");
var _memoryFlush = require("./memory-flush.js");
var _sessionUpdates = require("./session-updates.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
async function runMemoryFlushIfNeeded(params) {
  const memoryFlushSettings = (0, _memoryFlush.resolveMemoryFlushSettings)(params.cfg);
  if (!memoryFlushSettings) {
    return params.sessionEntry;
  }
  const memoryFlushWritable = (() => {
    if (!params.sessionKey) {
      return true;
    }
    const runtime = (0, _sandbox.resolveSandboxRuntimeStatus)({
      cfg: params.cfg,
      sessionKey: params.sessionKey
    });
    if (!runtime.sandboxed) {
      return true;
    }
    const sandboxCfg = (0, _sandbox.resolveSandboxConfigForAgent)(params.cfg, runtime.agentId);
    return sandboxCfg.workspaceAccess === "rw";
  })();
  const shouldFlushMemory = memoryFlushSettings &&
  memoryFlushWritable &&
  !params.isHeartbeat &&
  !(0, _modelSelection.isCliProvider)(params.followupRun.run.provider, params.cfg) &&
  (0, _memoryFlush.shouldRunMemoryFlush)({
    entry: params.sessionEntry ?? (
    params.sessionKey ? params.sessionStore?.[params.sessionKey] : undefined),
    contextWindowTokens: (0, _memoryFlush.resolveMemoryFlushContextWindowTokens)({
      modelId: params.followupRun.run.model ?? params.defaultModel,
      agentCfgContextTokens: params.agentCfgContextTokens
    }),
    reserveTokensFloor: memoryFlushSettings.reserveTokensFloor,
    softThresholdTokens: memoryFlushSettings.softThresholdTokens
  });
  if (!shouldFlushMemory) {
    return params.sessionEntry;
  }
  let activeSessionEntry = params.sessionEntry;
  const activeSessionStore = params.sessionStore;
  const flushRunId = _nodeCrypto.default.randomUUID();
  if (params.sessionKey) {
    (0, _agentEvents.registerAgentRunContext)(flushRunId, {
      sessionKey: params.sessionKey,
      verboseLevel: params.resolvedVerboseLevel
    });
  }
  let memoryCompactionCompleted = false;
  const flushSystemPrompt = [
  params.followupRun.run.extraSystemPrompt,
  memoryFlushSettings.systemPrompt].

  filter(Boolean).
  join("\n\n");
  try {
    await (0, _modelFallback.runWithModelFallback)({
      cfg: params.followupRun.run.config,
      provider: params.followupRun.run.provider,
      model: params.followupRun.run.model,
      agentDir: params.followupRun.run.agentDir,
      fallbacksOverride: (0, _agentScope.resolveAgentModelFallbacksOverride)(params.followupRun.run.config, (0, _sessions.resolveAgentIdFromSessionKey)(params.followupRun.run.sessionKey)),
      run: (provider, model) => {
        const authProfileId = provider === params.followupRun.run.provider ?
        params.followupRun.run.authProfileId :
        undefined;
        return (0, _piEmbedded.runEmbeddedPiAgent)({
          sessionId: params.followupRun.run.sessionId,
          sessionKey: params.sessionKey,
          messageProvider: params.sessionCtx.Provider?.trim().toLowerCase() || undefined,
          agentAccountId: params.sessionCtx.AccountId,
          messageTo: params.sessionCtx.OriginatingTo ?? params.sessionCtx.To,
          messageThreadId: params.sessionCtx.MessageThreadId ?? undefined,
          // Provider threading context for tool auto-injection
          ...(0, _agentRunnerUtils.buildThreadingToolContext)({
            sessionCtx: params.sessionCtx,
            config: params.followupRun.run.config,
            hasRepliedRef: params.opts?.hasRepliedRef
          }),
          senderId: params.sessionCtx.SenderId?.trim() || undefined,
          senderName: params.sessionCtx.SenderName?.trim() || undefined,
          senderUsername: params.sessionCtx.SenderUsername?.trim() || undefined,
          senderE164: params.sessionCtx.SenderE164?.trim() || undefined,
          sessionFile: params.followupRun.run.sessionFile,
          workspaceDir: params.followupRun.run.workspaceDir,
          agentDir: params.followupRun.run.agentDir,
          config: params.followupRun.run.config,
          skillsSnapshot: params.followupRun.run.skillsSnapshot,
          prompt: memoryFlushSettings.prompt,
          extraSystemPrompt: flushSystemPrompt,
          ownerNumbers: params.followupRun.run.ownerNumbers,
          enforceFinalTag: (0, _agentRunnerUtils.resolveEnforceFinalTag)(params.followupRun.run, provider),
          provider,
          model,
          authProfileId,
          authProfileIdSource: authProfileId ?
          params.followupRun.run.authProfileIdSource :
          undefined,
          thinkLevel: params.followupRun.run.thinkLevel,
          verboseLevel: params.followupRun.run.verboseLevel,
          reasoningLevel: params.followupRun.run.reasoningLevel,
          execOverrides: params.followupRun.run.execOverrides,
          bashElevated: params.followupRun.run.bashElevated,
          timeoutMs: params.followupRun.run.timeoutMs,
          runId: flushRunId,
          onAgentEvent: (evt) => {
            if (evt.stream === "compaction") {
              const phase = typeof evt.data.phase === "string" ? evt.data.phase : "";
              const willRetry = Boolean(evt.data.willRetry);
              if (phase === "end" && !willRetry) {
                memoryCompactionCompleted = true;
              }
            }
          }
        });
      }
    });
    let memoryFlushCompactionCount = activeSessionEntry?.compactionCount ?? (
    params.sessionKey ? activeSessionStore?.[params.sessionKey]?.compactionCount : 0) ??
    0;
    if (memoryCompactionCompleted) {
      const nextCount = await (0, _sessionUpdates.incrementCompactionCount)({
        sessionEntry: activeSessionEntry,
        sessionStore: activeSessionStore,
        sessionKey: params.sessionKey,
        storePath: params.storePath
      });
      if (typeof nextCount === "number") {
        memoryFlushCompactionCount = nextCount;
      }
    }
    if (params.storePath && params.sessionKey) {
      try {
        const updatedEntry = await (0, _sessions.updateSessionStoreEntry)({
          storePath: params.storePath,
          sessionKey: params.sessionKey,
          update: async () => ({
            memoryFlushAt: Date.now(),
            memoryFlushCompactionCount
          })
        });
        if (updatedEntry) {
          activeSessionEntry = updatedEntry;
        }
      }
      catch (err) {
        (0, _globals.logVerbose)(`failed to persist memory flush metadata: ${String(err)}`);
      }
    }
  }
  catch (err) {
    (0, _globals.logVerbose)(`memory flush run failed: ${String(err)}`);
  }
  return activeSessionEntry;
} /* v9-b5c4396361e68742 */
