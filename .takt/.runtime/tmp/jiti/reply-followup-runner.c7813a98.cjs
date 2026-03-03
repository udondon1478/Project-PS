"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createFollowupRunner = createFollowupRunner;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _agentScope = require("../../agents/agent-scope.js");
var _context = require("../../agents/context.js");
var _defaults = require("../../agents/defaults.js");
var _modelFallback = require("../../agents/model-fallback.js");
var _piEmbedded = require("../../agents/pi-embedded.js");
var _sessions = require("../../config/sessions.js");
var _globals = require("../../globals.js");
var _agentEvents = require("../../infra/agent-events.js");
var _runtime = require("../../runtime.js");
var _heartbeat = require("../heartbeat.js");
var _tokens = require("../tokens.js");
var _replyPayloads = require("./reply-payloads.js");
var _replyThreading = require("./reply-threading.js");
var _routeReply = require("./route-reply.js");
var _sessionUpdates = require("./session-updates.js");
var _sessionUsage = require("./session-usage.js");
var _typingMode = require("./typing-mode.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function createFollowupRunner(params) {
  const { opts, typing, typingMode, sessionEntry, sessionStore, sessionKey, storePath, defaultModel, agentCfgContextTokens } = params;
  const typingSignals = (0, _typingMode.createTypingSignaler)({
    typing,
    mode: typingMode,
    isHeartbeat: opts?.isHeartbeat === true
  });
  /**
   * Sends followup payloads, routing to the originating channel if set.
   *
   * When originatingChannel/originatingTo are set on the queued run,
   * replies are routed directly to that provider instead of using the
   * session's current dispatcher. This ensures replies go back to
   * where the message originated.
   */
  const sendFollowupPayloads = async (payloads, queued) => {
    // Check if we should route to originating channel.
    const { originatingChannel, originatingTo } = queued;
    const shouldRouteToOriginating = (0, _routeReply.isRoutableChannel)(originatingChannel) && originatingTo;
    if (!shouldRouteToOriginating && !opts?.onBlockReply) {
      (0, _globals.logVerbose)("followup queue: no onBlockReply handler; dropping payloads");
      return;
    }
    for (const payload of payloads) {
      if (!payload?.text && !payload?.mediaUrl && !payload?.mediaUrls?.length) {
        continue;
      }
      if ((0, _tokens.isSilentReplyText)(payload.text, _tokens.SILENT_REPLY_TOKEN) &&
      !payload.mediaUrl &&
      !payload.mediaUrls?.length) {
        continue;
      }
      await typingSignals.signalTextDelta(payload.text);
      // Route to originating channel if set, otherwise fall back to dispatcher.
      if (shouldRouteToOriginating) {
        const result = await (0, _routeReply.routeReply)({
          payload,
          channel: originatingChannel,
          to: originatingTo,
          sessionKey: queued.run.sessionKey,
          accountId: queued.originatingAccountId,
          threadId: queued.originatingThreadId,
          cfg: queued.run.config
        });
        if (!result.ok) {
          // Log error and fall back to dispatcher if available.
          const errorMsg = result.error ?? "unknown error";
          (0, _globals.logVerbose)(`followup queue: route-reply failed: ${errorMsg}`);
          // Fallback: try the dispatcher if routing failed.
          if (opts?.onBlockReply) {
            await opts.onBlockReply(payload);
          }
        }
      } else
      if (opts?.onBlockReply) {
        await opts.onBlockReply(payload);
      }
    }
  };
  return async (queued) => {
    try {
      const runId = _nodeCrypto.default.randomUUID();
      if (queued.run.sessionKey) {
        (0, _agentEvents.registerAgentRunContext)(runId, {
          sessionKey: queued.run.sessionKey,
          verboseLevel: queued.run.verboseLevel
        });
      }
      let autoCompactionCompleted = false;
      let runResult;
      let fallbackProvider = queued.run.provider;
      let fallbackModel = queued.run.model;
      try {
        const fallbackResult = await (0, _modelFallback.runWithModelFallback)({
          cfg: queued.run.config,
          provider: queued.run.provider,
          model: queued.run.model,
          agentDir: queued.run.agentDir,
          fallbacksOverride: (0, _agentScope.resolveAgentModelFallbacksOverride)(queued.run.config, (0, _sessions.resolveAgentIdFromSessionKey)(queued.run.sessionKey)),
          run: (provider, model) => {
            const authProfileId = provider === queued.run.provider ? queued.run.authProfileId : undefined;
            return (0, _piEmbedded.runEmbeddedPiAgent)({
              sessionId: queued.run.sessionId,
              sessionKey: queued.run.sessionKey,
              messageProvider: queued.run.messageProvider,
              agentAccountId: queued.run.agentAccountId,
              messageTo: queued.originatingTo,
              messageThreadId: queued.originatingThreadId,
              groupId: queued.run.groupId,
              groupChannel: queued.run.groupChannel,
              groupSpace: queued.run.groupSpace,
              senderId: queued.run.senderId,
              senderName: queued.run.senderName,
              senderUsername: queued.run.senderUsername,
              senderE164: queued.run.senderE164,
              sessionFile: queued.run.sessionFile,
              workspaceDir: queued.run.workspaceDir,
              config: queued.run.config,
              skillsSnapshot: queued.run.skillsSnapshot,
              prompt: queued.prompt,
              extraSystemPrompt: queued.run.extraSystemPrompt,
              ownerNumbers: queued.run.ownerNumbers,
              enforceFinalTag: queued.run.enforceFinalTag,
              provider,
              model,
              authProfileId,
              authProfileIdSource: authProfileId ? queued.run.authProfileIdSource : undefined,
              thinkLevel: queued.run.thinkLevel,
              verboseLevel: queued.run.verboseLevel,
              reasoningLevel: queued.run.reasoningLevel,
              execOverrides: queued.run.execOverrides,
              bashElevated: queued.run.bashElevated,
              timeoutMs: queued.run.timeoutMs,
              runId,
              blockReplyBreak: queued.run.blockReplyBreak,
              onAgentEvent: (evt) => {
                if (evt.stream !== "compaction") {
                  return;
                }
                const phase = typeof evt.data.phase === "string" ? evt.data.phase : "";
                const willRetry = Boolean(evt.data.willRetry);
                if (phase === "end" && !willRetry) {
                  autoCompactionCompleted = true;
                }
              }
            });
          }
        });
        runResult = fallbackResult.result;
        fallbackProvider = fallbackResult.provider;
        fallbackModel = fallbackResult.model;
      }
      catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        _runtime.defaultRuntime.error?.(`Followup agent failed before reply: ${message}`);
        return;
      }
      if (storePath && sessionKey) {
        const usage = runResult.meta.agentMeta?.usage;
        const modelUsed = runResult.meta.agentMeta?.model ?? fallbackModel ?? defaultModel;
        const contextTokensUsed = agentCfgContextTokens ??
        (0, _context.lookupContextTokens)(modelUsed) ??
        sessionEntry?.contextTokens ??
        _defaults.DEFAULT_CONTEXT_TOKENS;
        await (0, _sessionUsage.persistSessionUsageUpdate)({
          storePath,
          sessionKey,
          usage,
          modelUsed,
          providerUsed: fallbackProvider,
          contextTokensUsed,
          logLabel: "followup"
        });
      }
      const payloadArray = runResult.payloads ?? [];
      if (payloadArray.length === 0) {
        return;
      }
      const sanitizedPayloads = payloadArray.flatMap((payload) => {
        const text = payload.text;
        if (!text || !text.includes("HEARTBEAT_OK")) {
          return [payload];
        }
        const stripped = (0, _heartbeat.stripHeartbeatToken)(text, { mode: "message" });
        const hasMedia = Boolean(payload.mediaUrl) || (payload.mediaUrls?.length ?? 0) > 0;
        if (stripped.shouldSkip && !hasMedia) {
          return [];
        }
        return [{ ...payload, text: stripped.text }];
      });
      const replyToChannel = queued.originatingChannel ??
      queued.run.messageProvider?.toLowerCase();
      const replyToMode = (0, _replyThreading.resolveReplyToMode)(queued.run.config, replyToChannel, queued.originatingAccountId, queued.originatingChatType);
      const replyTaggedPayloads = (0, _replyPayloads.applyReplyThreading)({
        payloads: sanitizedPayloads,
        replyToMode,
        replyToChannel
      });
      const dedupedPayloads = (0, _replyPayloads.filterMessagingToolDuplicates)({
        payloads: replyTaggedPayloads,
        sentTexts: runResult.messagingToolSentTexts ?? []
      });
      const suppressMessagingToolReplies = (0, _replyPayloads.shouldSuppressMessagingToolReplies)({
        messageProvider: queued.run.messageProvider,
        messagingToolSentTargets: runResult.messagingToolSentTargets,
        originatingTo: queued.originatingTo,
        accountId: queued.run.agentAccountId
      });
      const finalPayloads = suppressMessagingToolReplies ? [] : dedupedPayloads;
      if (finalPayloads.length === 0) {
        return;
      }
      if (autoCompactionCompleted) {
        const count = await (0, _sessionUpdates.incrementCompactionCount)({
          sessionEntry,
          sessionStore,
          sessionKey,
          storePath
        });
        if (queued.run.verboseLevel && queued.run.verboseLevel !== "off") {
          const suffix = typeof count === "number" ? ` (count ${count})` : "";
          finalPayloads.unshift({
            text: `🧹 Auto-compaction complete${suffix}.`
          });
        }
      }
      await sendFollowupPayloads(finalPayloads, queued);
    } finally
    {
      typing.markRunComplete();
    }
  };
} /* v9-09e26b92b78d5da8 */
