"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.dispatchTelegramMessage = void 0;var _agentScope = require("../agents/agent-scope.js");

var _modelCatalog = require("../agents/model-catalog.js");
var _modelSelection = require("../agents/model-selection.js");
var _piEmbeddedBlockChunker = require("../agents/pi-embedded-block-chunker.js");
var _chunk = require("../auto-reply/chunk.js");
var _history = require("../auto-reply/reply/history.js");
var _providerDispatcher = require("../auto-reply/reply/provider-dispatcher.js");
var _ackReactions = require("../channels/ack-reactions.js");
var _logging = require("../channels/logging.js");
var _replyPrefix = require("../channels/reply-prefix.js");
var _typing = require("../channels/typing.js");
var _markdownTables = require("../config/markdown-tables.js");
var _globals = require("../globals.js");
var _delivery = require("./bot/delivery.js");
var _draftChunking = require("./draft-chunking.js");
var _draftStream = require("./draft-stream.js");
var _stickerCache = require("./sticker-cache.js"); // @ts-nocheck
const EMPTY_RESPONSE_FALLBACK = "No response generated. Please try again.";
async function resolveStickerVisionSupport(cfg, agentId) {
  try {
    const catalog = await (0, _modelCatalog.loadModelCatalog)({ config: cfg });
    const defaultModel = (0, _modelSelection.resolveDefaultModelForAgent)({ cfg, agentId });
    const entry = (0, _modelCatalog.findModelInCatalog)(catalog, defaultModel.provider, defaultModel.model);
    if (!entry) {
      return false;
    }
    return (0, _modelCatalog.modelSupportsVision)(entry);
  }
  catch {
    return false;
  }
}
const dispatchTelegramMessage = async ({ context, bot, cfg, runtime, replyToMode, streamMode, textLimit, telegramCfg, opts, resolveBotTopicsEnabled
  // oxlint-disable-next-line typescript/no-explicit-any
}) => {
  const { ctxPayload, primaryCtx, msg, chatId, isGroup, threadSpec, historyKey, historyLimit, groupHistories, route, skillFilter, sendTyping, sendRecordVoice, ackReactionPromise, reactionApi, removeAckAfterReply } = context;
  const isPrivateChat = msg.chat.type === "private";
  const draftThreadId = threadSpec.id;
  const draftMaxChars = Math.min(textLimit, 4096);
  const canStreamDraft = streamMode !== "off" &&
  isPrivateChat &&
  typeof draftThreadId === "number" && (
  await resolveBotTopicsEnabled(primaryCtx));
  const draftStream = canStreamDraft ?
  (0, _draftStream.createTelegramDraftStream)({
    api: bot.api,
    chatId,
    draftId: msg.message_id || Date.now(),
    maxChars: draftMaxChars,
    thread: threadSpec,
    log: _globals.logVerbose,
    warn: _globals.logVerbose
  }) :
  undefined;
  const draftChunking = draftStream && streamMode === "block" ?
  (0, _draftChunking.resolveTelegramDraftStreamingChunking)(cfg, route.accountId) :
  undefined;
  const draftChunker = draftChunking ? new _piEmbeddedBlockChunker.EmbeddedBlockChunker(draftChunking) : undefined;
  let lastPartialText = "";
  let draftText = "";
  const updateDraftFromPartial = (text) => {
    if (!draftStream || !text) {
      return;
    }
    if (text === lastPartialText) {
      return;
    }
    if (streamMode === "partial") {
      lastPartialText = text;
      draftStream.update(text);
      return;
    }
    let delta = text;
    if (text.startsWith(lastPartialText)) {
      delta = text.slice(lastPartialText.length);
    } else
    {
      // Streaming buffer reset (or non-monotonic stream). Start fresh.
      draftChunker?.reset();
      draftText = "";
    }
    lastPartialText = text;
    if (!delta) {
      return;
    }
    if (!draftChunker) {
      draftText = text;
      draftStream.update(draftText);
      return;
    }
    draftChunker.append(delta);
    draftChunker.drain({
      force: false,
      emit: (chunk) => {
        draftText += chunk;
        draftStream.update(draftText);
      }
    });
  };
  const flushDraft = async () => {
    if (!draftStream) {
      return;
    }
    if (draftChunker?.hasBuffered()) {
      draftChunker.drain({
        force: true,
        emit: (chunk) => {
          draftText += chunk;
        }
      });
      draftChunker.reset();
      if (draftText) {
        draftStream.update(draftText);
      }
    }
    await draftStream.flush();
  };
  const disableBlockStreaming = Boolean(draftStream) || (
  typeof telegramCfg.blockStreaming === "boolean" ? !telegramCfg.blockStreaming : undefined);
  const prefixContext = (0, _replyPrefix.createReplyPrefixContext)({ cfg, agentId: route.agentId });
  const tableMode = (0, _markdownTables.resolveMarkdownTableMode)({
    cfg,
    channel: "telegram",
    accountId: route.accountId
  });
  const chunkMode = (0, _chunk.resolveChunkMode)(cfg, "telegram", route.accountId);
  // Handle uncached stickers: get a dedicated vision description before dispatch
  // This ensures we cache a raw description rather than a conversational response
  const sticker = ctxPayload.Sticker;
  if (sticker?.fileUniqueId && ctxPayload.MediaPath) {
    const agentDir = (0, _agentScope.resolveAgentDir)(cfg, route.agentId);
    const stickerSupportsVision = await resolveStickerVisionSupport(cfg, route.agentId);
    let description = sticker.cachedDescription ?? null;
    if (!description) {
      description = await (0, _stickerCache.describeStickerImage)({
        imagePath: ctxPayload.MediaPath,
        cfg,
        agentDir,
        agentId: route.agentId
      });
    }
    if (description) {
      // Format the description with sticker context
      const stickerContext = [sticker.emoji, sticker.setName ? `from "${sticker.setName}"` : null].
      filter(Boolean).
      join(" ");
      const formattedDesc = `[Sticker${stickerContext ? ` ${stickerContext}` : ""}] ${description}`;
      sticker.cachedDescription = description;
      if (!stickerSupportsVision) {
        // Update context to use description instead of image
        ctxPayload.Body = formattedDesc;
        ctxPayload.BodyForAgent = formattedDesc;
        // Clear media paths so native vision doesn't process the image again
        ctxPayload.MediaPath = undefined;
        ctxPayload.MediaType = undefined;
        ctxPayload.MediaUrl = undefined;
        ctxPayload.MediaPaths = undefined;
        ctxPayload.MediaUrls = undefined;
        ctxPayload.MediaTypes = undefined;
      }
      // Cache the description for future encounters
      (0, _stickerCache.cacheSticker)({
        fileId: sticker.fileId,
        fileUniqueId: sticker.fileUniqueId,
        emoji: sticker.emoji,
        setName: sticker.setName,
        description,
        cachedAt: new Date().toISOString(),
        receivedFrom: ctxPayload.From
      });
      (0, _globals.logVerbose)(`telegram: cached sticker description for ${sticker.fileUniqueId}`);
    }
  }
  const replyQuoteText = ctxPayload.ReplyToIsQuote && ctxPayload.ReplyToBody ?
  ctxPayload.ReplyToBody.trim() || undefined :
  undefined;
  const deliveryState = {
    delivered: false,
    skippedNonSilent: 0
  };
  const { queuedFinal } = await (0, _providerDispatcher.dispatchReplyWithBufferedBlockDispatcher)({
    ctx: ctxPayload,
    cfg,
    dispatcherOptions: {
      responsePrefix: prefixContext.responsePrefix,
      responsePrefixContextProvider: prefixContext.responsePrefixContextProvider,
      deliver: async (payload, info) => {
        if (info.kind === "final") {
          await flushDraft();
          draftStream?.stop();
        }
        const result = await (0, _delivery.deliverReplies)({
          replies: [payload],
          chatId: String(chatId),
          token: opts.token,
          runtime,
          bot,
          replyToMode,
          textLimit,
          thread: threadSpec,
          tableMode,
          chunkMode,
          onVoiceRecording: sendRecordVoice,
          linkPreview: telegramCfg.linkPreview,
          replyQuoteText
        });
        if (result.delivered) {
          deliveryState.delivered = true;
        }
      },
      onSkip: (_payload, info) => {
        if (info.reason !== "silent") {
          deliveryState.skippedNonSilent += 1;
        }
      },
      onError: (err, info) => {
        runtime.error?.((0, _globals.danger)(`telegram ${info.kind} reply failed: ${String(err)}`));
      },
      onReplyStart: (0, _typing.createTypingCallbacks)({
        start: sendTyping,
        onStartError: (err) => {
          (0, _logging.logTypingFailure)({
            log: _globals.logVerbose,
            channel: "telegram",
            target: String(chatId),
            error: err
          });
        }
      }).onReplyStart
    },
    replyOptions: {
      skillFilter,
      disableBlockStreaming,
      onPartialReply: draftStream ? (payload) => updateDraftFromPartial(payload.text) : undefined,
      onModelSelected: (ctx) => {
        prefixContext.onModelSelected(ctx);
      }
    }
  });
  draftStream?.stop();
  let sentFallback = false;
  if (!deliveryState.delivered && deliveryState.skippedNonSilent > 0) {
    const result = await (0, _delivery.deliverReplies)({
      replies: [{ text: EMPTY_RESPONSE_FALLBACK }],
      chatId: String(chatId),
      token: opts.token,
      runtime,
      bot,
      replyToMode,
      textLimit,
      thread: threadSpec,
      tableMode,
      chunkMode,
      linkPreview: telegramCfg.linkPreview,
      replyQuoteText
    });
    sentFallback = result.delivered;
  }
  const hasFinalResponse = queuedFinal || sentFallback;
  if (!hasFinalResponse) {
    if (isGroup && historyKey) {
      (0, _history.clearHistoryEntriesIfEnabled)({ historyMap: groupHistories, historyKey, limit: historyLimit });
    }
    return;
  }
  (0, _ackReactions.removeAckReactionAfterReply)({
    removeAfterReply: removeAckAfterReply,
    ackReactionPromise,
    ackReactionValue: ackReactionPromise ? "ack" : null,
    remove: () => reactionApi?.(chatId, msg.message_id ?? 0, []) ?? Promise.resolve(),
    onError: (err) => {
      if (!msg.message_id) {
        return;
      }
      (0, _logging.logAckFailure)({
        log: _globals.logVerbose,
        channel: "telegram",
        target: `${chatId}/${msg.message_id}`,
        error: err
      });
    }
  });
  if (isGroup && historyKey) {
    (0, _history.clearHistoryEntriesIfEnabled)({ historyMap: groupHistories, historyKey, limit: historyLimit });
  }
};exports.dispatchTelegramMessage = dispatchTelegramMessage; /* v9-869f1bac43ef94f3 */
