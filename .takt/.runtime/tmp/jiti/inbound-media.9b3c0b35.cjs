"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.downloadInboundMedia = downloadInboundMedia;var _baileys = require("@whiskeysockets/baileys");
var _globals = require("../../globals.js");
function unwrapMessage(message) {
  const normalized = (0, _baileys.normalizeMessageContent)(message);
  return normalized;
}
async function downloadInboundMedia(msg, sock) {
  const message = unwrapMessage(msg.message);
  if (!message) {
    return undefined;
  }
  const mimetype = message.imageMessage?.mimetype ??
  message.videoMessage?.mimetype ??
  message.documentMessage?.mimetype ??
  message.audioMessage?.mimetype ??
  message.stickerMessage?.mimetype ??
  undefined;
  if (!message.imageMessage &&
  !message.videoMessage &&
  !message.documentMessage &&
  !message.audioMessage &&
  !message.stickerMessage) {
    return undefined;
  }
  try {
    const buffer = await (0, _baileys.downloadMediaMessage)(msg, "buffer", {}, {
      reuploadRequest: sock.updateMediaMessage,
      logger: sock.logger
    });
    return { buffer, mimetype };
  }
  catch (err) {
    (0, _globals.logVerbose)(`downloadMediaMessage failed: ${String(err)}`);
    return undefined;
  }
} /* v9-d18a42edff48d0c8 */
