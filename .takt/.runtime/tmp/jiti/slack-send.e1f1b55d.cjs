"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.sendMessageSlack = sendMessageSlack;var _chunk = require("../auto-reply/chunk.js");
var _config = require("../config/config.js");
var _markdownTables = require("../config/markdown-tables.js");
var _globals = require("../globals.js");
var _media = require("../web/media.js");
var _accounts = require("./accounts.js");
var _client = require("./client.js");
var _format = require("./format.js");
var _targets = require("./targets.js");
var _token = require("./token.js");
const SLACK_TEXT_LIMIT = 4000;
function resolveToken(params) {
  const explicit = (0, _token.resolveSlackBotToken)(params.explicit);
  if (explicit) {
    return explicit;
  }
  const fallback = (0, _token.resolveSlackBotToken)(params.fallbackToken);
  if (!fallback) {
    (0, _globals.logVerbose)(`slack send: missing bot token for account=${params.accountId} explicit=${Boolean(params.explicit)} source=${params.fallbackSource ?? "unknown"}`);
    throw new Error(`Slack bot token missing for account "${params.accountId}" (set channels.slack.accounts.${params.accountId}.botToken or SLACK_BOT_TOKEN for default).`);
  }
  return fallback;
}
function parseRecipient(raw) {
  const target = (0, _targets.parseSlackTarget)(raw);
  if (!target) {
    throw new Error("Recipient is required for Slack sends");
  }
  return { kind: target.kind, id: target.id };
}
async function resolveChannelId(client, recipient) {
  if (recipient.kind === "channel") {
    return { channelId: recipient.id };
  }
  const response = await client.conversations.open({ users: recipient.id });
  const channelId = response.channel?.id;
  if (!channelId) {
    throw new Error("Failed to open Slack DM channel");
  }
  return { channelId, isDm: true };
}
async function uploadSlackFile(params) {
  const { buffer, contentType: _contentType, fileName } = await (0, _media.loadWebMedia)(params.mediaUrl, params.maxBytes);
  const basePayload = {
    channel_id: params.channelId,
    file: buffer,
    filename: fileName,
    ...(params.caption ? { initial_comment: params.caption } : {})
    // Note: filetype is deprecated in files.uploadV2, Slack auto-detects from file content
  };
  const payload = params.threadTs ?
  { ...basePayload, thread_ts: params.threadTs } :
  basePayload;
  const response = await params.client.files.uploadV2(payload);
  const parsed = response;
  const fileId = parsed.files?.[0]?.id ??
  parsed.file?.id ??
  parsed.files?.[0]?.name ??
  parsed.file?.name ??
  "unknown";
  return fileId;
}
async function sendMessageSlack(to, message, opts = {}) {
  const trimmedMessage = message?.trim() ?? "";
  if (!trimmedMessage && !opts.mediaUrl) {
    throw new Error("Slack send requires text or media");
  }
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveSlackAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = resolveToken({
    explicit: opts.token,
    accountId: account.accountId,
    fallbackToken: account.botToken,
    fallbackSource: account.botTokenSource
  });
  const client = opts.client ?? (0, _client.createSlackWebClient)(token);
  const recipient = parseRecipient(to);
  const { channelId } = await resolveChannelId(client, recipient);
  const textLimit = (0, _chunk.resolveTextChunkLimit)(cfg, "slack", account.accountId);
  const chunkLimit = Math.min(textLimit, SLACK_TEXT_LIMIT);
  const tableMode = (0, _markdownTables.resolveMarkdownTableMode)({
    cfg,
    channel: "slack",
    accountId: account.accountId
  });
  const chunkMode = (0, _chunk.resolveChunkMode)(cfg, "slack", account.accountId);
  const markdownChunks = chunkMode === "newline" ?
  (0, _chunk.chunkMarkdownTextWithMode)(trimmedMessage, chunkLimit, chunkMode) :
  [trimmedMessage];
  const chunks = markdownChunks.flatMap((markdown) => (0, _format.markdownToSlackMrkdwnChunks)(markdown, chunkLimit, { tableMode }));
  if (!chunks.length && trimmedMessage) {
    chunks.push(trimmedMessage);
  }
  const mediaMaxBytes = typeof account.config.mediaMaxMb === "number" ?
  account.config.mediaMaxMb * 1024 * 1024 :
  undefined;
  let lastMessageId = "";
  if (opts.mediaUrl) {
    const [firstChunk, ...rest] = chunks;
    lastMessageId = await uploadSlackFile({
      client,
      channelId,
      mediaUrl: opts.mediaUrl,
      caption: firstChunk,
      threadTs: opts.threadTs,
      maxBytes: mediaMaxBytes
    });
    for (const chunk of rest) {
      const response = await client.chat.postMessage({
        channel: channelId,
        text: chunk,
        thread_ts: opts.threadTs
      });
      lastMessageId = response.ts ?? lastMessageId;
    }
  } else
  {
    for (const chunk of chunks.length ? chunks : [""]) {
      const response = await client.chat.postMessage({
        channel: channelId,
        text: chunk,
        thread_ts: opts.threadTs
      });
      lastMessageId = response.ts ?? lastMessageId;
    }
  }
  return {
    messageId: lastMessageId || "unknown",
    channelId
  };
} /* v9-65307662d278b5f3 */
