"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.asString = asString;exports.composeThinkingAndContent = composeThinkingAndContent;exports.extractContentFromMessage = extractContentFromMessage;exports.extractTextFromMessage = extractTextFromMessage;exports.extractThinkingFromMessage = extractThinkingFromMessage;exports.formatContextUsageLine = formatContextUsageLine;exports.formatTokens = formatTokens;exports.isCommandMessage = isCommandMessage;exports.resolveFinalAssistantText = resolveFinalAssistantText;var _piEmbeddedHelpers = require("../agents/pi-embedded-helpers.js");
var _usageFormat = require("../utils/usage-format.js");
function resolveFinalAssistantText(params) {
  const finalText = params.finalText ?? "";
  if (finalText.trim()) {
    return finalText;
  }
  const streamedText = params.streamedText ?? "";
  if (streamedText.trim()) {
    return streamedText;
  }
  return "(no output)";
}
function composeThinkingAndContent(params) {
  const thinkingText = params.thinkingText?.trim() ?? "";
  const contentText = params.contentText?.trim() ?? "";
  const parts = [];
  if (params.showThinking && thinkingText) {
    parts.push(`[thinking]\n${thinkingText}`);
  }
  if (contentText) {
    parts.push(contentText);
  }
  return parts.join("\n\n").trim();
}
/**
 * Extract ONLY thinking blocks from message content.
 * Model-agnostic: returns empty string if no thinking blocks exist.
 */
function extractThinkingFromMessage(message) {
  if (!message || typeof message !== "object") {
    return "";
  }
  const record = message;
  const content = record.content;
  if (typeof content === "string") {
    return "";
  }
  if (!Array.isArray(content)) {
    return "";
  }
  const parts = [];
  for (const block of content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const rec = block;
    if (rec.type === "thinking" && typeof rec.thinking === "string") {
      parts.push(rec.thinking);
    }
  }
  return parts.join("\n").trim();
}
/**
 * Extract ONLY text content blocks from message (excludes thinking).
 * Model-agnostic: works for any model with text content blocks.
 */
function extractContentFromMessage(message) {
  if (!message || typeof message !== "object") {
    return "";
  }
  const record = message;
  const content = record.content;
  if (typeof content === "string") {
    return content.trim();
  }
  // Check for error BEFORE returning empty for non-array content
  if (!Array.isArray(content)) {
    const stopReason = typeof record.stopReason === "string" ? record.stopReason : "";
    if (stopReason === "error") {
      const errorMessage = typeof record.errorMessage === "string" ? record.errorMessage : "";
      return (0, _piEmbeddedHelpers.formatRawAssistantErrorForUi)(errorMessage);
    }
    return "";
  }
  const parts = [];
  for (const block of content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const rec = block;
    if (rec.type === "text" && typeof rec.text === "string") {
      parts.push(rec.text);
    }
  }
  // If no text blocks found, check for error
  if (parts.length === 0) {
    const stopReason = typeof record.stopReason === "string" ? record.stopReason : "";
    if (stopReason === "error") {
      const errorMessage = typeof record.errorMessage === "string" ? record.errorMessage : "";
      return (0, _piEmbeddedHelpers.formatRawAssistantErrorForUi)(errorMessage);
    }
  }
  return parts.join("\n").trim();
}
function extractTextBlocks(content, opts) {
  if (typeof content === "string") {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }
  const thinkingParts = [];
  const textParts = [];
  for (const block of content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const record = block;
    if (record.type === "text" && typeof record.text === "string") {
      textParts.push(record.text);
    }
    if (opts?.includeThinking &&
    record.type === "thinking" &&
    typeof record.thinking === "string") {
      thinkingParts.push(record.thinking);
    }
  }
  return composeThinkingAndContent({
    thinkingText: thinkingParts.join("\n").trim(),
    contentText: textParts.join("\n").trim(),
    showThinking: opts?.includeThinking ?? false
  });
}
function extractTextFromMessage(message, opts) {
  if (!message || typeof message !== "object") {
    return "";
  }
  const record = message;
  const text = extractTextBlocks(record.content, opts);
  if (text) {
    return text;
  }
  const stopReason = typeof record.stopReason === "string" ? record.stopReason : "";
  if (stopReason !== "error") {
    return "";
  }
  const errorMessage = typeof record.errorMessage === "string" ? record.errorMessage : "";
  return (0, _piEmbeddedHelpers.formatRawAssistantErrorForUi)(errorMessage);
}
function isCommandMessage(message) {
  if (!message || typeof message !== "object") {
    return false;
  }
  return message.command === true;
}
function formatTokens(total, context) {
  if (total == null && context == null) {
    return "tokens ?";
  }
  const totalLabel = total == null ? "?" : (0, _usageFormat.formatTokenCount)(total);
  if (context == null) {
    return `tokens ${totalLabel}`;
  }
  const pct = typeof total === "number" && context > 0 ?
  Math.min(999, Math.round(total / context * 100)) :
  null;
  return `tokens ${totalLabel}/${(0, _usageFormat.formatTokenCount)(context)}${pct !== null ? ` (${pct}%)` : ""}`;
}
function formatContextUsageLine(params) {
  const totalLabel = typeof params.total === "number" ? (0, _usageFormat.formatTokenCount)(params.total) : "?";
  const ctxLabel = typeof params.context === "number" ? (0, _usageFormat.formatTokenCount)(params.context) : "?";
  const pct = typeof params.percent === "number" ? Math.min(999, Math.round(params.percent)) : null;
  const remainingLabel = typeof params.remaining === "number" ? `${(0, _usageFormat.formatTokenCount)(params.remaining)} left` : null;
  const pctLabel = pct !== null ? `${pct}%` : null;
  const extra = [remainingLabel, pctLabel].filter(Boolean).join(", ");
  return `tokens ${totalLabel}/${ctxLabel}${extra ? ` (${extra})` : ""}`;
}
function asString(value, fallback = "") {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
} /* v9-22aca56bfd78c0b9 */
