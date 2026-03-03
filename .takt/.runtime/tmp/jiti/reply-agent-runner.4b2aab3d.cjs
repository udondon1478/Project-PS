"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.runReplyAgent = runReplyAgent;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _context = require("../../agents/context.js");
var _defaults = require("../../agents/defaults.js");
var _modelAuth = require("../../agents/model-auth.js");
var _modelSelection = require("../../agents/model-selection.js");
var _piEmbedded = require("../../agents/pi-embedded.js");
var _usage = require("../../agents/usage.js");
var _sessions = require("../../config/sessions.js");
var _diagnosticEvents = require("../../infra/diagnostic-events.js");
var _runtime = require("../../runtime.js");
var _usageFormat = require("../../utils/usage-format.js");
var _thinking = require("../thinking.js");
var _agentRunnerExecution = require("./agent-runner-execution.js");
var _agentRunnerHelpers = require("./agent-runner-helpers.js");
var _agentRunnerMemory = require("./agent-runner-memory.js");
var _agentRunnerPayloads = require("./agent-runner-payloads.js");
var _agentRunnerUtils = require("./agent-runner-utils.js");
var _blockReplyPipeline = require("./block-reply-pipeline.js");
var _blockStreaming = require("./block-streaming.js");
var _followupRunner = require("./followup-runner.js");
var _queue = require("./queue.js");
var _replyThreading = require("./reply-threading.js");
var _sessionUpdates = require("./session-updates.js");
var _sessionUsage = require("./session-usage.js");
var _typingMode = require("./typing-mode.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const BLOCK_REPLY_SEND_TIMEOUT_MS = 15_000;
async function runReplyAgent(params) {
  const { commandBody, followupRun, queueKey, resolvedQueue, shouldSteer, shouldFollowup, isActive, isStreaming, opts, typing, sessionEntry, sessionStore, sessionKey, storePath, defaultModel, agentCfgContextTokens, resolvedVerboseLevel, isNewSession, blockStreamingEnabled, blockReplyChunking, resolvedBlockStreamingBreak, sessionCtx, shouldInjectGroupIntro, typingMode } = params;
  let activeSessionEntry = sessionEntry;
  const activeSessionStore = sessionStore;
  let activeIsNewSession = isNewSession;
  const isHeartbeat = opts?.isHeartbeat === true;
  const typingSignals = (0, _typingMode.createTypingSignaler)({
    typing,
    mode: typingMode,
    isHeartbeat
  });
  const shouldEmitToolResult = (0, _agentRunnerHelpers.createShouldEmitToolResult)({
    sessionKey,
    storePath,
    resolvedVerboseLevel
  });
  const shouldEmitToolOutput = (0, _agentRunnerHelpers.createShouldEmitToolOutput)({
    sessionKey,
    storePath,
    resolvedVerboseLevel
  });
  const pendingToolTasks = new Set();
  const blockReplyTimeoutMs = opts?.blockReplyTimeoutMs ?? BLOCK_REPLY_SEND_TIMEOUT_MS;
  const replyToChannel = sessionCtx.OriginatingChannel ??
  (sessionCtx.Surface ?? sessionCtx.Provider)?.toLowerCase();
  const replyToMode = (0, _replyThreading.resolveReplyToMode)(followupRun.run.config, replyToChannel, sessionCtx.AccountId, sessionCtx.ChatType);
  const applyReplyToMode = (0, _replyThreading.createReplyToModeFilterForChannel)(replyToMode, replyToChannel);
  const cfg = followupRun.run.config;
  const blockReplyCoalescing = blockStreamingEnabled && opts?.onBlockReply ?
  (0, _blockStreaming.resolveBlockStreamingCoalescing)(cfg, sessionCtx.Provider, sessionCtx.AccountId, blockReplyChunking) :
  undefined;
  const blockReplyPipeline = blockStreamingEnabled && opts?.onBlockReply ?
  (0, _blockReplyPipeline.createBlockReplyPipeline)({
    onBlockReply: opts.onBlockReply,
    timeoutMs: blockReplyTimeoutMs,
    coalescing: blockReplyCoalescing,
    buffer: (0, _blockReplyPipeline.createAudioAsVoiceBuffer)({ isAudioPayload: _agentRunnerHelpers.isAudioPayload })
  }) :
  null;
  if (shouldSteer && isStreaming) {
    const steered = (0, _piEmbedded.queueEmbeddedPiMessage)(followupRun.run.sessionId, followupRun.prompt);
    if (steered && !shouldFollowup) {
      if (activeSessionEntry && activeSessionStore && sessionKey) {
        const updatedAt = Date.now();
        activeSessionEntry.updatedAt = updatedAt;
        activeSessionStore[sessionKey] = activeSessionEntry;
        if (storePath) {
          await (0, _sessions.updateSessionStoreEntry)({
            storePath,
            sessionKey,
            update: async () => ({ updatedAt })
          });
        }
      }
      typing.cleanup();
      return undefined;
    }
  }
  if (isActive && (shouldFollowup || resolvedQueue.mode === "steer")) {
    (0, _queue.enqueueFollowupRun)(queueKey, followupRun, resolvedQueue);
    if (activeSessionEntry && activeSessionStore && sessionKey) {
      const updatedAt = Date.now();
      activeSessionEntry.updatedAt = updatedAt;
      activeSessionStore[sessionKey] = activeSessionEntry;
      if (storePath) {
        await (0, _sessions.updateSessionStoreEntry)({
          storePath,
          sessionKey,
          update: async () => ({ updatedAt })
        });
      }
    }
    typing.cleanup();
    return undefined;
  }
  await typingSignals.signalRunStart();
  activeSessionEntry = await (0, _agentRunnerMemory.runMemoryFlushIfNeeded)({
    cfg,
    followupRun,
    sessionCtx,
    opts,
    defaultModel,
    agentCfgContextTokens,
    resolvedVerboseLevel,
    sessionEntry: activeSessionEntry,
    sessionStore: activeSessionStore,
    sessionKey,
    storePath,
    isHeartbeat
  });
  const runFollowupTurn = (0, _followupRunner.createFollowupRunner)({
    opts,
    typing,
    typingMode,
    sessionEntry: activeSessionEntry,
    sessionStore: activeSessionStore,
    sessionKey,
    storePath,
    defaultModel,
    agentCfgContextTokens
  });
  let responseUsageLine;
  const resetSession = async ({ failureLabel, buildLogMessage, cleanupTranscripts }) => {
    if (!sessionKey || !activeSessionStore || !storePath) {
      return false;
    }
    const prevEntry = activeSessionStore[sessionKey] ?? activeSessionEntry;
    if (!prevEntry) {
      return false;
    }
    const prevSessionId = cleanupTranscripts ? prevEntry.sessionId : undefined;
    const nextSessionId = _nodeCrypto.default.randomUUID();
    const nextEntry = {
      ...prevEntry,
      sessionId: nextSessionId,
      updatedAt: Date.now(),
      systemSent: false,
      abortedLastRun: false
    };
    const agentId = (0, _sessions.resolveAgentIdFromSessionKey)(sessionKey);
    const nextSessionFile = (0, _sessions.resolveSessionTranscriptPath)(nextSessionId, agentId, sessionCtx.MessageThreadId);
    nextEntry.sessionFile = nextSessionFile;
    activeSessionStore[sessionKey] = nextEntry;
    try {
      await (0, _sessions.updateSessionStore)(storePath, (store) => {
        store[sessionKey] = nextEntry;
      });
    }
    catch (err) {
      _runtime.defaultRuntime.error(`Failed to persist session reset after ${failureLabel} (${sessionKey}): ${String(err)}`);
    }
    followupRun.run.sessionId = nextSessionId;
    followupRun.run.sessionFile = nextSessionFile;
    activeSessionEntry = nextEntry;
    activeIsNewSession = true;
    _runtime.defaultRuntime.error(buildLogMessage(nextSessionId));
    if (cleanupTranscripts && prevSessionId) {
      const transcriptCandidates = new Set();
      const resolved = (0, _sessions.resolveSessionFilePath)(prevSessionId, prevEntry, { agentId });
      if (resolved) {
        transcriptCandidates.add(resolved);
      }
      transcriptCandidates.add((0, _sessions.resolveSessionTranscriptPath)(prevSessionId, agentId));
      for (const candidate of transcriptCandidates) {
        try {
          _nodeFs.default.unlinkSync(candidate);
        }
        catch {

          // Best-effort cleanup.
        }}
    }
    return true;
  };
  const resetSessionAfterCompactionFailure = async (reason) => resetSession({
    failureLabel: "compaction failure",
    buildLogMessage: (nextSessionId) => `Auto-compaction failed (${reason}). Restarting session ${sessionKey} -> ${nextSessionId} and retrying.`
  });
  const resetSessionAfterRoleOrderingConflict = async (reason) => resetSession({
    failureLabel: "role ordering conflict",
    buildLogMessage: (nextSessionId) => `Role ordering conflict (${reason}). Restarting session ${sessionKey} -> ${nextSessionId}.`,
    cleanupTranscripts: true
  });
  try {
    const runStartedAt = Date.now();
    const runOutcome = await (0, _agentRunnerExecution.runAgentTurnWithFallback)({
      commandBody,
      followupRun,
      sessionCtx,
      opts,
      typingSignals,
      blockReplyPipeline,
      blockStreamingEnabled,
      blockReplyChunking,
      resolvedBlockStreamingBreak,
      applyReplyToMode,
      shouldEmitToolResult,
      shouldEmitToolOutput,
      pendingToolTasks,
      resetSessionAfterCompactionFailure,
      resetSessionAfterRoleOrderingConflict,
      isHeartbeat,
      sessionKey,
      getActiveSessionEntry: () => activeSessionEntry,
      activeSessionStore,
      storePath,
      resolvedVerboseLevel
    });
    if (runOutcome.kind === "final") {
      return (0, _agentRunnerHelpers.finalizeWithFollowup)(runOutcome.payload, queueKey, runFollowupTurn);
    }
    const { runResult, fallbackProvider, fallbackModel, directlySentBlockKeys } = runOutcome;
    let { didLogHeartbeatStrip, autoCompactionCompleted } = runOutcome;
    if (shouldInjectGroupIntro &&
    activeSessionEntry &&
    activeSessionStore &&
    sessionKey &&
    activeSessionEntry.groupActivationNeedsSystemIntro) {
      const updatedAt = Date.now();
      activeSessionEntry.groupActivationNeedsSystemIntro = false;
      activeSessionEntry.updatedAt = updatedAt;
      activeSessionStore[sessionKey] = activeSessionEntry;
      if (storePath) {
        await (0, _sessions.updateSessionStoreEntry)({
          storePath,
          sessionKey,
          update: async () => ({
            groupActivationNeedsSystemIntro: false,
            updatedAt
          })
        });
      }
    }
    const payloadArray = runResult.payloads ?? [];
    if (blockReplyPipeline) {
      await blockReplyPipeline.flush({ force: true });
      blockReplyPipeline.stop();
    }
    if (pendingToolTasks.size > 0) {
      await Promise.allSettled(pendingToolTasks);
    }
    const usage = runResult.meta.agentMeta?.usage;
    const modelUsed = runResult.meta.agentMeta?.model ?? fallbackModel ?? defaultModel;
    const providerUsed = runResult.meta.agentMeta?.provider ?? fallbackProvider ?? followupRun.run.provider;
    const cliSessionId = (0, _modelSelection.isCliProvider)(providerUsed, cfg) ?
    runResult.meta.agentMeta?.sessionId?.trim() :
    undefined;
    const contextTokensUsed = agentCfgContextTokens ??
    (0, _context.lookupContextTokens)(modelUsed) ??
    activeSessionEntry?.contextTokens ??
    _defaults.DEFAULT_CONTEXT_TOKENS;
    await (0, _sessionUsage.persistSessionUsageUpdate)({
      storePath,
      sessionKey,
      usage,
      modelUsed,
      providerUsed,
      contextTokensUsed,
      systemPromptReport: runResult.meta.systemPromptReport,
      cliSessionId
    });
    // Drain any late tool/block deliveries before deciding there's "nothing to send".
    // Otherwise, a late typing trigger (e.g. from a tool callback) can outlive the run and
    // keep the typing indicator stuck.
    if (payloadArray.length === 0) {
      return (0, _agentRunnerHelpers.finalizeWithFollowup)(undefined, queueKey, runFollowupTurn);
    }
    const payloadResult = (0, _agentRunnerPayloads.buildReplyPayloads)({
      payloads: payloadArray,
      isHeartbeat,
      didLogHeartbeatStrip,
      blockStreamingEnabled,
      blockReplyPipeline,
      directlySentBlockKeys,
      replyToMode,
      replyToChannel,
      currentMessageId: sessionCtx.MessageSidFull ?? sessionCtx.MessageSid,
      messageProvider: followupRun.run.messageProvider,
      messagingToolSentTexts: runResult.messagingToolSentTexts,
      messagingToolSentTargets: runResult.messagingToolSentTargets,
      originatingTo: sessionCtx.OriginatingTo ?? sessionCtx.To,
      accountId: sessionCtx.AccountId
    });
    const { replyPayloads } = payloadResult;
    didLogHeartbeatStrip = payloadResult.didLogHeartbeatStrip;
    if (replyPayloads.length === 0) {
      return (0, _agentRunnerHelpers.finalizeWithFollowup)(undefined, queueKey, runFollowupTurn);
    }
    await (0, _agentRunnerHelpers.signalTypingIfNeeded)(replyPayloads, typingSignals);
    if ((0, _diagnosticEvents.isDiagnosticsEnabled)(cfg) && (0, _usage.hasNonzeroUsage)(usage)) {
      const input = usage.input ?? 0;
      const output = usage.output ?? 0;
      const cacheRead = usage.cacheRead ?? 0;
      const cacheWrite = usage.cacheWrite ?? 0;
      const promptTokens = input + cacheRead + cacheWrite;
      const totalTokens = usage.total ?? promptTokens + output;
      const costConfig = (0, _usageFormat.resolveModelCostConfig)({
        provider: providerUsed,
        model: modelUsed,
        config: cfg
      });
      const costUsd = (0, _usageFormat.estimateUsageCost)({ usage, cost: costConfig });
      (0, _diagnosticEvents.emitDiagnosticEvent)({
        type: "model.usage",
        sessionKey,
        sessionId: followupRun.run.sessionId,
        channel: replyToChannel,
        provider: providerUsed,
        model: modelUsed,
        usage: {
          input,
          output,
          cacheRead,
          cacheWrite,
          promptTokens,
          total: totalTokens
        },
        context: {
          limit: contextTokensUsed,
          used: totalTokens
        },
        costUsd,
        durationMs: Date.now() - runStartedAt
      });
    }
    const responseUsageRaw = activeSessionEntry?.responseUsage ?? (
    sessionKey ? activeSessionStore?.[sessionKey]?.responseUsage : undefined);
    const responseUsageMode = (0, _thinking.resolveResponseUsageMode)(responseUsageRaw);
    if (responseUsageMode !== "off" && (0, _usage.hasNonzeroUsage)(usage)) {
      const authMode = (0, _modelAuth.resolveModelAuthMode)(providerUsed, cfg);
      const showCost = authMode === "api-key";
      const costConfig = showCost ?
      (0, _usageFormat.resolveModelCostConfig)({
        provider: providerUsed,
        model: modelUsed,
        config: cfg
      }) :
      undefined;
      let formatted = (0, _agentRunnerUtils.formatResponseUsageLine)({
        usage,
        showCost,
        costConfig
      });
      if (formatted && responseUsageMode === "full" && sessionKey) {
        formatted = `${formatted} · session ${sessionKey}`;
      }
      if (formatted) {
        responseUsageLine = formatted;
      }
    }
    // If verbose is enabled and this is a new session, prepend a session hint.
    let finalPayloads = replyPayloads;
    const verboseEnabled = resolvedVerboseLevel !== "off";
    if (autoCompactionCompleted) {
      const count = await (0, _sessionUpdates.incrementCompactionCount)({
        sessionEntry: activeSessionEntry,
        sessionStore: activeSessionStore,
        sessionKey,
        storePath
      });
      if (verboseEnabled) {
        const suffix = typeof count === "number" ? ` (count ${count})` : "";
        finalPayloads = [{ text: `🧹 Auto-compaction complete${suffix}.` }, ...finalPayloads];
      }
    }
    if (verboseEnabled && activeIsNewSession) {
      finalPayloads = [{ text: `🧭 New session: ${followupRun.run.sessionId}` }, ...finalPayloads];
    }
    if (responseUsageLine) {
      finalPayloads = (0, _agentRunnerUtils.appendUsageLine)(finalPayloads, responseUsageLine);
    }
    return (0, _agentRunnerHelpers.finalizeWithFollowup)(finalPayloads.length === 1 ? finalPayloads[0] : finalPayloads, queueKey, runFollowupTurn);
  } finally
  {
    blockReplyPipeline?.stop();
    typing.markRunComplete();
  }
} /* v9-719cfad151afeb5a */
