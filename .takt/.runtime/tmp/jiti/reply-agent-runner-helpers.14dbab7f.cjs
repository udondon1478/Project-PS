"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.signalTypingIfNeeded = exports.isAudioPayload = exports.finalizeWithFollowup = exports.createShouldEmitToolResult = exports.createShouldEmitToolOutput = void 0;var _sessions = require("../../config/sessions.js");
var _mime = require("../../media/mime.js");
var _thinking = require("../thinking.js");
var _queue = require("./queue.js");
const hasAudioMedia = (urls) => Boolean(urls?.some((url) => (0, _mime.isAudioFileName)(url)));
const isAudioPayload = (payload) => hasAudioMedia(payload.mediaUrls ?? (payload.mediaUrl ? [payload.mediaUrl] : undefined));exports.isAudioPayload = isAudioPayload;
const createShouldEmitToolResult = (params) => {
  // Normalize verbose values from session store/config so false/"false" still means off.
  const fallbackVerbose = (0, _thinking.normalizeVerboseLevel)(String(params.resolvedVerboseLevel ?? "")) ?? "off";
  return () => {
    if (!params.sessionKey || !params.storePath) {
      return fallbackVerbose !== "off";
    }
    try {
      const store = (0, _sessions.loadSessionStore)(params.storePath);
      const entry = store[params.sessionKey];
      const current = (0, _thinking.normalizeVerboseLevel)(String(entry?.verboseLevel ?? ""));
      if (current) {
        return current !== "off";
      }
    }
    catch {

      // ignore store read failures
    }return fallbackVerbose !== "off";
  };
};exports.createShouldEmitToolResult = createShouldEmitToolResult;
const createShouldEmitToolOutput = (params) => {
  // Normalize verbose values from session store/config so false/"false" still means off.
  const fallbackVerbose = (0, _thinking.normalizeVerboseLevel)(String(params.resolvedVerboseLevel ?? "")) ?? "off";
  return () => {
    if (!params.sessionKey || !params.storePath) {
      return fallbackVerbose === "full";
    }
    try {
      const store = (0, _sessions.loadSessionStore)(params.storePath);
      const entry = store[params.sessionKey];
      const current = (0, _thinking.normalizeVerboseLevel)(String(entry?.verboseLevel ?? ""));
      if (current) {
        return current === "full";
      }
    }
    catch {

      // ignore store read failures
    }return fallbackVerbose === "full";
  };
};exports.createShouldEmitToolOutput = createShouldEmitToolOutput;
const finalizeWithFollowup = (value, queueKey, runFollowupTurn) => {
  (0, _queue.scheduleFollowupDrain)(queueKey, runFollowupTurn);
  return value;
};exports.finalizeWithFollowup = finalizeWithFollowup;
const signalTypingIfNeeded = async (payloads, typingSignals) => {
  const shouldSignalTyping = payloads.some((payload) => {
    const trimmed = payload.text?.trim();
    if (trimmed) {
      return true;
    }
    if (payload.mediaUrl) {
      return true;
    }
    if (payload.mediaUrls && payload.mediaUrls.length > 0) {
      return true;
    }
    return false;
  });
  if (shouldSignalTyping) {
    await typingSignals.signalRunStart();
  }
};exports.signalTypingIfNeeded = signalTypingIfNeeded; /* v9-20ad572d3500e6b5 */
