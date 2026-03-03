"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.extractReplyToTag = extractReplyToTag;var _directiveTags = require("../../utils/directive-tags.js");
function extractReplyToTag(text, currentMessageId) {
  const result = (0, _directiveTags.parseInlineDirectives)(text, {
    currentMessageId,
    stripAudioTag: false
  });
  return {
    cleaned: result.text,
    replyToId: result.replyToId,
    replyToCurrent: result.replyToCurrent,
    hasTag: result.hasReplyTag
  };
} /* v9-a99cde1614f493ef */
