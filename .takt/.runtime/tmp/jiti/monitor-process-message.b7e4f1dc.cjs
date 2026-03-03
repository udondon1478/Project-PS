"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.processMessage = processMessage;var _identity = require("../../../agents/identity.js");
var _chunk = require("../../../auto-reply/chunk.js");
var _commandDetection = require("../../../auto-reply/command-detection.js");
var _envelope = require("../../../auto-reply/envelope.js");
var _history = require("../../../auto-reply/reply/history.js");
var _inboundContext = require("../../../auto-reply/reply/inbound-context.js");
var _providerDispatcher = require("../../../auto-reply/reply/provider-dispatcher.js");
var _location = require("../../../channels/location.js");
var _replyPrefix = require("../../../channels/reply-prefix.js");
var _markdownTables = require("../../../config/markdown-tables.js");
var _sessions = require("../../../config/sessions.js");
var _globals = require("../../../globals.js");
var _pairingStore = require("../../../pairing/pairing-store.js");
var _utils = require("../../../utils.js");
var _reconnect = require("../../reconnect.js");
var _session = require("../../session.js");
var _deliverReply = require("../deliver-reply.js");
var _loggers = require("../loggers.js");
var _util = require("../util.js");
var _ackReaction = require("./ack-reaction.js");
var _groupMembers = require("./group-members.js");
var _lastRoute = require("./last-route.js");
var _messageLine = require("./message-line.js");
function normalizeAllowFromE164(values) {
  const list = Array.isArray(values) ? values : [];
  return list.
  map((entry) => String(entry).trim()).
  filter((entry) => entry && entry !== "*").
  map((entry) => (0, _utils.normalizeE164)(entry)).
  filter((entry) => Boolean(entry));
}
async function resolveWhatsAppCommandAuthorized(params) {
  const useAccessGroups = params.cfg.commands?.useAccessGroups !== false;
  if (!useAccessGroups) {
    return true;
  }
  const isGroup = params.msg.chatType === "group";
  const senderE164 = (0, _utils.normalizeE164)(isGroup ? params.msg.senderE164 ?? "" : params.msg.senderE164 ?? params.msg.from ?? "");
  if (!senderE164) {
    return false;
  }
  const configuredAllowFrom = params.cfg.channels?.whatsapp?.allowFrom ?? [];
  const configuredGroupAllowFrom = params.cfg.channels?.whatsapp?.groupAllowFrom ?? (
  configuredAllowFrom.length > 0 ? configuredAllowFrom : undefined);
  if (isGroup) {
    if (!configuredGroupAllowFrom || configuredGroupAllowFrom.length === 0) {
      return false;
    }
    if (configuredGroupAllowFrom.some((v) => String(v).trim() === "*")) {
      return true;
    }
    return normalizeAllowFromE164(configuredGroupAllowFrom).includes(senderE164);
  }
  const storeAllowFrom = await (0, _pairingStore.readChannelAllowFromStore)("whatsapp").catch(() => []);
  const combinedAllowFrom = Array.from(new Set([...(configuredAllowFrom ?? []), ...storeAllowFrom]));
  const allowFrom = combinedAllowFrom.length > 0 ?
  combinedAllowFrom :
  params.msg.selfE164 ?
  [params.msg.selfE164] :
  [];
  if (allowFrom.some((v) => String(v).trim() === "*")) {
    return true;
  }
  return normalizeAllowFromE164(allowFrom).includes(senderE164);
}
async function processMessage(params) {
  const conversationId = params.msg.conversationId ?? params.msg.from;
  const storePath = (0, _sessions.resolveStorePath)(params.cfg.session?.store, {
    agentId: params.route.agentId
  });
  const envelopeOptions = (0, _envelope.resolveEnvelopeFormatOptions)(params.cfg);
  const previousTimestamp = (0, _sessions.readSessionUpdatedAt)({
    storePath,
    sessionKey: params.route.sessionKey
  });
  let combinedBody = (0, _messageLine.buildInboundLine)({
    cfg: params.cfg,
    msg: params.msg,
    agentId: params.route.agentId,
    previousTimestamp,
    envelope: envelopeOptions
  });
  let shouldClearGroupHistory = false;
  if (params.msg.chatType === "group") {
    const history = params.groupHistory ?? params.groupHistories.get(params.groupHistoryKey) ?? [];
    if (history.length > 0) {
      const historyEntries = history.map((m) => ({
        sender: m.sender,
        body: m.body,
        timestamp: m.timestamp,
        messageId: m.id
      }));
      combinedBody = (0, _history.buildHistoryContextFromEntries)({
        entries: historyEntries,
        currentMessage: combinedBody,
        excludeLast: false,
        formatEntry: (entry) => {
          const bodyWithId = entry.messageId ?
          `${entry.body}\n[message_id: ${entry.messageId}]` :
          entry.body;
          return (0, _envelope.formatInboundEnvelope)({
            channel: "WhatsApp",
            from: conversationId,
            timestamp: entry.timestamp,
            body: bodyWithId,
            chatType: "group",
            senderLabel: entry.sender,
            envelope: envelopeOptions
          });
        }
      });
    }
    shouldClearGroupHistory = !(params.suppressGroupHistoryClear ?? false);
  }
  // Echo detection uses combined body so we don't respond twice.
  const combinedEchoKey = params.buildCombinedEchoKey({
    sessionKey: params.route.sessionKey,
    combinedBody
  });
  if (params.echoHas(combinedEchoKey)) {
    (0, _globals.logVerbose)("Skipping auto-reply: detected echo for combined message");
    params.echoForget(combinedEchoKey);
    return false;
  }
  // Send ack reaction immediately upon message receipt (post-gating)
  (0, _ackReaction.maybeSendAckReaction)({
    cfg: params.cfg,
    msg: params.msg,
    agentId: params.route.agentId,
    sessionKey: params.route.sessionKey,
    conversationId,
    verbose: params.verbose,
    accountId: params.route.accountId,
    info: params.replyLogger.info.bind(params.replyLogger),
    warn: params.replyLogger.warn.bind(params.replyLogger)
  });
  const correlationId = params.msg.id ?? (0, _reconnect.newConnectionId)();
  params.replyLogger.info({
    connectionId: params.connectionId,
    correlationId,
    from: params.msg.chatType === "group" ? conversationId : params.msg.from,
    to: params.msg.to,
    body: (0, _util.elide)(combinedBody, 240),
    mediaType: params.msg.mediaType ?? null,
    mediaPath: params.msg.mediaPath ?? null
  }, "inbound web message");
  const fromDisplay = params.msg.chatType === "group" ? conversationId : params.msg.from;
  const kindLabel = params.msg.mediaType ? `, ${params.msg.mediaType}` : "";
  _loggers.whatsappInboundLog.info(`Inbound message ${fromDisplay} -> ${params.msg.to} (${params.msg.chatType}${kindLabel}, ${combinedBody.length} chars)`);
  if ((0, _globals.shouldLogVerbose)()) {
    _loggers.whatsappInboundLog.debug(`Inbound body: ${(0, _util.elide)(combinedBody, 400)}`);
  }
  const dmRouteTarget = params.msg.chatType !== "group" ?
  (() => {
    if (params.msg.senderE164) {
      return (0, _utils.normalizeE164)(params.msg.senderE164);
    }
    // In direct chats, `msg.from` is already the canonical conversation id.
    if (params.msg.from.includes("@")) {
      return (0, _utils.jidToE164)(params.msg.from);
    }
    return (0, _utils.normalizeE164)(params.msg.from);
  })() :
  undefined;
  const textLimit = params.maxMediaTextChunkLimit ?? (0, _chunk.resolveTextChunkLimit)(params.cfg, "whatsapp");
  const chunkMode = (0, _chunk.resolveChunkMode)(params.cfg, "whatsapp", params.route.accountId);
  const tableMode = (0, _markdownTables.resolveMarkdownTableMode)({
    cfg: params.cfg,
    channel: "whatsapp",
    accountId: params.route.accountId
  });
  let didLogHeartbeatStrip = false;
  let didSendReply = false;
  const commandAuthorized = (0, _commandDetection.shouldComputeCommandAuthorized)(params.msg.body, params.cfg) ?
  await resolveWhatsAppCommandAuthorized({ cfg: params.cfg, msg: params.msg }) :
  undefined;
  const configuredResponsePrefix = params.cfg.messages?.responsePrefix;
  const prefixContext = (0, _replyPrefix.createReplyPrefixContext)({
    cfg: params.cfg,
    agentId: params.route.agentId
  });
  const isSelfChat = params.msg.chatType !== "group" &&
  Boolean(params.msg.selfE164) &&
  (0, _utils.normalizeE164)(params.msg.from) === (0, _utils.normalizeE164)(params.msg.selfE164 ?? "");
  const responsePrefix = prefixContext.responsePrefix ?? (
  configuredResponsePrefix === undefined && isSelfChat ?
  (0, _identity.resolveIdentityNamePrefix)(params.cfg, params.route.agentId) ?? "[openclaw]" :
  undefined);
  const ctxPayload = (0, _inboundContext.finalizeInboundContext)({
    Body: combinedBody,
    RawBody: params.msg.body,
    CommandBody: params.msg.body,
    From: params.msg.from,
    To: params.msg.to,
    SessionKey: params.route.sessionKey,
    AccountId: params.route.accountId,
    MessageSid: params.msg.id,
    ReplyToId: params.msg.replyToId,
    ReplyToBody: params.msg.replyToBody,
    ReplyToSender: params.msg.replyToSender,
    MediaPath: params.msg.mediaPath,
    MediaUrl: params.msg.mediaUrl,
    MediaType: params.msg.mediaType,
    ChatType: params.msg.chatType,
    ConversationLabel: params.msg.chatType === "group" ? conversationId : params.msg.from,
    GroupSubject: params.msg.groupSubject,
    GroupMembers: (0, _groupMembers.formatGroupMembers)({
      participants: params.msg.groupParticipants,
      roster: params.groupMemberNames.get(params.groupHistoryKey),
      fallbackE164: params.msg.senderE164
    }),
    SenderName: params.msg.senderName,
    SenderId: params.msg.senderJid?.trim() || params.msg.senderE164,
    SenderE164: params.msg.senderE164,
    CommandAuthorized: commandAuthorized,
    WasMentioned: params.msg.wasMentioned,
    ...(params.msg.location ? (0, _location.toLocationContext)(params.msg.location) : {}),
    Provider: "whatsapp",
    Surface: "whatsapp",
    OriginatingChannel: "whatsapp",
    OriginatingTo: params.msg.from
  });
  if (dmRouteTarget) {
    (0, _lastRoute.updateLastRouteInBackground)({
      cfg: params.cfg,
      backgroundTasks: params.backgroundTasks,
      storeAgentId: params.route.agentId,
      sessionKey: params.route.mainSessionKey,
      channel: "whatsapp",
      to: dmRouteTarget,
      accountId: params.route.accountId,
      ctx: ctxPayload,
      warn: params.replyLogger.warn.bind(params.replyLogger)
    });
  }
  const metaTask = (0, _sessions.recordSessionMetaFromInbound)({
    storePath,
    sessionKey: params.route.sessionKey,
    ctx: ctxPayload
  }).catch((err) => {
    params.replyLogger.warn({
      error: (0, _session.formatError)(err),
      storePath,
      sessionKey: params.route.sessionKey
    }, "failed updating session meta");
  });
  (0, _lastRoute.trackBackgroundTask)(params.backgroundTasks, metaTask);
  const { queuedFinal } = await (0, _providerDispatcher.dispatchReplyWithBufferedBlockDispatcher)({
    ctx: ctxPayload,
    cfg: params.cfg,
    replyResolver: params.replyResolver,
    dispatcherOptions: {
      responsePrefix,
      responsePrefixContextProvider: prefixContext.responsePrefixContextProvider,
      onHeartbeatStrip: () => {
        if (!didLogHeartbeatStrip) {
          didLogHeartbeatStrip = true;
          (0, _globals.logVerbose)("Stripped stray HEARTBEAT_OK token from web reply");
        }
      },
      deliver: async (payload, info) => {
        await (0, _deliverReply.deliverWebReply)({
          replyResult: payload,
          msg: params.msg,
          maxMediaBytes: params.maxMediaBytes,
          textLimit,
          chunkMode,
          replyLogger: params.replyLogger,
          connectionId: params.connectionId,
          // Tool + block updates are noisy; skip their log lines.
          skipLog: info.kind !== "final",
          tableMode
        });
        didSendReply = true;
        if (info.kind === "tool") {
          params.rememberSentText(payload.text, {});
          return;
        }
        const shouldLog = info.kind === "final" && payload.text ? true : undefined;
        params.rememberSentText(payload.text, {
          combinedBody,
          combinedBodySessionKey: params.route.sessionKey,
          logVerboseMessage: shouldLog
        });
        if (info.kind === "final") {
          const fromDisplay = params.msg.chatType === "group" ? conversationId : params.msg.from ?? "unknown";
          const hasMedia = Boolean(payload.mediaUrl || payload.mediaUrls?.length);
          _loggers.whatsappOutboundLog.info(`Auto-replied to ${fromDisplay}${hasMedia ? " (media)" : ""}`);
          if ((0, _globals.shouldLogVerbose)()) {
            const preview = payload.text != null ? (0, _util.elide)(payload.text, 400) : "<media>";
            _loggers.whatsappOutboundLog.debug(`Reply body: ${preview}${hasMedia ? " (media)" : ""}`);
          }
        }
      },
      onError: (err, info) => {
        const label = info.kind === "tool" ?
        "tool update" :
        info.kind === "block" ?
        "block update" :
        "auto-reply";
        _loggers.whatsappOutboundLog.error(`Failed sending web ${label} to ${params.msg.from ?? conversationId}: ${(0, _session.formatError)(err)}`);
      },
      onReplyStart: params.msg.sendComposing
    },
    replyOptions: {
      disableBlockStreaming: typeof params.cfg.channels?.whatsapp?.blockStreaming === "boolean" ?
      !params.cfg.channels.whatsapp.blockStreaming :
      undefined,
      onModelSelected: prefixContext.onModelSelected
    }
  });
  if (!queuedFinal) {
    if (shouldClearGroupHistory) {
      params.groupHistories.set(params.groupHistoryKey, []);
    }
    (0, _globals.logVerbose)("Skipping auto-reply: silent token or no text/media returned from resolver");
    return false;
  }
  if (shouldClearGroupHistory) {
    params.groupHistories.set(params.groupHistoryKey, []);
  }
  return didSendReply;
} /* v9-5835b80520de9e3d */
