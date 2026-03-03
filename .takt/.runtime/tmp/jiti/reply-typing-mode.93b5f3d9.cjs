"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_GROUP_TYPING_MODE = void 0;exports.createTypingSignaler = createTypingSignaler;exports.resolveTypingMode = resolveTypingMode;var _tokens = require("../tokens.js");
const DEFAULT_GROUP_TYPING_MODE = exports.DEFAULT_GROUP_TYPING_MODE = "message";
function resolveTypingMode({ configured, isGroupChat, wasMentioned, isHeartbeat }) {
  if (isHeartbeat) {
    return "never";
  }
  if (configured) {
    return configured;
  }
  if (!isGroupChat || wasMentioned) {
    return "instant";
  }
  return DEFAULT_GROUP_TYPING_MODE;
}
function createTypingSignaler(params) {
  const { typing, mode, isHeartbeat } = params;
  const shouldStartImmediately = mode === "instant";
  const shouldStartOnMessageStart = mode === "message";
  const shouldStartOnText = mode === "message" || mode === "instant";
  const shouldStartOnReasoning = mode === "thinking";
  const disabled = isHeartbeat || mode === "never";
  let hasRenderableText = false;
  const isRenderableText = (text) => {
    const trimmed = text?.trim();
    if (!trimmed) {
      return false;
    }
    return !(0, _tokens.isSilentReplyText)(trimmed, _tokens.SILENT_REPLY_TOKEN);
  };
  const signalRunStart = async () => {
    if (disabled || !shouldStartImmediately) {
      return;
    }
    await typing.startTypingLoop();
  };
  const signalMessageStart = async () => {
    if (disabled || !shouldStartOnMessageStart) {
      return;
    }
    if (!hasRenderableText) {
      return;
    }
    await typing.startTypingLoop();
  };
  const signalTextDelta = async (text) => {
    if (disabled) {
      return;
    }
    const renderable = isRenderableText(text);
    if (renderable) {
      hasRenderableText = true;
    } else
    if (text?.trim()) {
      return;
    }
    if (shouldStartOnText) {
      await typing.startTypingOnText(text);
      return;
    }
    if (shouldStartOnReasoning) {
      if (!typing.isActive()) {
        await typing.startTypingLoop();
      }
      typing.refreshTypingTtl();
    }
  };
  const signalReasoningDelta = async () => {
    if (disabled || !shouldStartOnReasoning) {
      return;
    }
    if (!hasRenderableText) {
      return;
    }
    await typing.startTypingLoop();
    typing.refreshTypingTtl();
  };
  const signalToolStart = async () => {
    if (disabled) {
      return;
    }
    // Start typing as soon as tools begin executing, even before the first text delta.
    if (!typing.isActive()) {
      await typing.startTypingLoop();
      typing.refreshTypingTtl();
      return;
    }
    // Keep typing indicator alive during tool execution.
    typing.refreshTypingTtl();
  };
  return {
    mode,
    shouldStartImmediately,
    shouldStartOnMessageStart,
    shouldStartOnText,
    shouldStartOnReasoning,
    signalRunStart,
    signalMessageStart,
    signalTextDelta,
    signalReasoningDelta,
    signalToolStart
  };
} /* v9-2f68abb44a19bdbf */
