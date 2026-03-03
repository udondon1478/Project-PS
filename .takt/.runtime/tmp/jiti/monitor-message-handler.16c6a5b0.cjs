"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createSlackMessageHandler = createSlackMessageHandler;var _commandDetection = require("../../auto-reply/command-detection.js");
var _inboundDebounce = require("../../auto-reply/inbound-debounce.js");
var _dispatch = require("./message-handler/dispatch.js");
var _prepare = require("./message-handler/prepare.js");
var _threadResolution = require("./thread-resolution.js");
function createSlackMessageHandler(params) {
  const { ctx, account } = params;
  const debounceMs = (0, _inboundDebounce.resolveInboundDebounceMs)({ cfg: ctx.cfg, channel: "slack" });
  const threadTsResolver = (0, _threadResolution.createSlackThreadTsResolver)({ client: ctx.app.client });
  const debouncer = (0, _inboundDebounce.createInboundDebouncer)({
    debounceMs,
    buildKey: (entry) => {
      const senderId = entry.message.user ?? entry.message.bot_id;
      if (!senderId) {
        return null;
      }
      const messageTs = entry.message.ts ?? entry.message.event_ts;
      // If Slack flags a thread reply but omits thread_ts, isolate it from root debouncing.
      const threadKey = entry.message.thread_ts ?
      `${entry.message.channel}:${entry.message.thread_ts}` :
      entry.message.parent_user_id && messageTs ?
      `${entry.message.channel}:maybe-thread:${messageTs}` :
      entry.message.channel;
      return `slack:${ctx.accountId}:${threadKey}:${senderId}`;
    },
    shouldDebounce: (entry) => {
      const text = entry.message.text ?? "";
      if (!text.trim()) {
        return false;
      }
      if (entry.message.files && entry.message.files.length > 0) {
        return false;
      }
      return !(0, _commandDetection.hasControlCommand)(text, ctx.cfg);
    },
    onFlush: async (entries) => {
      const last = entries.at(-1);
      if (!last) {
        return;
      }
      const combinedText = entries.length === 1 ?
      last.message.text ?? "" :
      entries.
      map((entry) => entry.message.text ?? "").
      filter(Boolean).
      join("\n");
      const combinedMentioned = entries.some((entry) => Boolean(entry.opts.wasMentioned));
      const syntheticMessage = {
        ...last.message,
        text: combinedText
      };
      const prepared = await (0, _prepare.prepareSlackMessage)({
        ctx,
        account,
        message: syntheticMessage,
        opts: {
          ...last.opts,
          wasMentioned: combinedMentioned || last.opts.wasMentioned
        }
      });
      if (!prepared) {
        return;
      }
      if (entries.length > 1) {
        const ids = entries.map((entry) => entry.message.ts).filter(Boolean);
        if (ids.length > 0) {
          prepared.ctxPayload.MessageSids = ids;
          prepared.ctxPayload.MessageSidFirst = ids[0];
          prepared.ctxPayload.MessageSidLast = ids[ids.length - 1];
        }
      }
      await (0, _dispatch.dispatchPreparedSlackMessage)(prepared);
    },
    onError: (err) => {
      ctx.runtime.error?.(`slack inbound debounce flush failed: ${String(err)}`);
    }
  });
  return async (message, opts) => {
    if (opts.source === "message" && message.type !== "message") {
      return;
    }
    if (opts.source === "message" &&
    message.subtype &&
    message.subtype !== "file_share" &&
    message.subtype !== "bot_message") {
      return;
    }
    if (ctx.markMessageSeen(message.channel, message.ts)) {
      return;
    }
    const resolvedMessage = await threadTsResolver.resolve({ message, source: opts.source });
    await debouncer.enqueue({ message: resolvedMessage, opts });
  };
} /* v9-27d0d849529f7fa9 */
