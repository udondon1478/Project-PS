"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.dispatchReplyFromConfig = dispatchReplyFromConfig;var _agentScope = require("../../agents/agent-scope.js");
var _sessions = require("../../config/sessions.js");
var _globals = require("../../globals.js");
var _diagnosticEvents = require("../../infra/diagnostic-events.js");
var _diagnostic = require("../../logging/diagnostic.js");
var _hookRunnerGlobal = require("../../plugins/hook-runner-global.js");
var _tts = require("../../tts/tts.js");
var _reply = require("../reply.js");
var _abort = require("./abort.js");
var _inboundDedupe = require("./inbound-dedupe.js");
var _routeReply = require("./route-reply.js");
const AUDIO_PLACEHOLDER_RE = /^<media:audio>(\s*\([^)]*\))?$/i;
const AUDIO_HEADER_RE = /^\[Audio\b/i;
const normalizeMediaType = (value) => value.split(";")[0]?.trim().toLowerCase();
const isInboundAudioContext = (ctx) => {
  const rawTypes = [
  typeof ctx.MediaType === "string" ? ctx.MediaType : undefined,
  ...(Array.isArray(ctx.MediaTypes) ? ctx.MediaTypes : [])].
  filter(Boolean);
  const types = rawTypes.map((type) => normalizeMediaType(type));
  if (types.some((type) => type === "audio" || type.startsWith("audio/"))) {
    return true;
  }
  const body = typeof ctx.BodyForCommands === "string" ?
  ctx.BodyForCommands :
  typeof ctx.CommandBody === "string" ?
  ctx.CommandBody :
  typeof ctx.RawBody === "string" ?
  ctx.RawBody :
  typeof ctx.Body === "string" ?
  ctx.Body :
  "";
  const trimmed = body.trim();
  if (!trimmed) {
    return false;
  }
  if (AUDIO_PLACEHOLDER_RE.test(trimmed)) {
    return true;
  }
  return AUDIO_HEADER_RE.test(trimmed);
};
const resolveSessionTtsAuto = (ctx, cfg) => {
  const targetSessionKey = ctx.CommandSource === "native" ? ctx.CommandTargetSessionKey?.trim() : undefined;
  const sessionKey = (targetSessionKey ?? ctx.SessionKey)?.trim();
  if (!sessionKey) {
    return undefined;
  }
  const agentId = (0, _agentScope.resolveSessionAgentId)({ sessionKey, config: cfg });
  const storePath = (0, _sessions.resolveStorePath)(cfg.session?.store, { agentId });
  try {
    const store = (0, _sessions.loadSessionStore)(storePath);
    const entry = store[sessionKey.toLowerCase()] ?? store[sessionKey];
    return (0, _tts.normalizeTtsAutoMode)(entry?.ttsAuto);
  }
  catch {
    return undefined;
  }
};
async function dispatchReplyFromConfig(params) {
  const { ctx, cfg, dispatcher } = params;
  const diagnosticsEnabled = (0, _diagnosticEvents.isDiagnosticsEnabled)(cfg);
  const channel = String(ctx.Surface ?? ctx.Provider ?? "unknown").toLowerCase();
  const chatId = ctx.To ?? ctx.From;
  const messageId = ctx.MessageSid ?? ctx.MessageSidFirst ?? ctx.MessageSidLast;
  const sessionKey = ctx.SessionKey;
  const startTime = diagnosticsEnabled ? Date.now() : 0;
  const canTrackSession = diagnosticsEnabled && Boolean(sessionKey);
  const recordProcessed = (outcome, opts) => {
    if (!diagnosticsEnabled) {
      return;
    }
    (0, _diagnostic.logMessageProcessed)({
      channel,
      chatId,
      messageId,
      sessionKey,
      durationMs: Date.now() - startTime,
      outcome,
      reason: opts?.reason,
      error: opts?.error
    });
  };
  const markProcessing = () => {
    if (!canTrackSession || !sessionKey) {
      return;
    }
    (0, _diagnostic.logMessageQueued)({ sessionKey, channel, source: "dispatch" });
    (0, _diagnostic.logSessionStateChange)({
      sessionKey,
      state: "processing",
      reason: "message_start"
    });
  };
  const markIdle = (reason) => {
    if (!canTrackSession || !sessionKey) {
      return;
    }
    (0, _diagnostic.logSessionStateChange)({
      sessionKey,
      state: "idle",
      reason
    });
  };
  if ((0, _inboundDedupe.shouldSkipDuplicateInbound)(ctx)) {
    recordProcessed("skipped", { reason: "duplicate" });
    return { queuedFinal: false, counts: dispatcher.getQueuedCounts() };
  }
  const inboundAudio = isInboundAudioContext(ctx);
  const sessionTtsAuto = resolveSessionTtsAuto(ctx, cfg);
  const hookRunner = (0, _hookRunnerGlobal.getGlobalHookRunner)();
  if (hookRunner?.hasHooks("message_received")) {
    const timestamp = typeof ctx.Timestamp === "number" && Number.isFinite(ctx.Timestamp) ?
    ctx.Timestamp :
    undefined;
    const messageIdForHook = ctx.MessageSidFull ?? ctx.MessageSid ?? ctx.MessageSidFirst ?? ctx.MessageSidLast;
    const content = typeof ctx.BodyForCommands === "string" ?
    ctx.BodyForCommands :
    typeof ctx.RawBody === "string" ?
    ctx.RawBody :
    typeof ctx.Body === "string" ?
    ctx.Body :
    "";
    const channelId = (ctx.OriginatingChannel ?? ctx.Surface ?? ctx.Provider ?? "").toLowerCase();
    const conversationId = ctx.OriginatingTo ?? ctx.To ?? ctx.From ?? undefined;
    void hookRunner.
    runMessageReceived({
      from: ctx.From ?? "",
      content,
      timestamp,
      metadata: {
        to: ctx.To,
        provider: ctx.Provider,
        surface: ctx.Surface,
        threadId: ctx.MessageThreadId,
        originatingChannel: ctx.OriginatingChannel,
        originatingTo: ctx.OriginatingTo,
        messageId: messageIdForHook,
        senderId: ctx.SenderId,
        senderName: ctx.SenderName,
        senderUsername: ctx.SenderUsername,
        senderE164: ctx.SenderE164
      }
    }, {
      channelId,
      accountId: ctx.AccountId,
      conversationId
    }).
    catch((err) => {
      (0, _globals.logVerbose)(`dispatch-from-config: message_received hook failed: ${String(err)}`);
    });
  }
  // Check if we should route replies to originating channel instead of dispatcher.
  // Only route when the originating channel is DIFFERENT from the current surface.
  // This handles cross-provider routing (e.g., message from Telegram being processed
  // by a shared session that's currently on Slack) while preserving normal dispatcher
  // flow when the provider handles its own messages.
  //
  // Debug: `pnpm test src/auto-reply/reply/dispatch-from-config.test.ts`
  const originatingChannel = ctx.OriginatingChannel;
  const originatingTo = ctx.OriginatingTo;
  const currentSurface = (ctx.Surface ?? ctx.Provider)?.toLowerCase();
  const shouldRouteToOriginating = (0, _routeReply.isRoutableChannel)(originatingChannel) && originatingTo && originatingChannel !== currentSurface;
  const ttsChannel = shouldRouteToOriginating ? originatingChannel : currentSurface;
  /**
   * Helper to send a payload via route-reply (async).
   * Only used when actually routing to a different provider.
   * Note: Only called when shouldRouteToOriginating is true, so
   * originatingChannel and originatingTo are guaranteed to be defined.
   */
  const sendPayloadAsync = async (payload, abortSignal, mirror) => {
    // TypeScript doesn't narrow these from the shouldRouteToOriginating check,
    // but they're guaranteed non-null when this function is called.
    if (!originatingChannel || !originatingTo) {
      return;
    }
    if (abortSignal?.aborted) {
      return;
    }
    const result = await (0, _routeReply.routeReply)({
      payload,
      channel: originatingChannel,
      to: originatingTo,
      sessionKey: ctx.SessionKey,
      accountId: ctx.AccountId,
      threadId: ctx.MessageThreadId,
      cfg,
      abortSignal,
      mirror
    });
    if (!result.ok) {
      (0, _globals.logVerbose)(`dispatch-from-config: route-reply failed: ${result.error ?? "unknown error"}`);
    }
  };
  markProcessing();
  try {
    const fastAbort = await (0, _abort.tryFastAbortFromMessage)({ ctx, cfg });
    if (fastAbort.handled) {
      const payload = {
        text: (0, _abort.formatAbortReplyText)(fastAbort.stoppedSubagents)
      };
      let queuedFinal = false;
      let routedFinalCount = 0;
      if (shouldRouteToOriginating && originatingChannel && originatingTo) {
        const result = await (0, _routeReply.routeReply)({
          payload,
          channel: originatingChannel,
          to: originatingTo,
          sessionKey: ctx.SessionKey,
          accountId: ctx.AccountId,
          threadId: ctx.MessageThreadId,
          cfg
        });
        queuedFinal = result.ok;
        if (result.ok) {
          routedFinalCount += 1;
        }
        if (!result.ok) {
          (0, _globals.logVerbose)(`dispatch-from-config: route-reply (abort) failed: ${result.error ?? "unknown error"}`);
        }
      } else
      {
        queuedFinal = dispatcher.sendFinalReply(payload);
      }
      await dispatcher.waitForIdle();
      const counts = dispatcher.getQueuedCounts();
      counts.final += routedFinalCount;
      recordProcessed("completed", { reason: "fast_abort" });
      markIdle("message_completed");
      return { queuedFinal, counts };
    }
    // Track accumulated block text for TTS generation after streaming completes.
    // When block streaming succeeds, there's no final reply, so we need to generate
    // TTS audio separately from the accumulated block content.
    let accumulatedBlockText = "";
    let blockCount = 0;
    const replyResult = await (params.replyResolver ?? _reply.getReplyFromConfig)(ctx, {
      ...params.replyOptions,
      onToolResult: ctx.ChatType !== "group" && ctx.CommandSource !== "native" ?
      (payload) => {
        const run = async () => {
          const ttsPayload = await (0, _tts.maybeApplyTtsToPayload)({
            payload,
            cfg,
            channel: ttsChannel,
            kind: "tool",
            inboundAudio,
            ttsAuto: sessionTtsAuto
          });
          if (shouldRouteToOriginating) {
            await sendPayloadAsync(ttsPayload, undefined, false);
          } else
          {
            dispatcher.sendToolResult(ttsPayload);
          }
        };
        return run();
      } :
      undefined,
      onBlockReply: (payload, context) => {
        const run = async () => {
          // Accumulate block text for TTS generation after streaming
          if (payload.text) {
            if (accumulatedBlockText.length > 0) {
              accumulatedBlockText += "\n";
            }
            accumulatedBlockText += payload.text;
            blockCount++;
          }
          const ttsPayload = await (0, _tts.maybeApplyTtsToPayload)({
            payload,
            cfg,
            channel: ttsChannel,
            kind: "block",
            inboundAudio,
            ttsAuto: sessionTtsAuto
          });
          if (shouldRouteToOriginating) {
            await sendPayloadAsync(ttsPayload, context?.abortSignal, false);
          } else
          {
            dispatcher.sendBlockReply(ttsPayload);
          }
        };
        return run();
      }
    }, cfg);
    const replies = replyResult ? Array.isArray(replyResult) ? replyResult : [replyResult] : [];
    let queuedFinal = false;
    let routedFinalCount = 0;
    for (const reply of replies) {
      const ttsReply = await (0, _tts.maybeApplyTtsToPayload)({
        payload: reply,
        cfg,
        channel: ttsChannel,
        kind: "final",
        inboundAudio,
        ttsAuto: sessionTtsAuto
      });
      if (shouldRouteToOriginating && originatingChannel && originatingTo) {
        // Route final reply to originating channel.
        const result = await (0, _routeReply.routeReply)({
          payload: ttsReply,
          channel: originatingChannel,
          to: originatingTo,
          sessionKey: ctx.SessionKey,
          accountId: ctx.AccountId,
          threadId: ctx.MessageThreadId,
          cfg
        });
        if (!result.ok) {
          (0, _globals.logVerbose)(`dispatch-from-config: route-reply (final) failed: ${result.error ?? "unknown error"}`);
        }
        queuedFinal = result.ok || queuedFinal;
        if (result.ok) {
          routedFinalCount += 1;
        }
      } else
      {
        queuedFinal = dispatcher.sendFinalReply(ttsReply) || queuedFinal;
      }
    }
    const ttsMode = (0, _tts.resolveTtsConfig)(cfg).mode ?? "final";
    // Generate TTS-only reply after block streaming completes (when there's no final reply).
    // This handles the case where block streaming succeeds and drops final payloads,
    // but we still want TTS audio to be generated from the accumulated block content.
    if (ttsMode === "final" &&
    replies.length === 0 &&
    blockCount > 0 &&
    accumulatedBlockText.trim()) {
      try {
        const ttsSyntheticReply = await (0, _tts.maybeApplyTtsToPayload)({
          payload: { text: accumulatedBlockText },
          cfg,
          channel: ttsChannel,
          kind: "final",
          inboundAudio,
          ttsAuto: sessionTtsAuto
        });
        // Only send if TTS was actually applied (mediaUrl exists)
        if (ttsSyntheticReply.mediaUrl) {
          // Send TTS-only payload (no text, just audio) so it doesn't duplicate the block content
          const ttsOnlyPayload = {
            mediaUrl: ttsSyntheticReply.mediaUrl,
            audioAsVoice: ttsSyntheticReply.audioAsVoice
          };
          if (shouldRouteToOriginating && originatingChannel && originatingTo) {
            const result = await (0, _routeReply.routeReply)({
              payload: ttsOnlyPayload,
              channel: originatingChannel,
              to: originatingTo,
              sessionKey: ctx.SessionKey,
              accountId: ctx.AccountId,
              threadId: ctx.MessageThreadId,
              cfg
            });
            queuedFinal = result.ok || queuedFinal;
            if (result.ok) {
              routedFinalCount += 1;
            }
            if (!result.ok) {
              (0, _globals.logVerbose)(`dispatch-from-config: route-reply (tts-only) failed: ${result.error ?? "unknown error"}`);
            }
          } else
          {
            const didQueue = dispatcher.sendFinalReply(ttsOnlyPayload);
            queuedFinal = didQueue || queuedFinal;
          }
        }
      }
      catch (err) {
        (0, _globals.logVerbose)(`dispatch-from-config: accumulated block TTS failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    await dispatcher.waitForIdle();
    const counts = dispatcher.getQueuedCounts();
    counts.final += routedFinalCount;
    recordProcessed("completed");
    markIdle("message_completed");
    return { queuedFinal, counts };
  }
  catch (err) {
    recordProcessed("error", { error: String(err) });
    markIdle("message_error");
    throw err;
  }
} /* v9-a6de9d127b2cacca */
