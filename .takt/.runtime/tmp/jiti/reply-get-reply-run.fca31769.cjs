"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.runPreparedReply = runPreparedReply;var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _sessionOverride = require("../../agents/auth-profiles/session-override.js");
var _piEmbedded = require("../../agents/pi-embedded.js");
var _sessions = require("../../config/sessions.js");
var _globals = require("../../globals.js");
var _commandQueue = require("../../process/command-queue.js");
var _sessionKey = require("../../routing/session-key.js");
var _providerUtils = require("../../utils/provider-utils.js");
var _commandDetection = require("../command-detection.js");
var _mediaNote = require("../media-note.js");
var _thinking = require("../thinking.js");
var _tokens = require("../tokens.js");
var _agentRunner = require("./agent-runner.js");
var _body = require("./body.js");
var _groups = require("./groups.js");
var _queue = require("./queue.js");
var _routeReply = require("./route-reply.js");
var _sessionUpdates = require("./session-updates.js");
var _typingMode = require("./typing-mode.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const BARE_SESSION_RESET_PROMPT = "A new session was started via /new or /reset. Greet the user in your configured persona, if one is provided. Be yourself - use your defined voice, mannerisms, and mood. Keep it to 1-3 sentences and ask what they want to do. If the runtime model differs from default_model in the system prompt, mention the default model. Do not mention internal steps, files, tools, or reasoning.";
async function runPreparedReply(params) {
  const { ctx, sessionCtx, cfg, agentId, agentDir, agentCfg, sessionCfg, commandAuthorized, command, commandSource, allowTextCommands, directives, defaultActivation, elevatedEnabled, elevatedAllowed, blockStreamingEnabled, blockReplyChunking, resolvedBlockStreamingBreak, modelState, provider, model, perMessageQueueMode, perMessageQueueOptions, typing, opts, defaultProvider, defaultModel, timeoutMs, isNewSession, resetTriggered, systemSent, sessionKey, sessionId, storePath, workspaceDir, sessionStore } = params;
  let { sessionEntry, resolvedThinkLevel, resolvedVerboseLevel, resolvedReasoningLevel, resolvedElevatedLevel, execOverrides, abortedLastRun } = params;
  let currentSystemSent = systemSent;
  const isFirstTurnInSession = isNewSession || !currentSystemSent;
  const isGroupChat = sessionCtx.ChatType === "group";
  const wasMentioned = ctx.WasMentioned === true;
  const isHeartbeat = opts?.isHeartbeat === true;
  const typingMode = (0, _typingMode.resolveTypingMode)({
    configured: sessionCfg?.typingMode ?? agentCfg?.typingMode,
    isGroupChat,
    wasMentioned,
    isHeartbeat
  });
  const shouldInjectGroupIntro = Boolean(isGroupChat && (isFirstTurnInSession || sessionEntry?.groupActivationNeedsSystemIntro));
  const groupIntro = shouldInjectGroupIntro ?
  (0, _groups.buildGroupIntro)({
    cfg,
    sessionCtx,
    sessionEntry,
    defaultActivation,
    silentToken: _tokens.SILENT_REPLY_TOKEN
  }) :
  "";
  const groupSystemPrompt = sessionCtx.GroupSystemPrompt?.trim() ?? "";
  const extraSystemPrompt = [groupIntro, groupSystemPrompt].filter(Boolean).join("\n\n");
  const baseBody = sessionCtx.BodyStripped ?? sessionCtx.Body ?? "";
  // Use CommandBody/RawBody for bare reset detection (clean message without structural context).
  const rawBodyTrimmed = (ctx.CommandBody ?? ctx.RawBody ?? ctx.Body ?? "").trim();
  const baseBodyTrimmedRaw = baseBody.trim();
  if (allowTextCommands && (
  !commandAuthorized || !command.isAuthorizedSender) &&
  !baseBodyTrimmedRaw &&
  (0, _commandDetection.hasControlCommand)(commandSource, cfg)) {
    typing.cleanup();
    return undefined;
  }
  const isBareNewOrReset = rawBodyTrimmed === "/new" || rawBodyTrimmed === "/reset";
  const isBareSessionReset = isNewSession && (
  baseBodyTrimmedRaw.length === 0 && rawBodyTrimmed.length > 0 || isBareNewOrReset);
  const baseBodyFinal = isBareSessionReset ? BARE_SESSION_RESET_PROMPT : baseBody;
  const baseBodyTrimmed = baseBodyFinal.trim();
  if (!baseBodyTrimmed) {
    await typing.onReplyStart();
    (0, _globals.logVerbose)("Inbound body empty after normalization; skipping agent run");
    typing.cleanup();
    return {
      text: "I didn't receive any text in your message. Please resend or add a caption."
    };
  }
  let prefixedBodyBase = await (0, _body.applySessionHints)({
    baseBody: baseBodyFinal,
    abortedLastRun,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    abortKey: command.abortKey,
    messageId: sessionCtx.MessageSid
  });
  const isGroupSession = sessionEntry?.chatType === "group" || sessionEntry?.chatType === "channel";
  const isMainSession = !isGroupSession && sessionKey === (0, _sessionKey.normalizeMainKey)(sessionCfg?.mainKey);
  prefixedBodyBase = await (0, _sessionUpdates.prependSystemEvents)({
    cfg,
    sessionKey,
    isMainSession,
    isNewSession,
    prefixedBodyBase
  });
  const threadStarterBody = ctx.ThreadStarterBody?.trim();
  const threadStarterNote = isNewSession && threadStarterBody ?
  `[Thread starter - for context]\n${threadStarterBody}` :
  undefined;
  const skillResult = await (0, _sessionUpdates.ensureSkillSnapshot)({
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    sessionId,
    isFirstTurnInSession,
    workspaceDir,
    cfg,
    skillFilter: opts?.skillFilter
  });
  sessionEntry = skillResult.sessionEntry ?? sessionEntry;
  currentSystemSent = skillResult.systemSent;
  const skillsSnapshot = skillResult.skillsSnapshot;
  const prefixedBody = [threadStarterNote, prefixedBodyBase].filter(Boolean).join("\n\n");
  const mediaNote = (0, _mediaNote.buildInboundMediaNote)(ctx);
  const mediaReplyHint = mediaNote ?
  "To send an image back, prefer the message tool (media/path/filePath). If you must inline, use MEDIA:https://example.com/image.jpg (spaces ok, quote if needed) or a safe relative path like MEDIA:./image.jpg. Avoid absolute paths (MEDIA:/...) and ~ paths — they are blocked for security. Keep caption in the text body." :
  undefined;
  let prefixedCommandBody = mediaNote ?
  [mediaNote, mediaReplyHint, prefixedBody ?? ""].filter(Boolean).join("\n").trim() :
  prefixedBody;
  if (!resolvedThinkLevel && prefixedCommandBody) {
    const parts = prefixedCommandBody.split(/\s+/);
    const maybeLevel = (0, _thinking.normalizeThinkLevel)(parts[0]);
    if (maybeLevel && (maybeLevel !== "xhigh" || (0, _thinking.supportsXHighThinking)(provider, model))) {
      resolvedThinkLevel = maybeLevel;
      prefixedCommandBody = parts.slice(1).join(" ").trim();
    }
  }
  if (!resolvedThinkLevel) {
    resolvedThinkLevel = await modelState.resolveDefaultThinkingLevel();
  }
  if (resolvedThinkLevel === "xhigh" && !(0, _thinking.supportsXHighThinking)(provider, model)) {
    const explicitThink = directives.hasThinkDirective && directives.thinkLevel !== undefined;
    if (explicitThink) {
      typing.cleanup();
      return {
        text: `Thinking level "xhigh" is only supported for ${(0, _thinking.formatXHighModelHint)()}. Use /think high or switch to one of those models.`
      };
    }
    resolvedThinkLevel = "high";
    if (sessionEntry && sessionStore && sessionKey && sessionEntry.thinkingLevel === "xhigh") {
      sessionEntry.thinkingLevel = "high";
      sessionEntry.updatedAt = Date.now();
      sessionStore[sessionKey] = sessionEntry;
      if (storePath) {
        await (0, _sessions.updateSessionStore)(storePath, (store) => {
          store[sessionKey] = sessionEntry;
        });
      }
    }
  }
  if (resetTriggered && command.isAuthorizedSender) {
    // oxlint-disable-next-line typescript/no-explicit-any
    const channel = ctx.OriginatingChannel || command.channel;
    const to = ctx.OriginatingTo || command.from || command.to;
    if (channel && to) {
      const modelLabel = `${provider}/${model}`;
      const defaultLabel = `${defaultProvider}/${defaultModel}`;
      const text = modelLabel === defaultLabel ?
      `✅ New session started · model: ${modelLabel}` :
      `✅ New session started · model: ${modelLabel} (default: ${defaultLabel})`;
      await (0, _routeReply.routeReply)({
        payload: { text },
        channel,
        to,
        sessionKey,
        accountId: ctx.AccountId,
        threadId: ctx.MessageThreadId,
        cfg
      });
    }
  }
  const sessionIdFinal = sessionId ?? _nodeCrypto.default.randomUUID();
  const sessionFile = (0, _sessions.resolveSessionFilePath)(sessionIdFinal, sessionEntry);
  const queueBodyBase = [threadStarterNote, baseBodyFinal].filter(Boolean).join("\n\n");
  const queueMessageId = sessionCtx.MessageSid?.trim();
  const queueMessageIdHint = queueMessageId ? `[message_id: ${queueMessageId}]` : "";
  const queueBodyWithId = queueMessageIdHint ?
  `${queueBodyBase}\n${queueMessageIdHint}` :
  queueBodyBase;
  const queuedBody = mediaNote ?
  [mediaNote, mediaReplyHint, queueBodyWithId].filter(Boolean).join("\n").trim() :
  queueBodyWithId;
  const resolvedQueue = (0, _queue.resolveQueueSettings)({
    cfg,
    channel: sessionCtx.Provider,
    sessionEntry,
    inlineMode: perMessageQueueMode,
    inlineOptions: perMessageQueueOptions
  });
  const sessionLaneKey = (0, _piEmbedded.resolveEmbeddedSessionLane)(sessionKey ?? sessionIdFinal);
  const laneSize = (0, _commandQueue.getQueueSize)(sessionLaneKey);
  if (resolvedQueue.mode === "interrupt" && laneSize > 0) {
    const cleared = (0, _commandQueue.clearCommandLane)(sessionLaneKey);
    const aborted = (0, _piEmbedded.abortEmbeddedPiRun)(sessionIdFinal);
    (0, _globals.logVerbose)(`Interrupting ${sessionLaneKey} (cleared ${cleared}, aborted=${aborted})`);
  }
  const queueKey = sessionKey ?? sessionIdFinal;
  const isActive = (0, _piEmbedded.isEmbeddedPiRunActive)(sessionIdFinal);
  const isStreaming = (0, _piEmbedded.isEmbeddedPiRunStreaming)(sessionIdFinal);
  const shouldSteer = resolvedQueue.mode === "steer" || resolvedQueue.mode === "steer-backlog";
  const shouldFollowup = resolvedQueue.mode === "followup" ||
  resolvedQueue.mode === "collect" ||
  resolvedQueue.mode === "steer-backlog";
  const authProfileId = await (0, _sessionOverride.resolveSessionAuthProfileOverride)({
    cfg,
    provider,
    agentDir,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    isNewSession
  });
  const authProfileIdSource = sessionEntry?.authProfileOverrideSource;
  const followupRun = {
    prompt: queuedBody,
    messageId: sessionCtx.MessageSidFull ?? sessionCtx.MessageSid,
    summaryLine: baseBodyTrimmedRaw,
    enqueuedAt: Date.now(),
    // Originating channel for reply routing.
    originatingChannel: ctx.OriginatingChannel,
    originatingTo: ctx.OriginatingTo,
    originatingAccountId: ctx.AccountId,
    originatingThreadId: ctx.MessageThreadId,
    originatingChatType: ctx.ChatType,
    run: {
      agentId,
      agentDir,
      sessionId: sessionIdFinal,
      sessionKey,
      messageProvider: sessionCtx.Provider?.trim().toLowerCase() || undefined,
      agentAccountId: sessionCtx.AccountId,
      groupId: (0, _sessions.resolveGroupSessionKey)(sessionCtx)?.id ?? undefined,
      groupChannel: sessionCtx.GroupChannel?.trim() ?? sessionCtx.GroupSubject?.trim(),
      groupSpace: sessionCtx.GroupSpace?.trim() ?? undefined,
      senderId: sessionCtx.SenderId?.trim() || undefined,
      senderName: sessionCtx.SenderName?.trim() || undefined,
      senderUsername: sessionCtx.SenderUsername?.trim() || undefined,
      senderE164: sessionCtx.SenderE164?.trim() || undefined,
      sessionFile,
      workspaceDir,
      config: cfg,
      skillsSnapshot,
      provider,
      model,
      authProfileId,
      authProfileIdSource,
      thinkLevel: resolvedThinkLevel,
      verboseLevel: resolvedVerboseLevel,
      reasoningLevel: resolvedReasoningLevel,
      elevatedLevel: resolvedElevatedLevel,
      execOverrides,
      bashElevated: {
        enabled: elevatedEnabled,
        allowed: elevatedAllowed,
        defaultLevel: resolvedElevatedLevel ?? "off"
      },
      timeoutMs,
      blockReplyBreak: resolvedBlockStreamingBreak,
      ownerNumbers: command.ownerList.length > 0 ? command.ownerList : undefined,
      extraSystemPrompt: extraSystemPrompt || undefined,
      ...((0, _providerUtils.isReasoningTagProvider)(provider) ? { enforceFinalTag: true } : {})
    }
  };
  return (0, _agentRunner.runReplyAgent)({
    commandBody: prefixedCommandBody,
    followupRun,
    queueKey,
    resolvedQueue,
    shouldSteer,
    shouldFollowup,
    isActive,
    isStreaming,
    opts,
    typing,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    defaultModel,
    agentCfgContextTokens: agentCfg?.contextTokens,
    resolvedVerboseLevel: resolvedVerboseLevel ?? "off",
    isNewSession,
    blockStreamingEnabled,
    blockReplyChunking,
    resolvedBlockStreamingBreak,
    sessionCtx,
    shouldInjectGroupIntro,
    typingMode
  });
} /* v9-6604ba2b9bd2c964 */
