"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createWebOnMessageHandler = createWebOnMessageHandler;var _globals = require("../../../globals.js");
var _resolveRoute = require("../../../routing/resolve-route.js");
var _sessionKey = require("../../../routing/session-key.js");
var _utils = require("../../../utils.js");
var _broadcast = require("./broadcast.js");
var _groupGating = require("./group-gating.js");
var _lastRoute = require("./last-route.js");
var _peer = require("./peer.js");
var _processMessage = require("./process-message.js");
function createWebOnMessageHandler(params) {
  const processForRoute = async (msg, route, groupHistoryKey, opts) => (0, _processMessage.processMessage)({
    cfg: params.cfg,
    msg,
    route,
    groupHistoryKey,
    groupHistories: params.groupHistories,
    groupMemberNames: params.groupMemberNames,
    connectionId: params.connectionId,
    verbose: params.verbose,
    maxMediaBytes: params.maxMediaBytes,
    replyResolver: params.replyResolver,
    replyLogger: params.replyLogger,
    backgroundTasks: params.backgroundTasks,
    rememberSentText: params.echoTracker.rememberText,
    echoHas: params.echoTracker.has,
    echoForget: params.echoTracker.forget,
    buildCombinedEchoKey: params.echoTracker.buildCombinedKey,
    groupHistory: opts?.groupHistory,
    suppressGroupHistoryClear: opts?.suppressGroupHistoryClear
  });
  return async (msg) => {
    const conversationId = msg.conversationId ?? msg.from;
    const peerId = (0, _peer.resolvePeerId)(msg);
    const route = (0, _resolveRoute.resolveAgentRoute)({
      cfg: params.cfg,
      channel: "whatsapp",
      accountId: msg.accountId,
      peer: {
        kind: msg.chatType === "group" ? "group" : "dm",
        id: peerId
      }
    });
    const groupHistoryKey = msg.chatType === "group" ?
    (0, _sessionKey.buildGroupHistoryKey)({
      channel: "whatsapp",
      accountId: route.accountId,
      peerKind: "group",
      peerId
    }) :
    route.sessionKey;
    // Same-phone mode logging retained
    if (msg.from === msg.to) {
      (0, _globals.logVerbose)(`📱 Same-phone mode detected (from === to: ${msg.from})`);
    }
    // Skip if this is a message we just sent (echo detection)
    if (params.echoTracker.has(msg.body)) {
      (0, _globals.logVerbose)("Skipping auto-reply: detected echo (message matches recently sent text)");
      params.echoTracker.forget(msg.body);
      return;
    }
    if (msg.chatType === "group") {
      const metaCtx = {
        From: msg.from,
        To: msg.to,
        SessionKey: route.sessionKey,
        AccountId: route.accountId,
        ChatType: msg.chatType,
        ConversationLabel: conversationId,
        GroupSubject: msg.groupSubject,
        SenderName: msg.senderName,
        SenderId: msg.senderJid?.trim() || msg.senderE164,
        SenderE164: msg.senderE164,
        Provider: "whatsapp",
        Surface: "whatsapp",
        OriginatingChannel: "whatsapp",
        OriginatingTo: conversationId
      };
      (0, _lastRoute.updateLastRouteInBackground)({
        cfg: params.cfg,
        backgroundTasks: params.backgroundTasks,
        storeAgentId: route.agentId,
        sessionKey: route.sessionKey,
        channel: "whatsapp",
        to: conversationId,
        accountId: route.accountId,
        ctx: metaCtx,
        warn: params.replyLogger.warn.bind(params.replyLogger)
      });
      const gating = (0, _groupGating.applyGroupGating)({
        cfg: params.cfg,
        msg,
        conversationId,
        groupHistoryKey,
        agentId: route.agentId,
        sessionKey: route.sessionKey,
        baseMentionConfig: params.baseMentionConfig,
        authDir: params.account.authDir,
        groupHistories: params.groupHistories,
        groupHistoryLimit: params.groupHistoryLimit,
        groupMemberNames: params.groupMemberNames,
        logVerbose: _globals.logVerbose,
        replyLogger: params.replyLogger
      });
      if (!gating.shouldProcess) {
        return;
      }
    } else
    {
      // Ensure `peerId` for DMs is stable and stored as E.164 when possible.
      if (!msg.senderE164 && peerId && peerId.startsWith("+")) {
        msg.senderE164 = (0, _utils.normalizeE164)(peerId) ?? msg.senderE164;
      }
    }
    // Broadcast groups: when we'd reply anyway, run multiple agents.
    // Does not bypass group mention/activation gating above.
    if (await (0, _broadcast.maybeBroadcastMessage)({
      cfg: params.cfg,
      msg,
      peerId,
      route,
      groupHistoryKey,
      groupHistories: params.groupHistories,
      processMessage: processForRoute
    })) {
      return;
    }
    await processForRoute(msg, route, groupHistoryKey);
  };
} /* v9-207042d6422bc2c8 */
