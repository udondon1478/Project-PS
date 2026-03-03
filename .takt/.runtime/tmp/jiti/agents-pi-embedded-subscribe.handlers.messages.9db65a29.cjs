"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleMessageEnd = handleMessageEnd;exports.handleMessageStart = handleMessageStart;exports.handleMessageUpdate = handleMessageUpdate;var _replyDirectives = require("../auto-reply/reply/reply-directives.js");
var _agentEvents = require("../infra/agent-events.js");
var _codeSpans = require("../markdown/code-spans.js");
var _piEmbeddedHelpers = require("./pi-embedded-helpers.js");
var _piEmbeddedSubscribeRawStream = require("./pi-embedded-subscribe.raw-stream.js");
var _piEmbeddedUtils = require("./pi-embedded-utils.js");
const stripTrailingDirective = (text) => {
  const openIndex = text.lastIndexOf("[[");
  if (openIndex < 0) {
    return text;
  }
  const closeIndex = text.indexOf("]]", openIndex + 2);
  if (closeIndex >= 0) {
    return text;
  }
  return text.slice(0, openIndex);
};
function handleMessageStart(ctx, evt) {
  const msg = evt.message;
  if (msg?.role !== "assistant") {
    return;
  }
  // KNOWN: Resetting at `text_end` is unsafe (late/duplicate end events).
  // ASSUME: `message_start` is the only reliable boundary for “new assistant message begins”.
  // Start-of-message is a safer reset point than message_end: some providers
  // may deliver late text_end updates after message_end, which would otherwise
  // re-trigger block replies.
  ctx.resetAssistantMessageState(ctx.state.assistantTexts.length);
  // Use assistant message_start as the earliest "writing" signal for typing.
  void ctx.params.onAssistantMessageStart?.();
}
function handleMessageUpdate(ctx, evt) {
  const msg = evt.message;
  if (msg?.role !== "assistant") {
    return;
  }
  const assistantEvent = evt.assistantMessageEvent;
  const assistantRecord = assistantEvent && typeof assistantEvent === "object" ?
  assistantEvent :
  undefined;
  const evtType = typeof assistantRecord?.type === "string" ? assistantRecord.type : "";
  if (evtType !== "text_delta" && evtType !== "text_start" && evtType !== "text_end") {
    return;
  }
  const delta = typeof assistantRecord?.delta === "string" ? assistantRecord.delta : "";
  const content = typeof assistantRecord?.content === "string" ? assistantRecord.content : "";
  (0, _piEmbeddedSubscribeRawStream.appendRawStream)({
    ts: Date.now(),
    event: "assistant_text_stream",
    runId: ctx.params.runId,
    sessionId: ctx.params.session.id,
    evtType,
    delta,
    content
  });
  let chunk = "";
  if (evtType === "text_delta") {
    chunk = delta;
  } else
  if (evtType === "text_start" || evtType === "text_end") {
    if (delta) {
      chunk = delta;
    } else
    if (content) {
      // KNOWN: Some providers resend full content on `text_end`.
      // We only append a suffix (or nothing) to keep output monotonic.
      if (content.startsWith(ctx.state.deltaBuffer)) {
        chunk = content.slice(ctx.state.deltaBuffer.length);
      } else
      if (ctx.state.deltaBuffer.startsWith(content)) {
        chunk = "";
      } else
      if (!ctx.state.deltaBuffer.includes(content)) {
        chunk = content;
      }
    }
  }
  if (chunk) {
    ctx.state.deltaBuffer += chunk;
    if (ctx.blockChunker) {
      ctx.blockChunker.append(chunk);
    } else
    {
      ctx.state.blockBuffer += chunk;
    }
  }
  if (ctx.state.streamReasoning) {
    // Handle partial <think> tags: stream whatever reasoning is visible so far.
    ctx.emitReasoningStream((0, _piEmbeddedUtils.extractThinkingFromTaggedStream)(ctx.state.deltaBuffer));
  }
  const next = ctx.
  stripBlockTags(ctx.state.deltaBuffer, {
    thinking: false,
    final: false,
    inlineCode: (0, _codeSpans.createInlineCodeState)()
  }).
  trim();
  if (next) {
    const visibleDelta = chunk ? ctx.stripBlockTags(chunk, ctx.state.partialBlockState) : "";
    const parsedDelta = visibleDelta ? ctx.consumePartialReplyDirectives(visibleDelta) : null;
    const parsedFull = (0, _replyDirectives.parseReplyDirectives)(stripTrailingDirective(next));
    const cleanedText = parsedFull.text;
    const mediaUrls = parsedDelta?.mediaUrls;
    const hasMedia = Boolean(mediaUrls && mediaUrls.length > 0);
    const hasAudio = Boolean(parsedDelta?.audioAsVoice);
    const previousCleaned = ctx.state.lastStreamedAssistantCleaned ?? "";
    let shouldEmit = false;
    let deltaText = "";
    if (!cleanedText && !hasMedia && !hasAudio) {
      shouldEmit = false;
    } else
    if (previousCleaned && !cleanedText.startsWith(previousCleaned)) {
      shouldEmit = false;
    } else
    {
      deltaText = cleanedText.slice(previousCleaned.length);
      shouldEmit = Boolean(deltaText || hasMedia || hasAudio);
    }
    ctx.state.lastStreamedAssistant = next;
    ctx.state.lastStreamedAssistantCleaned = cleanedText;
    if (shouldEmit) {
      (0, _agentEvents.emitAgentEvent)({
        runId: ctx.params.runId,
        stream: "assistant",
        data: {
          text: cleanedText,
          delta: deltaText,
          mediaUrls: hasMedia ? mediaUrls : undefined
        }
      });
      void ctx.params.onAgentEvent?.({
        stream: "assistant",
        data: {
          text: cleanedText,
          delta: deltaText,
          mediaUrls: hasMedia ? mediaUrls : undefined
        }
      });
      if (ctx.params.onPartialReply && ctx.state.shouldEmitPartialReplies) {
        void ctx.params.onPartialReply({
          text: cleanedText,
          mediaUrls: hasMedia ? mediaUrls : undefined
        });
      }
    }
  }
  if (ctx.params.onBlockReply && ctx.blockChunking && ctx.state.blockReplyBreak === "text_end") {
    ctx.blockChunker?.drain({ force: false, emit: ctx.emitBlockChunk });
  }
  if (evtType === "text_end" && ctx.state.blockReplyBreak === "text_end") {
    if (ctx.blockChunker?.hasBuffered()) {
      ctx.blockChunker.drain({ force: true, emit: ctx.emitBlockChunk });
      ctx.blockChunker.reset();
    } else
    if (ctx.state.blockBuffer.length > 0) {
      ctx.emitBlockChunk(ctx.state.blockBuffer);
      ctx.state.blockBuffer = "";
    }
  }
}
function handleMessageEnd(ctx, evt) {
  const msg = evt.message;
  if (msg?.role !== "assistant") {
    return;
  }
  const assistantMessage = msg;
  (0, _piEmbeddedUtils.promoteThinkingTagsToBlocks)(assistantMessage);
  const rawText = (0, _piEmbeddedUtils.extractAssistantText)(assistantMessage);
  (0, _piEmbeddedSubscribeRawStream.appendRawStream)({
    ts: Date.now(),
    event: "assistant_message_end",
    runId: ctx.params.runId,
    sessionId: ctx.params.session.id,
    rawText,
    rawThinking: (0, _piEmbeddedUtils.extractAssistantThinking)(assistantMessage)
  });
  const text = ctx.stripBlockTags(rawText, { thinking: false, final: false });
  const rawThinking = ctx.state.includeReasoning || ctx.state.streamReasoning ?
  (0, _piEmbeddedUtils.extractAssistantThinking)(assistantMessage) || (0, _piEmbeddedUtils.extractThinkingFromTaggedText)(rawText) :
  "";
  const formattedReasoning = rawThinking ? (0, _piEmbeddedUtils.formatReasoningMessage)(rawThinking) : "";
  const addedDuringMessage = ctx.state.assistantTexts.length > ctx.state.assistantTextBaseline;
  const chunkerHasBuffered = ctx.blockChunker?.hasBuffered() ?? false;
  ctx.finalizeAssistantTexts({ text, addedDuringMessage, chunkerHasBuffered });
  const onBlockReply = ctx.params.onBlockReply;
  const shouldEmitReasoning = Boolean(ctx.state.includeReasoning &&
  formattedReasoning &&
  onBlockReply &&
  formattedReasoning !== ctx.state.lastReasoningSent);
  const shouldEmitReasoningBeforeAnswer = shouldEmitReasoning && ctx.state.blockReplyBreak === "message_end" && !addedDuringMessage;
  const maybeEmitReasoning = () => {
    if (!shouldEmitReasoning || !formattedReasoning) {
      return;
    }
    ctx.state.lastReasoningSent = formattedReasoning;
    void onBlockReply?.({ text: formattedReasoning });
  };
  if (shouldEmitReasoningBeforeAnswer) {
    maybeEmitReasoning();
  }
  if ((ctx.state.blockReplyBreak === "message_end" || (
  ctx.blockChunker ? ctx.blockChunker.hasBuffered() : ctx.state.blockBuffer.length > 0)) &&
  text &&
  onBlockReply) {
    if (ctx.blockChunker?.hasBuffered()) {
      ctx.blockChunker.drain({ force: true, emit: ctx.emitBlockChunk });
      ctx.blockChunker.reset();
    } else
    if (text !== ctx.state.lastBlockReplyText) {
      // Check for duplicates before emitting (same logic as emitBlockChunk).
      const normalizedText = (0, _piEmbeddedHelpers.normalizeTextForComparison)(text);
      if ((0, _piEmbeddedHelpers.isMessagingToolDuplicateNormalized)(normalizedText, ctx.state.messagingToolSentTextsNormalized)) {
        ctx.log.debug(`Skipping message_end block reply - already sent via messaging tool: ${text.slice(0, 50)}...`);
      } else
      {
        ctx.state.lastBlockReplyText = text;
        const splitResult = ctx.consumeReplyDirectives(text, { final: true });
        if (splitResult) {
          const { text: cleanedText, mediaUrls, audioAsVoice, replyToId, replyToTag, replyToCurrent } = splitResult;
          // Emit if there's content OR audioAsVoice flag (to propagate the flag).
          if (cleanedText || mediaUrls && mediaUrls.length > 0 || audioAsVoice) {
            void onBlockReply({
              text: cleanedText,
              mediaUrls: mediaUrls?.length ? mediaUrls : undefined,
              audioAsVoice,
              replyToId,
              replyToTag,
              replyToCurrent
            });
          }
        }
      }
    }
  }
  if (!shouldEmitReasoningBeforeAnswer) {
    maybeEmitReasoning();
  }
  if (ctx.state.streamReasoning && rawThinking) {
    ctx.emitReasoningStream(rawThinking);
  }
  if (ctx.state.blockReplyBreak === "text_end" && onBlockReply) {
    const tailResult = ctx.consumeReplyDirectives("", { final: true });
    if (tailResult) {
      const { text: cleanedText, mediaUrls, audioAsVoice, replyToId, replyToTag, replyToCurrent } = tailResult;
      if (cleanedText || mediaUrls && mediaUrls.length > 0 || audioAsVoice) {
        void onBlockReply({
          text: cleanedText,
          mediaUrls: mediaUrls?.length ? mediaUrls : undefined,
          audioAsVoice,
          replyToId,
          replyToTag,
          replyToCurrent
        });
      }
    }
  }
  ctx.state.deltaBuffer = "";
  ctx.state.blockBuffer = "";
  ctx.blockChunker?.reset();
  ctx.state.blockState.thinking = false;
  ctx.state.blockState.final = false;
  ctx.state.blockState.inlineCode = (0, _codeSpans.createInlineCodeState)();
  ctx.state.lastStreamedAssistant = undefined;
  ctx.state.lastStreamedAssistantCleaned = undefined;
} /* v9-c93b07711b4b65d2 */
