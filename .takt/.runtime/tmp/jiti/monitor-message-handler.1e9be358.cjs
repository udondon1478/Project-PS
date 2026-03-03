"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createDiscordMessageHandler = createDiscordMessageHandler;var _commandDetection = require("../../auto-reply/command-detection.js");
var _inboundDebounce = require("../../auto-reply/inbound-debounce.js");
var _globals = require("../../globals.js");
var _messageHandlerPreflight = require("./message-handler.preflight.js");
var _messageHandlerProcess = require("./message-handler.process.js");
var _messageUtils = require("./message-utils.js");
function createDiscordMessageHandler(params) {
  const groupPolicy = params.discordConfig?.groupPolicy ?? "open";
  const ackReactionScope = params.cfg.messages?.ackReactionScope ?? "group-mentions";
  const debounceMs = (0, _inboundDebounce.resolveInboundDebounceMs)({ cfg: params.cfg, channel: "discord" });
  const debouncer = (0, _inboundDebounce.createInboundDebouncer)({
    debounceMs,
    buildKey: (entry) => {
      const message = entry.data.message;
      const authorId = entry.data.author?.id;
      if (!message || !authorId) {
        return null;
      }
      const channelId = message.channelId;
      if (!channelId) {
        return null;
      }
      return `discord:${params.accountId}:${channelId}:${authorId}`;
    },
    shouldDebounce: (entry) => {
      const message = entry.data.message;
      if (!message) {
        return false;
      }
      if (message.attachments && message.attachments.length > 0) {
        return false;
      }
      const baseText = (0, _messageUtils.resolveDiscordMessageText)(message, { includeForwarded: false });
      if (!baseText.trim()) {
        return false;
      }
      return !(0, _commandDetection.hasControlCommand)(baseText, params.cfg);
    },
    onFlush: async (entries) => {
      const last = entries.at(-1);
      if (!last) {
        return;
      }
      if (entries.length === 1) {
        const ctx = await (0, _messageHandlerPreflight.preflightDiscordMessage)({
          ...params,
          ackReactionScope,
          groupPolicy,
          data: last.data,
          client: last.client
        });
        if (!ctx) {
          return;
        }
        await (0, _messageHandlerProcess.processDiscordMessage)(ctx);
        return;
      }
      const combinedBaseText = entries.
      map((entry) => (0, _messageUtils.resolveDiscordMessageText)(entry.data.message, { includeForwarded: false })).
      filter(Boolean).
      join("\n");
      const syntheticMessage = {
        ...last.data.message,
        content: combinedBaseText,
        attachments: [],
        message_snapshots: last.data.message.message_snapshots,
        messageSnapshots: last.data.message.messageSnapshots,
        rawData: {
          ...last.data.message.rawData
        }
      };
      const syntheticData = {
        ...last.data,
        message: syntheticMessage
      };
      const ctx = await (0, _messageHandlerPreflight.preflightDiscordMessage)({
        ...params,
        ackReactionScope,
        groupPolicy,
        data: syntheticData,
        client: last.client
      });
      if (!ctx) {
        return;
      }
      if (entries.length > 1) {
        const ids = entries.map((entry) => entry.data.message?.id).filter(Boolean);
        if (ids.length > 0) {
          const ctxBatch = ctx;
          ctxBatch.MessageSids = ids;
          ctxBatch.MessageSidFirst = ids[0];
          ctxBatch.MessageSidLast = ids[ids.length - 1];
        }
      }
      await (0, _messageHandlerProcess.processDiscordMessage)(ctx);
    },
    onError: (err) => {
      params.runtime.error?.((0, _globals.danger)(`discord debounce flush failed: ${String(err)}`));
    }
  });
  return async (data, client) => {
    try {
      await debouncer.enqueue({ data, client });
    }
    catch (err) {
      params.runtime.error?.((0, _globals.danger)(`handler failed: ${String(err)}`));
    }
  };
} /* v9-947897c65c92672d */
