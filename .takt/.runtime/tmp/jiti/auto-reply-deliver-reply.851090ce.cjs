"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.deliverWebReply = deliverWebReply;var _chunk = require("../../auto-reply/chunk.js");
var _globals = require("../../globals.js");
var _tables = require("../../markdown/tables.js");
var _media = require("../media.js");
var _reconnect = require("../reconnect.js");
var _session = require("../session.js");
var _loggers = require("./loggers.js");
var _util = require("./util.js");
async function deliverWebReply(params) {
  const { replyResult, msg, maxMediaBytes, textLimit, replyLogger, connectionId, skipLog } = params;
  const replyStarted = Date.now();
  const tableMode = params.tableMode ?? "code";
  const chunkMode = params.chunkMode ?? "length";
  const convertedText = (0, _tables.convertMarkdownTables)(replyResult.text || "", tableMode);
  const textChunks = (0, _chunk.chunkMarkdownTextWithMode)(convertedText, textLimit, chunkMode);
  const mediaList = replyResult.mediaUrls?.length ?
  replyResult.mediaUrls :
  replyResult.mediaUrl ?
  [replyResult.mediaUrl] :
  [];
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const sendWithRetry = async (fn, label, maxAttempts = 3) => {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      }
      catch (err) {
        lastErr = err;
        const errText = (0, _session.formatError)(err);
        const isLast = attempt === maxAttempts;
        const shouldRetry = /closed|reset|timed\\s*out|disconnect/i.test(errText);
        if (!shouldRetry || isLast) {
          throw err;
        }
        const backoffMs = 500 * attempt;
        (0, _globals.logVerbose)(`Retrying ${label} to ${msg.from} after failure (${attempt}/${maxAttempts - 1}) in ${backoffMs}ms: ${errText}`);
        await sleep(backoffMs);
      }
    }
    throw lastErr;
  };
  // Text-only replies
  if (mediaList.length === 0 && textChunks.length) {
    const totalChunks = textChunks.length;
    for (const [index, chunk] of textChunks.entries()) {
      const chunkStarted = Date.now();
      await sendWithRetry(() => msg.reply(chunk), "text");
      if (!skipLog) {
        const durationMs = Date.now() - chunkStarted;
        _loggers.whatsappOutboundLog.debug(`Sent chunk ${index + 1}/${totalChunks} to ${msg.from} (${durationMs.toFixed(0)}ms)`);
      }
    }
    replyLogger.info({
      correlationId: msg.id ?? (0, _reconnect.newConnectionId)(),
      connectionId: connectionId ?? null,
      to: msg.from,
      from: msg.to,
      text: (0, _util.elide)(replyResult.text, 240),
      mediaUrl: null,
      mediaSizeBytes: null,
      mediaKind: null,
      durationMs: Date.now() - replyStarted
    }, "auto-reply sent (text)");
    return;
  }
  const remainingText = [...textChunks];
  // Media (with optional caption on first item)
  for (const [index, mediaUrl] of mediaList.entries()) {
    const caption = index === 0 ? remainingText.shift() || undefined : undefined;
    try {
      const media = await (0, _media.loadWebMedia)(mediaUrl, maxMediaBytes);
      if ((0, _globals.shouldLogVerbose)()) {
        (0, _globals.logVerbose)(`Web auto-reply media size: ${(media.buffer.length / (1024 * 1024)).toFixed(2)}MB`);
        (0, _globals.logVerbose)(`Web auto-reply media source: ${mediaUrl} (kind ${media.kind})`);
      }
      if (media.kind === "image") {
        await sendWithRetry(() => msg.sendMedia({
          image: media.buffer,
          caption,
          mimetype: media.contentType
        }), "media:image");
      } else
      if (media.kind === "audio") {
        await sendWithRetry(() => msg.sendMedia({
          audio: media.buffer,
          ptt: true,
          mimetype: media.contentType,
          caption
        }), "media:audio");
      } else
      if (media.kind === "video") {
        await sendWithRetry(() => msg.sendMedia({
          video: media.buffer,
          caption,
          mimetype: media.contentType
        }), "media:video");
      } else
      {
        const fileName = media.fileName ?? mediaUrl.split("/").pop() ?? "file";
        const mimetype = media.contentType ?? "application/octet-stream";
        await sendWithRetry(() => msg.sendMedia({
          document: media.buffer,
          fileName,
          caption,
          mimetype
        }), "media:document");
      }
      _loggers.whatsappOutboundLog.info(`Sent media reply to ${msg.from} (${(media.buffer.length / (1024 * 1024)).toFixed(2)}MB)`);
      replyLogger.info({
        correlationId: msg.id ?? (0, _reconnect.newConnectionId)(),
        connectionId: connectionId ?? null,
        to: msg.from,
        from: msg.to,
        text: caption ?? null,
        mediaUrl,
        mediaSizeBytes: media.buffer.length,
        mediaKind: media.kind,
        durationMs: Date.now() - replyStarted
      }, "auto-reply sent (media)");
    }
    catch (err) {
      _loggers.whatsappOutboundLog.error(`Failed sending web media to ${msg.from}: ${(0, _session.formatError)(err)}`);
      replyLogger.warn({ err, mediaUrl }, "failed to send web media reply");
      if (index === 0) {
        const warning = err instanceof Error ? `⚠️ Media failed: ${err.message}` : "⚠️ Media failed.";
        const fallbackTextParts = [remainingText.shift() ?? caption ?? "", warning].filter(Boolean);
        const fallbackText = fallbackTextParts.join("\n");
        if (fallbackText) {
          _loggers.whatsappOutboundLog.warn(`Media skipped; sent text-only to ${msg.from}`);
          await msg.reply(fallbackText);
        }
      }
    }
  }
  // Remaining text chunks after media
  for (const chunk of remainingText) {
    await msg.reply(chunk);
  }
} /* v9-e3b655fa276355f8 */
