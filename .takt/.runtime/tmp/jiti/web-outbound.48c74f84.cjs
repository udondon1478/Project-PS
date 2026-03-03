"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.sendMessageWhatsApp = sendMessageWhatsApp;exports.sendPollWhatsApp = sendPollWhatsApp;exports.sendReactionWhatsApp = sendReactionWhatsApp;var _nodeCrypto = require("node:crypto");
var _config = require("../config/config.js");
var _markdownTables = require("../config/markdown-tables.js");
var _logger = require("../logging/logger.js");
var _subsystem = require("../logging/subsystem.js");
var _tables = require("../markdown/tables.js");
var _polls = require("../polls.js");
var _utils = require("../utils.js");
var _activeListener = require("./active-listener.js");
var _media = require("./media.js");
const outboundLog = (0, _subsystem.createSubsystemLogger)("gateway/channels/whatsapp").child("outbound");
async function sendMessageWhatsApp(to, body, options) {
  let text = body;
  const correlationId = (0, _nodeCrypto.randomUUID)();
  const startedAt = Date.now();
  const { listener: active, accountId: resolvedAccountId } = (0, _activeListener.requireActiveWebListener)(options.accountId);
  const cfg = (0, _config.loadConfig)();
  const tableMode = (0, _markdownTables.resolveMarkdownTableMode)({
    cfg,
    channel: "whatsapp",
    accountId: resolvedAccountId ?? options.accountId
  });
  text = (0, _tables.convertMarkdownTables)(text ?? "", tableMode);
  const logger = (0, _logger.getChildLogger)({
    module: "web-outbound",
    correlationId,
    to
  });
  try {
    const jid = (0, _utils.toWhatsappJid)(to);
    let mediaBuffer;
    let mediaType;
    if (options.mediaUrl) {
      const media = await (0, _media.loadWebMedia)(options.mediaUrl);
      const caption = text || undefined;
      mediaBuffer = media.buffer;
      mediaType = media.contentType;
      if (media.kind === "audio") {
        // WhatsApp expects explicit opus codec for PTT voice notes.
        mediaType =
        media.contentType === "audio/ogg" ?
        "audio/ogg; codecs=opus" :
        media.contentType ?? "application/octet-stream";
      } else
      if (media.kind === "video") {
        text = caption ?? "";
      } else
      if (media.kind === "image") {
        text = caption ?? "";
      } else
      {
        text = caption ?? "";
      }
    }
    outboundLog.info(`Sending message -> ${jid}${options.mediaUrl ? " (media)" : ""}`);
    logger.info({ jid, hasMedia: Boolean(options.mediaUrl) }, "sending message");
    await active.sendComposingTo(to);
    const hasExplicitAccountId = Boolean(options.accountId?.trim());
    const accountId = hasExplicitAccountId ? resolvedAccountId : undefined;
    const sendOptions = options.gifPlayback || accountId ?
    {
      ...(options.gifPlayback ? { gifPlayback: true } : {}),
      accountId
    } :
    undefined;
    const result = sendOptions ?
    await active.sendMessage(to, text, mediaBuffer, mediaType, sendOptions) :
    await active.sendMessage(to, text, mediaBuffer, mediaType);
    const messageId = result?.messageId ?? "unknown";
    const durationMs = Date.now() - startedAt;
    outboundLog.info(`Sent message ${messageId} -> ${jid}${options.mediaUrl ? " (media)" : ""} (${durationMs}ms)`);
    logger.info({ jid, messageId }, "sent message");
    return { messageId, toJid: jid };
  }
  catch (err) {
    logger.error({ err: String(err), to, hasMedia: Boolean(options.mediaUrl) }, "failed to send via web session");
    throw err;
  }
}
async function sendReactionWhatsApp(chatJid, messageId, emoji, options) {
  const correlationId = (0, _nodeCrypto.randomUUID)();
  const { listener: active } = (0, _activeListener.requireActiveWebListener)(options.accountId);
  const logger = (0, _logger.getChildLogger)({
    module: "web-outbound",
    correlationId,
    chatJid,
    messageId
  });
  try {
    const jid = (0, _utils.toWhatsappJid)(chatJid);
    outboundLog.info(`Sending reaction "${emoji}" -> message ${messageId}`);
    logger.info({ chatJid: jid, messageId, emoji }, "sending reaction");
    await active.sendReaction(chatJid, messageId, emoji, options.fromMe ?? false, options.participant);
    outboundLog.info(`Sent reaction "${emoji}" -> message ${messageId}`);
    logger.info({ chatJid: jid, messageId, emoji }, "sent reaction");
  }
  catch (err) {
    logger.error({ err: String(err), chatJid, messageId, emoji }, "failed to send reaction via web session");
    throw err;
  }
}
async function sendPollWhatsApp(to, poll, options) {
  const correlationId = (0, _nodeCrypto.randomUUID)();
  const startedAt = Date.now();
  const { listener: active } = (0, _activeListener.requireActiveWebListener)(options.accountId);
  const logger = (0, _logger.getChildLogger)({
    module: "web-outbound",
    correlationId,
    to
  });
  try {
    const jid = (0, _utils.toWhatsappJid)(to);
    const normalized = (0, _polls.normalizePollInput)(poll, { maxOptions: 12 });
    outboundLog.info(`Sending poll -> ${jid}: "${normalized.question}"`);
    logger.info({
      jid,
      question: normalized.question,
      optionCount: normalized.options.length,
      maxSelections: normalized.maxSelections
    }, "sending poll");
    const result = await active.sendPoll(to, normalized);
    const messageId = result?.messageId ?? "unknown";
    const durationMs = Date.now() - startedAt;
    outboundLog.info(`Sent poll ${messageId} -> ${jid} (${durationMs}ms)`);
    logger.info({ jid, messageId }, "sent poll");
    return { messageId, toJid: jid };
  }
  catch (err) {
    logger.error({ err: String(err), to, question: poll.question }, "failed to send poll via web session");
    throw err;
  }
} /* v9-11222e1154dc1275 */
