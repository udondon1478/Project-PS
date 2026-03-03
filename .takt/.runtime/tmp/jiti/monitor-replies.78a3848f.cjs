"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createSlackReplyDeliveryPlan = createSlackReplyDeliveryPlan;exports.deliverReplies = deliverReplies;exports.deliverSlackSlashReplies = deliverSlackSlashReplies;exports.resolveSlackThreadTs = resolveSlackThreadTs;var _chunk = require("../../auto-reply/chunk.js");
var _replyReference = require("../../auto-reply/reply/reply-reference.js");
var _tokens = require("../../auto-reply/tokens.js");
var _format = require("../format.js");
var _send = require("../send.js");
async function deliverReplies(params) {
  for (const payload of params.replies) {
    const threadTs = payload.replyToId ?? params.replyThreadTs;
    const mediaList = payload.mediaUrls ?? (payload.mediaUrl ? [payload.mediaUrl] : []);
    const text = payload.text ?? "";
    if (!text && mediaList.length === 0) {
      continue;
    }
    if (mediaList.length === 0) {
      const trimmed = text.trim();
      if (!trimmed || (0, _tokens.isSilentReplyText)(trimmed, _tokens.SILENT_REPLY_TOKEN)) {
        continue;
      }
      await (0, _send.sendMessageSlack)(params.target, trimmed, {
        token: params.token,
        threadTs,
        accountId: params.accountId
      });
    } else
    {
      let first = true;
      for (const mediaUrl of mediaList) {
        const caption = first ? text : "";
        first = false;
        await (0, _send.sendMessageSlack)(params.target, caption, {
          token: params.token,
          mediaUrl,
          threadTs,
          accountId: params.accountId
        });
      }
    }
    params.runtime.log?.(`delivered reply to ${params.target}`);
  }
}
/**
 * Compute effective threadTs for a Slack reply based on replyToMode.
 * - "off": stay in thread if already in one, otherwise main channel
 * - "first": first reply goes to thread, subsequent replies to main channel
 * - "all": all replies go to thread
 */
function resolveSlackThreadTs(params) {
  const planner = createSlackReplyReferencePlanner({
    replyToMode: params.replyToMode,
    incomingThreadTs: params.incomingThreadTs,
    messageTs: params.messageTs,
    hasReplied: params.hasReplied
  });
  return planner.use();
}
function createSlackReplyReferencePlanner(params) {
  return (0, _replyReference.createReplyReferencePlanner)({
    replyToMode: params.replyToMode,
    existingId: params.incomingThreadTs,
    startId: params.messageTs,
    hasReplied: params.hasReplied
  });
}
function createSlackReplyDeliveryPlan(params) {
  const replyReference = createSlackReplyReferencePlanner({
    replyToMode: params.replyToMode,
    incomingThreadTs: params.incomingThreadTs,
    messageTs: params.messageTs,
    hasReplied: params.hasRepliedRef.value
  });
  return {
    nextThreadTs: () => replyReference.use(),
    markSent: () => {
      replyReference.markSent();
      params.hasRepliedRef.value = replyReference.hasReplied();
    }
  };
}
async function deliverSlackSlashReplies(params) {
  const messages = [];
  const chunkLimit = Math.min(params.textLimit, 4000);
  for (const payload of params.replies) {
    const textRaw = payload.text?.trim() ?? "";
    const text = textRaw && !(0, _tokens.isSilentReplyText)(textRaw, _tokens.SILENT_REPLY_TOKEN) ? textRaw : undefined;
    const mediaList = payload.mediaUrls ?? (payload.mediaUrl ? [payload.mediaUrl] : []);
    const combined = [text ?? "", ...mediaList.map((url) => url.trim()).filter(Boolean)].
    filter(Boolean).
    join("\n");
    if (!combined) {
      continue;
    }
    const chunkMode = params.chunkMode ?? "length";
    const markdownChunks = chunkMode === "newline" ?
    (0, _chunk.chunkMarkdownTextWithMode)(combined, chunkLimit, chunkMode) :
    [combined];
    const chunks = markdownChunks.flatMap((markdown) => (0, _format.markdownToSlackMrkdwnChunks)(markdown, chunkLimit, { tableMode: params.tableMode }));
    if (!chunks.length && combined) {
      chunks.push(combined);
    }
    for (const chunk of chunks) {
      messages.push(chunk);
    }
  }
  if (messages.length === 0) {
    return;
  }
  // Slack slash command responses can be multi-part by sending follow-ups via response_url.
  const responseType = params.ephemeral ? "ephemeral" : "in_channel";
  for (const text of messages) {
    await params.respond({ text, response_type: responseType });
  }
} /* v9-38397872d028bd2a */
