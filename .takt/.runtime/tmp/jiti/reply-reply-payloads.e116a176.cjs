"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applyReplyTagsToPayload = applyReplyTagsToPayload;exports.applyReplyThreading = applyReplyThreading;exports.filterMessagingToolDuplicates = filterMessagingToolDuplicates;exports.isRenderablePayload = isRenderablePayload;exports.shouldSuppressMessagingToolReplies = shouldSuppressMessagingToolReplies;var _piEmbeddedHelpers = require("../../agents/pi-embedded-helpers.js");
var _targetNormalization = require("../../infra/outbound/target-normalization.js");
var _replyTags = require("./reply-tags.js");
var _replyThreading = require("./reply-threading.js");
function applyReplyTagsToPayload(payload, currentMessageId) {
  if (typeof payload.text !== "string") {
    if (!payload.replyToCurrent || payload.replyToId) {
      return payload;
    }
    return {
      ...payload,
      replyToId: currentMessageId?.trim() || undefined
    };
  }
  const shouldParseTags = payload.text.includes("[[");
  if (!shouldParseTags) {
    if (!payload.replyToCurrent || payload.replyToId) {
      return payload;
    }
    return {
      ...payload,
      replyToId: currentMessageId?.trim() || undefined,
      replyToTag: payload.replyToTag ?? true
    };
  }
  const { cleaned, replyToId, replyToCurrent, hasTag } = (0, _replyTags.extractReplyToTag)(payload.text, currentMessageId);
  return {
    ...payload,
    text: cleaned ? cleaned : undefined,
    replyToId: replyToId ?? payload.replyToId,
    replyToTag: hasTag || payload.replyToTag,
    replyToCurrent: replyToCurrent || payload.replyToCurrent
  };
}
function isRenderablePayload(payload) {
  return Boolean(payload.text ||
  payload.mediaUrl ||
  payload.mediaUrls && payload.mediaUrls.length > 0 ||
  payload.audioAsVoice ||
  payload.channelData);
}
function applyReplyThreading(params) {
  const { payloads, replyToMode, replyToChannel, currentMessageId } = params;
  const applyReplyToMode = (0, _replyThreading.createReplyToModeFilterForChannel)(replyToMode, replyToChannel);
  return payloads.
  map((payload) => applyReplyTagsToPayload(payload, currentMessageId)).
  filter(isRenderablePayload).
  map(applyReplyToMode);
}
function filterMessagingToolDuplicates(params) {
  const { payloads, sentTexts } = params;
  if (sentTexts.length === 0) {
    return payloads;
  }
  return payloads.filter((payload) => !(0, _piEmbeddedHelpers.isMessagingToolDuplicate)(payload.text ?? "", sentTexts));
}
function normalizeAccountId(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
}
function shouldSuppressMessagingToolReplies(params) {
  const provider = params.messageProvider?.trim().toLowerCase();
  if (!provider) {
    return false;
  }
  const originTarget = (0, _targetNormalization.normalizeTargetForProvider)(provider, params.originatingTo);
  if (!originTarget) {
    return false;
  }
  const originAccount = normalizeAccountId(params.accountId);
  const sentTargets = params.messagingToolSentTargets ?? [];
  if (sentTargets.length === 0) {
    return false;
  }
  return sentTargets.some((target) => {
    if (!target?.provider) {
      return false;
    }
    if (target.provider.trim().toLowerCase() !== provider) {
      return false;
    }
    const targetKey = (0, _targetNormalization.normalizeTargetForProvider)(provider, target.to);
    if (!targetKey) {
      return false;
    }
    const targetAccount = normalizeAccountId(target.accountId);
    if (originAccount && targetAccount && originAccount !== targetAccount) {
      return false;
    }
    return targetKey === originTarget;
  });
} /* v9-87ab22f0bfce8c10 */
