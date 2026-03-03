"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeReplyPayload = normalizeReplyPayload;var _piEmbeddedHelpers = require("../../agents/pi-embedded-helpers.js");
var _heartbeat = require("../heartbeat.js");
var _tokens = require("../tokens.js");
var _lineDirectives = require("./line-directives.js");
var _responsePrefixTemplate = require("./response-prefix-template.js");
function normalizeReplyPayload(payload, opts = {}) {
  const hasMedia = Boolean(payload.mediaUrl || (payload.mediaUrls?.length ?? 0) > 0);
  const hasChannelData = Boolean(payload.channelData && Object.keys(payload.channelData).length > 0);
  const trimmed = payload.text?.trim() ?? "";
  if (!trimmed && !hasMedia && !hasChannelData) {
    opts.onSkip?.("empty");
    return null;
  }
  const silentToken = opts.silentToken ?? _tokens.SILENT_REPLY_TOKEN;
  let text = payload.text ?? undefined;
  if (text && (0, _tokens.isSilentReplyText)(text, silentToken)) {
    if (!hasMedia && !hasChannelData) {
      opts.onSkip?.("silent");
      return null;
    }
    text = "";
  }
  if (text && !trimmed) {
    // Keep empty text when media exists so media-only replies still send.
    text = "";
  }
  const shouldStripHeartbeat = opts.stripHeartbeat ?? true;
  if (shouldStripHeartbeat && text?.includes(_tokens.HEARTBEAT_TOKEN)) {
    const stripped = (0, _heartbeat.stripHeartbeatToken)(text, { mode: "message" });
    if (stripped.didStrip) {
      opts.onHeartbeatStrip?.();
    }
    if (stripped.shouldSkip && !hasMedia && !hasChannelData) {
      opts.onSkip?.("heartbeat");
      return null;
    }
    text = stripped.text;
  }
  if (text) {
    text = (0, _piEmbeddedHelpers.sanitizeUserFacingText)(text);
  }
  if (!text?.trim() && !hasMedia && !hasChannelData) {
    opts.onSkip?.("empty");
    return null;
  }
  // Parse LINE-specific directives from text (quick_replies, location, confirm, buttons)
  let enrichedPayload = { ...payload, text };
  if (text && (0, _lineDirectives.hasLineDirectives)(text)) {
    enrichedPayload = (0, _lineDirectives.parseLineDirectives)(enrichedPayload);
    text = enrichedPayload.text;
  }
  // Resolve template variables in responsePrefix if context is provided
  const effectivePrefix = opts.responsePrefixContext ?
  (0, _responsePrefixTemplate.resolveResponsePrefixTemplate)(opts.responsePrefix, opts.responsePrefixContext) :
  opts.responsePrefix;
  if (effectivePrefix &&
  text &&
  text.trim() !== _tokens.HEARTBEAT_TOKEN &&
  !text.startsWith(effectivePrefix)) {
    text = `${effectivePrefix} ${text}`;
  }
  return { ...enrichedPayload, text };
} /* v9-fbd6688b370eb1f2 */
