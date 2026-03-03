"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isTelegramVoiceCompatible = isTelegramVoiceCompatible;exports.resolveTelegramVoiceDecision = resolveTelegramVoiceDecision;exports.resolveTelegramVoiceSend = resolveTelegramVoiceSend;var _audio = require("../media/audio.js");
function isTelegramVoiceCompatible(opts) {
  return (0, _audio.isVoiceCompatibleAudio)(opts);
}
function resolveTelegramVoiceDecision(opts) {
  if (!opts.wantsVoice) {
    return { useVoice: false };
  }
  if (isTelegramVoiceCompatible(opts)) {
    return { useVoice: true };
  }
  const contentType = opts.contentType ?? "unknown";
  const fileName = opts.fileName ?? "unknown";
  return {
    useVoice: false,
    reason: `media is ${contentType} (${fileName})`
  };
}
function resolveTelegramVoiceSend(opts) {
  const decision = resolveTelegramVoiceDecision(opts);
  if (decision.reason && opts.logFallback) {
    opts.logFallback(`Telegram voice requested but ${decision.reason}; sending as audio file instead.`);
  }
  return { useVoice: decision.useVoice };
} /* v9-c0de31c1543d6a16 */
