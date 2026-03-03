"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.sendMessageIMessage = sendMessageIMessage;var _config = require("../config/config.js");
var _markdownTables = require("../config/markdown-tables.js");
var _tables = require("../markdown/tables.js");
var _constants = require("../media/constants.js");
var _store = require("../media/store.js");
var _media = require("../web/media.js");
var _accounts = require("./accounts.js");
var _client = require("./client.js");
var _targets = require("./targets.js");
function resolveMessageId(result) {
  if (!result) {
    return null;
  }
  const raw = typeof result.messageId === "string" && result.messageId.trim() ||
  typeof result.message_id === "string" && result.message_id.trim() ||
  typeof result.id === "string" && result.id.trim() ||
  typeof result.guid === "string" && result.guid.trim() || (
  typeof result.message_id === "number" ? String(result.message_id) : null) || (
  typeof result.id === "number" ? String(result.id) : null);
  return raw ? String(raw).trim() : null;
}
async function resolveAttachment(mediaUrl, maxBytes) {
  const media = await (0, _media.loadWebMedia)(mediaUrl, maxBytes);
  const saved = await (0, _store.saveMediaBuffer)(media.buffer, media.contentType ?? undefined, "outbound", maxBytes);
  return { path: saved.path, contentType: saved.contentType };
}
async function sendMessageIMessage(to, text, opts = {}) {
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveIMessageAccount)({
    cfg,
    accountId: opts.accountId
  });
  const cliPath = opts.cliPath?.trim() || account.config.cliPath?.trim() || "imsg";
  const dbPath = opts.dbPath?.trim() || account.config.dbPath?.trim();
  const target = (0, _targets.parseIMessageTarget)(opts.chatId ? (0, _targets.formatIMessageChatTarget)(opts.chatId) : to);
  const service = opts.service ?? (
  target.kind === "handle" ? target.service : undefined) ??
  account.config.service;
  const region = opts.region?.trim() || account.config.region?.trim() || "US";
  const maxBytes = typeof opts.maxBytes === "number" ?
  opts.maxBytes :
  typeof account.config.mediaMaxMb === "number" ?
  account.config.mediaMaxMb * 1024 * 1024 :
  16 * 1024 * 1024;
  let message = text ?? "";
  let filePath;
  if (opts.mediaUrl?.trim()) {
    const resolved = await resolveAttachment(opts.mediaUrl.trim(), maxBytes);
    filePath = resolved.path;
    if (!message.trim()) {
      const kind = (0, _constants.mediaKindFromMime)(resolved.contentType ?? undefined);
      if (kind) {
        message = kind === "image" ? "<media:image>" : `<media:${kind}>`;
      }
    }
  }
  if (!message.trim() && !filePath) {
    throw new Error("iMessage send requires text or media");
  }
  if (message.trim()) {
    const tableMode = (0, _markdownTables.resolveMarkdownTableMode)({
      cfg,
      channel: "imessage",
      accountId: account.accountId
    });
    message = (0, _tables.convertMarkdownTables)(message, tableMode);
  }
  const params = {
    text: message,
    service: service || "auto",
    region
  };
  if (filePath) {
    params.file = filePath;
  }
  if (target.kind === "chat_id") {
    params.chat_id = target.chatId;
  } else
  if (target.kind === "chat_guid") {
    params.chat_guid = target.chatGuid;
  } else
  if (target.kind === "chat_identifier") {
    params.chat_identifier = target.chatIdentifier;
  } else
  {
    params.to = target.to;
  }
  const client = opts.client ?? (await (0, _client.createIMessageRpcClient)({ cliPath, dbPath }));
  const shouldClose = !opts.client;
  try {
    const result = await client.request("send", params, {
      timeoutMs: opts.timeoutMs
    });
    const resolvedId = resolveMessageId(result);
    return {
      messageId: resolvedId ?? (result?.ok ? "ok" : "unknown")
    };
  } finally
  {
    if (shouldClose) {
      await client.stop();
    }
  }
} /* v9-ae0480b35b9accad */
