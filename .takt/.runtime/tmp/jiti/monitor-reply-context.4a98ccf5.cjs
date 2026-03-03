"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildDirectLabel = buildDirectLabel;exports.buildGuildLabel = buildGuildLabel;exports.resolveReplyContext = resolveReplyContext;var _envelope = require("../../auto-reply/envelope.js");
var _format = require("./format.js");
var _senderIdentity = require("./sender-identity.js");
function resolveReplyContext(message, resolveDiscordMessageText, options) {
  const referenced = message.referencedMessage;
  if (!referenced?.author) {
    return null;
  }
  const referencedText = resolveDiscordMessageText(referenced, {
    includeForwarded: true
  });
  if (!referencedText) {
    return null;
  }
  const sender = (0, _senderIdentity.resolveDiscordSenderIdentity)({
    author: referenced.author,
    pluralkitInfo: null
  });
  const fromLabel = referenced.author ? buildDirectLabel(referenced.author, sender.tag) : "Unknown";
  const body = `${referencedText}\n[discord message id: ${referenced.id} channel: ${referenced.channelId} from: ${sender.tag ?? sender.label} user id:${sender.id}]`;
  return (0, _envelope.formatAgentEnvelope)({
    channel: "Discord",
    from: fromLabel,
    timestamp: (0, _format.resolveTimestampMs)(referenced.timestamp),
    body,
    envelope: options?.envelope
  });
}
function buildDirectLabel(author, tagOverride) {
  const username = tagOverride?.trim() || (0, _senderIdentity.resolveDiscordSenderIdentity)({ author, pluralkitInfo: null }).tag;
  return `${username ?? "unknown"} user id:${author.id}`;
}
function buildGuildLabel(params) {
  const { guild, channelName, channelId } = params;
  return `${guild?.name ?? "Guild"} #${channelName} channel id:${channelId}`;
} /* v9-d4154f90cadc620e */
