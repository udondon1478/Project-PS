"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.initSessionState = initSessionState;var _piCodingAgent = require("@mariozechner/pi-coding-agent");
var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _agentScope = require("../../agents/agent-scope.js");
var _chatType = require("../../channels/chat-type.js");
var _sessions = require("../../config/sessions.js");
var _sessionKey = require("../../routing/session-key.js");
var _deliveryContext = require("../../utils/delivery-context.js");
var _commandAuth = require("../command-auth.js");
var _inboundSenderMeta = require("./inbound-sender-meta.js");
var _inboundText = require("./inbound-text.js");
var _mentions = require("./mentions.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function forkSessionFromParent(params) {
  const parentSessionFile = (0, _sessions.resolveSessionFilePath)(params.parentEntry.sessionId, params.parentEntry);
  if (!parentSessionFile || !_nodeFs.default.existsSync(parentSessionFile)) {
    return null;
  }
  try {
    const manager = _piCodingAgent.SessionManager.open(parentSessionFile);
    const leafId = manager.getLeafId();
    if (leafId) {
      const sessionFile = manager.createBranchedSession(leafId) ?? manager.getSessionFile();
      const sessionId = manager.getSessionId();
      if (sessionFile && sessionId) {
        return { sessionId, sessionFile };
      }
    }
    const sessionId = _nodeCrypto.default.randomUUID();
    const timestamp = new Date().toISOString();
    const fileTimestamp = timestamp.replace(/[:.]/g, "-");
    const sessionFile = _nodePath.default.join(manager.getSessionDir(), `${fileTimestamp}_${sessionId}.jsonl`);
    const header = {
      type: "session",
      version: _piCodingAgent.CURRENT_SESSION_VERSION,
      id: sessionId,
      timestamp,
      cwd: manager.getCwd(),
      parentSession: parentSessionFile
    };
    _nodeFs.default.writeFileSync(sessionFile, `${JSON.stringify(header)}\n`, "utf-8");
    return { sessionId, sessionFile };
  }
  catch {
    return null;
  }
}
async function initSessionState(params) {
  const { ctx, cfg, commandAuthorized } = params;
  // Native slash commands (Telegram/Discord/Slack) are delivered on a separate
  // "slash session" key, but should mutate the target chat session.
  const targetSessionKey = ctx.CommandSource === "native" ? ctx.CommandTargetSessionKey?.trim() : undefined;
  const sessionCtxForState = targetSessionKey && targetSessionKey !== ctx.SessionKey ?
  { ...ctx, SessionKey: targetSessionKey } :
  ctx;
  const sessionCfg = cfg.session;
  const mainKey = (0, _sessionKey.normalizeMainKey)(sessionCfg?.mainKey);
  const agentId = (0, _agentScope.resolveSessionAgentId)({
    sessionKey: sessionCtxForState.SessionKey,
    config: cfg
  });
  const groupResolution = (0, _sessions.resolveGroupSessionKey)(sessionCtxForState) ?? undefined;
  const resetTriggers = sessionCfg?.resetTriggers?.length ?
  sessionCfg.resetTriggers :
  _sessions.DEFAULT_RESET_TRIGGERS;
  const sessionScope = sessionCfg?.scope ?? "per-sender";
  const storePath = (0, _sessions.resolveStorePath)(sessionCfg?.store, { agentId });
  const sessionStore = (0, _sessions.loadSessionStore)(storePath);
  let sessionKey;
  let sessionEntry;
  let sessionId;
  let isNewSession = false;
  let bodyStripped;
  let systemSent = false;
  let abortedLastRun = false;
  let resetTriggered = false;
  let persistedThinking;
  let persistedVerbose;
  let persistedReasoning;
  let persistedTtsAuto;
  let persistedModelOverride;
  let persistedProviderOverride;
  const normalizedChatType = (0, _chatType.normalizeChatType)(ctx.ChatType);
  const isGroup = normalizedChatType != null && normalizedChatType !== "direct" ? true : Boolean(groupResolution);
  // Prefer CommandBody/RawBody (clean message) for command detection; fall back
  // to Body which may contain structural context (history, sender labels).
  const commandSource = ctx.BodyForCommands ?? ctx.CommandBody ?? ctx.RawBody ?? ctx.Body ?? "";
  // IMPORTANT: do NOT lowercase the entire command body.
  // Users often pass case-sensitive arguments (e.g. filesystem paths on Linux).
  // Command parsing downstream lowercases only the command token for matching.
  const triggerBodyNormalized = (0, _mentions.stripStructuralPrefixes)(commandSource).trim();
  // Use CommandBody/RawBody for reset trigger matching (clean message without structural context).
  const rawBody = commandSource;
  const trimmedBody = rawBody.trim();
  const resetAuthorized = (0, _commandAuth.resolveCommandAuthorization)({
    ctx,
    cfg,
    commandAuthorized
  }).isAuthorizedSender;
  // Timestamp/message prefixes (e.g. "[Dec 4 17:35] ") are added by the
  // web inbox before we get here. They prevented reset triggers like "/new"
  // from matching, so strip structural wrappers when checking for resets.
  const strippedForReset = isGroup ?
  (0, _mentions.stripMentions)(triggerBodyNormalized, ctx, cfg, agentId) :
  triggerBodyNormalized;
  // Reset triggers are configured as lowercased commands (e.g. "/new"), but users may type
  // "/NEW" etc. Match case-insensitively while keeping the original casing for any stripped body.
  const trimmedBodyLower = trimmedBody.toLowerCase();
  const strippedForResetLower = strippedForReset.toLowerCase();
  for (const trigger of resetTriggers) {
    if (!trigger) {
      continue;
    }
    if (!resetAuthorized) {
      break;
    }
    const triggerLower = trigger.toLowerCase();
    if (trimmedBodyLower === triggerLower || strippedForResetLower === triggerLower) {
      isNewSession = true;
      bodyStripped = "";
      resetTriggered = true;
      break;
    }
    const triggerPrefixLower = `${triggerLower} `;
    if (trimmedBodyLower.startsWith(triggerPrefixLower) ||
    strippedForResetLower.startsWith(triggerPrefixLower)) {
      isNewSession = true;
      bodyStripped = strippedForReset.slice(trigger.length).trimStart();
      resetTriggered = true;
      break;
    }
  }
  sessionKey = (0, _sessions.resolveSessionKey)(sessionScope, sessionCtxForState, mainKey);
  const entry = sessionStore[sessionKey];
  const previousSessionEntry = resetTriggered && entry ? { ...entry } : undefined;
  const now = Date.now();
  const isThread = (0, _sessions.resolveThreadFlag)({
    sessionKey,
    messageThreadId: ctx.MessageThreadId,
    threadLabel: ctx.ThreadLabel,
    threadStarterBody: ctx.ThreadStarterBody,
    parentSessionKey: ctx.ParentSessionKey
  });
  const resetType = (0, _sessions.resolveSessionResetType)({ sessionKey, isGroup, isThread });
  const channelReset = (0, _sessions.resolveChannelResetConfig)({
    sessionCfg,
    channel: groupResolution?.channel ??
    ctx.OriginatingChannel ??
    ctx.Surface ??
    ctx.Provider
  });
  const resetPolicy = (0, _sessions.resolveSessionResetPolicy)({
    sessionCfg,
    resetType,
    resetOverride: channelReset
  });
  const freshEntry = entry ?
  (0, _sessions.evaluateSessionFreshness)({ updatedAt: entry.updatedAt, now, policy: resetPolicy }).fresh :
  false;
  if (!isNewSession && freshEntry) {
    sessionId = entry.sessionId;
    systemSent = entry.systemSent ?? false;
    abortedLastRun = entry.abortedLastRun ?? false;
    persistedThinking = entry.thinkingLevel;
    persistedVerbose = entry.verboseLevel;
    persistedReasoning = entry.reasoningLevel;
    persistedTtsAuto = entry.ttsAuto;
    persistedModelOverride = entry.modelOverride;
    persistedProviderOverride = entry.providerOverride;
  } else
  {
    sessionId = _nodeCrypto.default.randomUUID();
    isNewSession = true;
    systemSent = false;
    abortedLastRun = false;
  }
  const baseEntry = !isNewSession && freshEntry ? entry : undefined;
  // Track the originating channel/to for announce routing (subagent announce-back).
  const lastChannelRaw = ctx.OriginatingChannel || baseEntry?.lastChannel;
  const lastToRaw = ctx.OriginatingTo || ctx.To || baseEntry?.lastTo;
  const lastAccountIdRaw = ctx.AccountId || baseEntry?.lastAccountId;
  const lastThreadIdRaw = ctx.MessageThreadId || baseEntry?.lastThreadId;
  const deliveryFields = (0, _deliveryContext.normalizeSessionDeliveryFields)({
    deliveryContext: {
      channel: lastChannelRaw,
      to: lastToRaw,
      accountId: lastAccountIdRaw,
      threadId: lastThreadIdRaw
    }
  });
  const lastChannel = deliveryFields.lastChannel ?? lastChannelRaw;
  const lastTo = deliveryFields.lastTo ?? lastToRaw;
  const lastAccountId = deliveryFields.lastAccountId ?? lastAccountIdRaw;
  const lastThreadId = deliveryFields.lastThreadId ?? lastThreadIdRaw;
  sessionEntry = {
    ...baseEntry,
    sessionId,
    updatedAt: Date.now(),
    systemSent,
    abortedLastRun,
    // Persist previously stored thinking/verbose levels when present.
    thinkingLevel: persistedThinking ?? baseEntry?.thinkingLevel,
    verboseLevel: persistedVerbose ?? baseEntry?.verboseLevel,
    reasoningLevel: persistedReasoning ?? baseEntry?.reasoningLevel,
    ttsAuto: persistedTtsAuto ?? baseEntry?.ttsAuto,
    responseUsage: baseEntry?.responseUsage,
    modelOverride: persistedModelOverride ?? baseEntry?.modelOverride,
    providerOverride: persistedProviderOverride ?? baseEntry?.providerOverride,
    sendPolicy: baseEntry?.sendPolicy,
    queueMode: baseEntry?.queueMode,
    queueDebounceMs: baseEntry?.queueDebounceMs,
    queueCap: baseEntry?.queueCap,
    queueDrop: baseEntry?.queueDrop,
    displayName: baseEntry?.displayName,
    chatType: baseEntry?.chatType,
    channel: baseEntry?.channel,
    groupId: baseEntry?.groupId,
    subject: baseEntry?.subject,
    groupChannel: baseEntry?.groupChannel,
    space: baseEntry?.space,
    deliveryContext: deliveryFields.deliveryContext,
    // Track originating channel for subagent announce routing.
    lastChannel,
    lastTo,
    lastAccountId,
    lastThreadId
  };
  const metaPatch = (0, _sessions.deriveSessionMetaPatch)({
    ctx: sessionCtxForState,
    sessionKey,
    existing: sessionEntry,
    groupResolution
  });
  if (metaPatch) {
    sessionEntry = { ...sessionEntry, ...metaPatch };
  }
  if (!sessionEntry.chatType) {
    sessionEntry.chatType = "direct";
  }
  const threadLabel = ctx.ThreadLabel?.trim();
  if (threadLabel) {
    sessionEntry.displayName = threadLabel;
  }
  const parentSessionKey = ctx.ParentSessionKey?.trim();
  if (isNewSession &&
  parentSessionKey &&
  parentSessionKey !== sessionKey &&
  sessionStore[parentSessionKey]) {
    const forked = forkSessionFromParent({
      parentEntry: sessionStore[parentSessionKey]
    });
    if (forked) {
      sessionId = forked.sessionId;
      sessionEntry.sessionId = forked.sessionId;
      sessionEntry.sessionFile = forked.sessionFile;
    }
  }
  if (!sessionEntry.sessionFile) {
    sessionEntry.sessionFile = (0, _sessions.resolveSessionTranscriptPath)(sessionEntry.sessionId, agentId, ctx.MessageThreadId);
  }
  if (isNewSession) {
    sessionEntry.compactionCount = 0;
    sessionEntry.memoryFlushCompactionCount = undefined;
    sessionEntry.memoryFlushAt = undefined;
  }
  // Preserve per-session overrides while resetting compaction state on /new.
  sessionStore[sessionKey] = { ...sessionStore[sessionKey], ...sessionEntry };
  await (0, _sessions.updateSessionStore)(storePath, (store) => {
    // Preserve per-session overrides while resetting compaction state on /new.
    store[sessionKey] = { ...store[sessionKey], ...sessionEntry };
  });
  const sessionCtx = {
    ...ctx,
    // Keep BodyStripped aligned with Body (best default for agent prompts).
    // RawBody is reserved for command/directive parsing and may omit context.
    BodyStripped: (0, _inboundSenderMeta.formatInboundBodyWithSenderMeta)({
      ctx,
      body: (0, _inboundText.normalizeInboundTextNewlines)(bodyStripped ??
      ctx.BodyForAgent ??
      ctx.Body ??
      ctx.CommandBody ??
      ctx.RawBody ??
      ctx.BodyForCommands ??
      "")
    }),
    SessionId: sessionId,
    IsNewSession: isNewSession ? "true" : "false"
  };
  return {
    sessionCtx,
    sessionEntry,
    previousSessionEntry,
    sessionStore,
    sessionKey,
    sessionId: sessionId ?? _nodeCrypto.default.randomUUID(),
    isNewSession,
    resetTriggered,
    systemSent,
    abortedLastRun,
    storePath,
    sessionScope,
    groupResolution,
    isGroup,
    bodyStripped,
    triggerBodyNormalized
  };
} /* v9-973c3f945ab18d8b */
