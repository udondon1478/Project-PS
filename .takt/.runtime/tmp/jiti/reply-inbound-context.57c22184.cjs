"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.finalizeInboundContext = finalizeInboundContext;var _chatType = require("../../channels/chat-type.js");
var _conversationLabel = require("../../channels/conversation-label.js");
var _inboundSenderMeta = require("./inbound-sender-meta.js");
var _inboundText = require("./inbound-text.js");
function normalizeTextField(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  return (0, _inboundText.normalizeInboundTextNewlines)(value);
}
function finalizeInboundContext(ctx, opts = {}) {
  const normalized = ctx;
  normalized.Body = (0, _inboundText.normalizeInboundTextNewlines)(typeof normalized.Body === "string" ? normalized.Body : "");
  normalized.RawBody = normalizeTextField(normalized.RawBody);
  normalized.CommandBody = normalizeTextField(normalized.CommandBody);
  normalized.Transcript = normalizeTextField(normalized.Transcript);
  normalized.ThreadStarterBody = normalizeTextField(normalized.ThreadStarterBody);
  const chatType = (0, _chatType.normalizeChatType)(normalized.ChatType);
  if (chatType && (opts.forceChatType || normalized.ChatType !== chatType)) {
    normalized.ChatType = chatType;
  }
  const bodyForAgentSource = opts.forceBodyForAgent ?
  normalized.Body :
  normalized.BodyForAgent ?? normalized.Body;
  normalized.BodyForAgent = (0, _inboundText.normalizeInboundTextNewlines)(bodyForAgentSource);
  const bodyForCommandsSource = opts.forceBodyForCommands ?
  normalized.CommandBody ?? normalized.RawBody ?? normalized.Body :
  normalized.BodyForCommands ??
  normalized.CommandBody ??
  normalized.RawBody ??
  normalized.Body;
  normalized.BodyForCommands = (0, _inboundText.normalizeInboundTextNewlines)(bodyForCommandsSource);
  const explicitLabel = normalized.ConversationLabel?.trim();
  if (opts.forceConversationLabel || !explicitLabel) {
    const resolved = (0, _conversationLabel.resolveConversationLabel)(normalized)?.trim();
    if (resolved) {
      normalized.ConversationLabel = resolved;
    }
  } else
  {
    normalized.ConversationLabel = explicitLabel;
  }
  // Ensure group/channel messages retain a sender meta line even when the body is a
  // structured envelope (e.g. "[Signal ...] Alice: hi").
  normalized.Body = (0, _inboundSenderMeta.formatInboundBodyWithSenderMeta)({ ctx: normalized, body: normalized.Body });
  normalized.BodyForAgent = (0, _inboundSenderMeta.formatInboundBodyWithSenderMeta)({
    ctx: normalized,
    body: normalized.BodyForAgent
  });
  // Always set. Default-deny when upstream forgets to populate it.
  normalized.CommandAuthorized = normalized.CommandAuthorized === true;
  return normalized;
} /* v9-255ef0396dc2da54 */
