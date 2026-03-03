"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.deliverReplies = deliverReplies;var _chunk = require("../../auto-reply/chunk.js");
var _config = require("../../config/config.js");
var _markdownTables = require("../../config/markdown-tables.js");
var _tables = require("../../markdown/tables.js");
var _send = require("../send.js");
async function deliverReplies(params) {
  const { replies, target, client, runtime, maxBytes, textLimit, accountId } = params;
  const cfg = (0, _config.loadConfig)();
  const tableMode = (0, _markdownTables.resolveMarkdownTableMode)({
    cfg,
    channel: "imessage",
    accountId
  });
  const chunkMode = (0, _chunk.resolveChunkMode)(cfg, "imessage", accountId);
  for (const payload of replies) {
    const mediaList = payload.mediaUrls ?? (payload.mediaUrl ? [payload.mediaUrl] : []);
    const rawText = payload.text ?? "";
    const text = (0, _tables.convertMarkdownTables)(rawText, tableMode);
    if (!text && mediaList.length === 0) {
      continue;
    }
    if (mediaList.length === 0) {
      for (const chunk of (0, _chunk.chunkTextWithMode)(text, textLimit, chunkMode)) {
        await (0, _send.sendMessageIMessage)(target, chunk, {
          maxBytes,
          client,
          accountId
        });
      }
    } else
    {
      let first = true;
      for (const url of mediaList) {
        const caption = first ? text : "";
        first = false;
        await (0, _send.sendMessageIMessage)(target, caption, {
          mediaUrl: url,
          maxBytes,
          client,
          accountId
        });
      }
    }
    runtime.log?.(`imessage: delivered reply to ${target}`);
  }
} /* v9-4afda860fa6c0317 */
