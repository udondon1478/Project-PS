"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.deliverDiscordReply = deliverDiscordReply;var _tables = require("../../markdown/tables.js");
var _chunk = require("../chunk.js");
var _send = require("../send.js");
async function deliverDiscordReply(params) {
  const chunkLimit = Math.min(params.textLimit, 2000);
  for (const payload of params.replies) {
    const mediaList = payload.mediaUrls ?? (payload.mediaUrl ? [payload.mediaUrl] : []);
    const rawText = payload.text ?? "";
    const tableMode = params.tableMode ?? "code";
    const text = (0, _tables.convertMarkdownTables)(rawText, tableMode);
    if (!text && mediaList.length === 0) {
      continue;
    }
    const replyTo = params.replyToId?.trim() || undefined;
    if (mediaList.length === 0) {
      let isFirstChunk = true;
      const mode = params.chunkMode ?? "length";
      const chunks = (0, _chunk.chunkDiscordTextWithMode)(text, {
        maxChars: chunkLimit,
        maxLines: params.maxLinesPerMessage,
        chunkMode: mode
      });
      if (!chunks.length && text) {
        chunks.push(text);
      }
      for (const chunk of chunks) {
        const trimmed = chunk.trim();
        if (!trimmed) {
          continue;
        }
        await (0, _send.sendMessageDiscord)(params.target, trimmed, {
          token: params.token,
          rest: params.rest,
          accountId: params.accountId,
          replyTo: isFirstChunk ? replyTo : undefined
        });
        isFirstChunk = false;
      }
      continue;
    }
    const firstMedia = mediaList[0];
    if (!firstMedia) {
      continue;
    }
    await (0, _send.sendMessageDiscord)(params.target, text, {
      token: params.token,
      rest: params.rest,
      mediaUrl: firstMedia,
      accountId: params.accountId,
      replyTo
    });
    for (const extra of mediaList.slice(1)) {
      await (0, _send.sendMessageDiscord)(params.target, "", {
        token: params.token,
        rest: params.rest,
        mediaUrl: extra,
        accountId: params.accountId
      });
    }
  }
} /* v9-a40f661c188cafe1 */
