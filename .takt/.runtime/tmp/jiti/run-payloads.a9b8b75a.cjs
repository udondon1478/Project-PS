"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildEmbeddedRunPayloads = buildEmbeddedRunPayloads;var _replyDirectives = require("../../../auto-reply/reply/reply-directives.js");
var _tokens = require("../../../auto-reply/tokens.js");
var _toolMeta = require("../../../auto-reply/tool-meta.js");
var _piEmbeddedHelpers = require("../../pi-embedded-helpers.js");
var _piEmbeddedUtils = require("../../pi-embedded-utils.js");
function buildEmbeddedRunPayloads(params) {
  const replyItems = [];
  const useMarkdown = params.toolResultFormat === "markdown";
  const lastAssistantErrored = params.lastAssistant?.stopReason === "error";
  const errorText = params.lastAssistant ?
  (0, _piEmbeddedHelpers.formatAssistantErrorText)(params.lastAssistant, {
    cfg: params.config,
    sessionKey: params.sessionKey
  }) :
  undefined;
  const rawErrorMessage = lastAssistantErrored ?
  params.lastAssistant?.errorMessage?.trim() || undefined :
  undefined;
  const rawErrorFingerprint = rawErrorMessage ?
  (0, _piEmbeddedHelpers.getApiErrorPayloadFingerprint)(rawErrorMessage) :
  null;
  const formattedRawErrorMessage = rawErrorMessage ?
  (0, _piEmbeddedHelpers.formatRawAssistantErrorForUi)(rawErrorMessage) :
  null;
  const normalizedFormattedRawErrorMessage = formattedRawErrorMessage ?
  (0, _piEmbeddedHelpers.normalizeTextForComparison)(formattedRawErrorMessage) :
  null;
  const normalizedRawErrorText = rawErrorMessage ?
  (0, _piEmbeddedHelpers.normalizeTextForComparison)(rawErrorMessage) :
  null;
  const normalizedErrorText = errorText ? (0, _piEmbeddedHelpers.normalizeTextForComparison)(errorText) : null;
  const genericErrorText = "The AI service returned an error. Please try again.";
  if (errorText) {
    replyItems.push({ text: errorText, isError: true });
  }
  const inlineToolResults = params.inlineToolResultsAllowed && params.verboseLevel !== "off" && params.toolMetas.length > 0;
  if (inlineToolResults) {
    for (const { toolName, meta } of params.toolMetas) {
      const agg = (0, _toolMeta.formatToolAggregate)(toolName, meta ? [meta] : [], {
        markdown: useMarkdown
      });
      const { text: cleanedText, mediaUrls, audioAsVoice, replyToId, replyToTag, replyToCurrent } = (0, _replyDirectives.parseReplyDirectives)(agg);
      if (cleanedText) {
        replyItems.push({
          text: cleanedText,
          media: mediaUrls,
          audioAsVoice,
          replyToId,
          replyToTag,
          replyToCurrent
        });
      }
    }
  }
  const reasoningText = params.lastAssistant && params.reasoningLevel === "on" ?
  (0, _piEmbeddedUtils.formatReasoningMessage)((0, _piEmbeddedUtils.extractAssistantThinking)(params.lastAssistant)) :
  "";
  if (reasoningText) {
    replyItems.push({ text: reasoningText });
  }
  const fallbackAnswerText = params.lastAssistant ? (0, _piEmbeddedUtils.extractAssistantText)(params.lastAssistant) : "";
  const shouldSuppressRawErrorText = (text) => {
    if (!lastAssistantErrored) {
      return false;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return false;
    }
    if (errorText) {
      const normalized = (0, _piEmbeddedHelpers.normalizeTextForComparison)(trimmed);
      if (normalized && normalizedErrorText && normalized === normalizedErrorText) {
        return true;
      }
      if (trimmed === genericErrorText) {
        return true;
      }
    }
    if (rawErrorMessage && trimmed === rawErrorMessage) {
      return true;
    }
    if (formattedRawErrorMessage && trimmed === formattedRawErrorMessage) {
      return true;
    }
    if (normalizedRawErrorText) {
      const normalized = (0, _piEmbeddedHelpers.normalizeTextForComparison)(trimmed);
      if (normalized && normalized === normalizedRawErrorText) {
        return true;
      }
    }
    if (normalizedFormattedRawErrorMessage) {
      const normalized = (0, _piEmbeddedHelpers.normalizeTextForComparison)(trimmed);
      if (normalized && normalized === normalizedFormattedRawErrorMessage) {
        return true;
      }
    }
    if (rawErrorFingerprint) {
      const fingerprint = (0, _piEmbeddedHelpers.getApiErrorPayloadFingerprint)(trimmed);
      if (fingerprint && fingerprint === rawErrorFingerprint) {
        return true;
      }
    }
    return (0, _piEmbeddedHelpers.isRawApiErrorPayload)(trimmed);
  };
  const answerTexts = (params.assistantTexts.length ?
  params.assistantTexts :
  fallbackAnswerText ?
  [fallbackAnswerText] :
  []).filter((text) => !shouldSuppressRawErrorText(text));
  for (const text of answerTexts) {
    const { text: cleanedText, mediaUrls, audioAsVoice, replyToId, replyToTag, replyToCurrent } = (0, _replyDirectives.parseReplyDirectives)(text);
    if (!cleanedText && (!mediaUrls || mediaUrls.length === 0) && !audioAsVoice) {
      continue;
    }
    replyItems.push({
      text: cleanedText,
      media: mediaUrls,
      audioAsVoice,
      replyToId,
      replyToTag,
      replyToCurrent
    });
  }
  if (params.lastToolError) {
    const lastAssistantHasToolCalls = Array.isArray(params.lastAssistant?.content) &&
    params.lastAssistant?.content.some((block) => block && typeof block === "object" ?
    block.type === "toolCall" :
    false);
    const lastAssistantWasToolUse = params.lastAssistant?.stopReason === "toolUse";
    const hasUserFacingReply = replyItems.length > 0 && !lastAssistantHasToolCalls && !lastAssistantWasToolUse;
    // Check if this is a recoverable/internal tool error that shouldn't be shown to users
    // when there's already a user-facing reply (the model should have retried).
    const errorLower = (params.lastToolError.error ?? "").toLowerCase();
    const isRecoverableError = errorLower.includes("required") ||
    errorLower.includes("missing") ||
    errorLower.includes("invalid") ||
    errorLower.includes("must be") ||
    errorLower.includes("must have") ||
    errorLower.includes("needs") ||
    errorLower.includes("requires");
    // Show tool errors only when:
    // 1. There's no user-facing reply AND the error is not recoverable
    // Recoverable errors (validation, missing params) are already in the model's context
    // and shouldn't be surfaced to users since the model should retry.
    if (!hasUserFacingReply && !isRecoverableError) {
      const toolSummary = (0, _toolMeta.formatToolAggregate)(params.lastToolError.toolName, params.lastToolError.meta ? [params.lastToolError.meta] : undefined, { markdown: useMarkdown });
      const errorSuffix = params.lastToolError.error ? `: ${params.lastToolError.error}` : "";
      replyItems.push({
        text: `⚠️ ${toolSummary} failed${errorSuffix}`,
        isError: true
      });
    }
  }
  const hasAudioAsVoiceTag = replyItems.some((item) => item.audioAsVoice);
  return replyItems.
  map((item) => ({
    text: item.text?.trim() ? item.text.trim() : undefined,
    mediaUrls: item.media?.length ? item.media : undefined,
    mediaUrl: item.media?.[0],
    isError: item.isError,
    replyToId: item.replyToId,
    replyToTag: item.replyToTag,
    replyToCurrent: item.replyToCurrent,
    audioAsVoice: item.audioAsVoice || Boolean(hasAudioAsVoiceTag && item.media?.length)
  })).
  filter((p) => {
    if (!p.text && !p.mediaUrl && (!p.mediaUrls || p.mediaUrls.length === 0)) {
      return false;
    }
    if (p.text && (0, _tokens.isSilentReplyText)(p.text, _tokens.SILENT_REPLY_TOKEN)) {
      return false;
    }
    return true;
  });
} /* v9-bc0d4ef1d3998af0 */
