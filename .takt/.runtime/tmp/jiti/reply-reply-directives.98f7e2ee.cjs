"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.parseReplyDirectives = parseReplyDirectives;var _parse = require("../../media/parse.js");
var _directiveTags = require("../../utils/directive-tags.js");
var _tokens = require("../tokens.js");
function parseReplyDirectives(raw, options = {}) {
  const split = (0, _parse.splitMediaFromOutput)(raw);
  let text = split.text ?? "";
  const replyParsed = (0, _directiveTags.parseInlineDirectives)(text, {
    currentMessageId: options.currentMessageId,
    stripAudioTag: false,
    stripReplyTags: true
  });
  if (replyParsed.hasReplyTag) {
    text = replyParsed.text;
  }
  const silentToken = options.silentToken ?? _tokens.SILENT_REPLY_TOKEN;
  const isSilent = (0, _tokens.isSilentReplyText)(text, silentToken);
  if (isSilent) {
    text = "";
  }
  return {
    text,
    mediaUrls: split.mediaUrls,
    mediaUrl: split.mediaUrl,
    replyToId: replyParsed.replyToId,
    replyToCurrent: replyParsed.replyToCurrent,
    replyToTag: replyParsed.hasReplyTag,
    audioAsVoice: split.audioAsVoice,
    isSilent
  };
} /* v9-29e543054cc6628e */
