"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.parseAudioTag = parseAudioTag;var _directiveTags = require("../utils/directive-tags.js");
/**
 * Extract audio mode tag from text.
 * Supports [[audio_as_voice]] to send audio as voice bubble instead of file.
 * Default is file (preserves backward compatibility).
 */
function parseAudioTag(text) {
  const result = (0, _directiveTags.parseInlineDirectives)(text, { stripReplyTags: false });
  return {
    text: result.text,
    audioAsVoice: result.audioAsVoice,
    hadTag: result.hasAudioTag
  };
} /* v9-f787a693251ffa88 */
