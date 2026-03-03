"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.maybeSendAckReaction = maybeSendAckReaction;var _ackReactions = require("../../../channels/ack-reactions.js");
var _globals = require("../../../globals.js");
var _outbound = require("../../outbound.js");
var _session = require("../../session.js");
var _groupActivation = require("./group-activation.js");
function maybeSendAckReaction(params) {
  if (!params.msg.id) {
    return;
  }
  const ackConfig = params.cfg.channels?.whatsapp?.ackReaction;
  const emoji = (ackConfig?.emoji ?? "").trim();
  const directEnabled = ackConfig?.direct ?? true;
  const groupMode = ackConfig?.group ?? "mentions";
  const conversationIdForCheck = params.msg.conversationId ?? params.msg.from;
  const activation = params.msg.chatType === "group" ?
  (0, _groupActivation.resolveGroupActivationFor)({
    cfg: params.cfg,
    agentId: params.agentId,
    sessionKey: params.sessionKey,
    conversationId: conversationIdForCheck
  }) :
  null;
  const shouldSendReaction = () => (0, _ackReactions.shouldAckReactionForWhatsApp)({
    emoji,
    isDirect: params.msg.chatType === "direct",
    isGroup: params.msg.chatType === "group",
    directEnabled,
    groupMode,
    wasMentioned: params.msg.wasMentioned === true,
    groupActivated: activation === "always"
  });
  if (!shouldSendReaction()) {
    return;
  }
  params.info({ chatId: params.msg.chatId, messageId: params.msg.id, emoji }, "sending ack reaction");
  (0, _outbound.sendReactionWhatsApp)(params.msg.chatId, params.msg.id, emoji, {
    verbose: params.verbose,
    fromMe: false,
    participant: params.msg.senderJid,
    accountId: params.accountId
  }).catch((err) => {
    params.warn({
      error: (0, _session.formatError)(err),
      chatId: params.msg.chatId,
      messageId: params.msg.id
    }, "failed to send ack reaction");
    (0, _globals.logVerbose)(`WhatsApp ack reaction failed for chat ${params.msg.chatId}: ${(0, _session.formatError)(err)}`);
  });
} /* v9-d64b3d38a330dd66 */
