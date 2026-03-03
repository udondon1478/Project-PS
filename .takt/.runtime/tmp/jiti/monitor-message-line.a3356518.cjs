"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildInboundLine = buildInboundLine;exports.formatReplyContext = formatReplyContext;var _identity = require("../../../agents/identity.js");
var _envelope = require("../../../auto-reply/envelope.js");
function formatReplyContext(msg) {
  if (!msg.replyToBody) {
    return null;
  }
  const sender = msg.replyToSender ?? "unknown sender";
  const idPart = msg.replyToId ? ` id:${msg.replyToId}` : "";
  return `[Replying to ${sender}${idPart}]\n${msg.replyToBody}\n[/Replying]`;
}
function buildInboundLine(params) {
  const { cfg, msg, agentId, previousTimestamp, envelope } = params;
  // WhatsApp inbound prefix: channels.whatsapp.messagePrefix > legacy messages.messagePrefix > identity/defaults
  const messagePrefix = (0, _identity.resolveMessagePrefix)(cfg, agentId, {
    configured: cfg.channels?.whatsapp?.messagePrefix,
    hasAllowFrom: (cfg.channels?.whatsapp?.allowFrom?.length ?? 0) > 0
  });
  const prefixStr = messagePrefix ? `${messagePrefix} ` : "";
  const replyContext = formatReplyContext(msg);
  const baseLine = `${prefixStr}${msg.body}${replyContext ? `\n\n${replyContext}` : ""}`;
  // Wrap with standardized envelope for the agent.
  return (0, _envelope.formatInboundEnvelope)({
    channel: "WhatsApp",
    from: msg.chatType === "group" ? msg.from : msg.from?.replace(/^whatsapp:/, ""),
    timestamp: msg.timestamp,
    body: baseLine,
    chatType: msg.chatType,
    sender: {
      name: msg.senderName,
      e164: msg.senderE164,
      id: msg.senderJid
    },
    previousTimestamp,
    envelope
  });
} /* v9-3d2a623849838c76 */
