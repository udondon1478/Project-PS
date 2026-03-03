"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.appendUsageLine = void 0;exports.buildThreadingToolContext = buildThreadingToolContext;exports.resolveEnforceFinalTag = exports.isBunFetchSocketError = exports.formatResponseUsageLine = exports.formatBunFetchSocketError = void 0;var _dock = require("../../channels/dock.js");
var _registry = require("../../channels/registry.js");
var _providerUtils = require("../../utils/provider-utils.js");
var _usageFormat = require("../../utils/usage-format.js");
const BUN_FETCH_SOCKET_ERROR_RE = /socket connection was closed unexpectedly/i;
/**
 * Build provider-specific threading context for tool auto-injection.
 */
function buildThreadingToolContext(params) {
  const { sessionCtx, config, hasRepliedRef } = params;
  if (!config) {
    return {};
  }
  const rawProvider = sessionCtx.Provider?.trim().toLowerCase();
  if (!rawProvider) {
    return {};
  }
  const provider = (0, _registry.normalizeChannelId)(rawProvider) ?? (0, _registry.normalizeAnyChannelId)(rawProvider);
  // Fallback for unrecognized/plugin channels (e.g., BlueBubbles before plugin registry init)
  const dock = provider ? (0, _dock.getChannelDock)(provider) : undefined;
  if (!dock?.threading?.buildToolContext) {
    return {
      currentChannelId: sessionCtx.To?.trim() || undefined,
      currentChannelProvider: provider ?? rawProvider,
      hasRepliedRef
    };
  }
  const context = dock.threading.buildToolContext({
    cfg: config,
    accountId: sessionCtx.AccountId,
    context: {
      Channel: sessionCtx.Provider,
      From: sessionCtx.From,
      To: sessionCtx.To,
      ChatType: sessionCtx.ChatType,
      ReplyToId: sessionCtx.ReplyToId,
      ThreadLabel: sessionCtx.ThreadLabel,
      MessageThreadId: sessionCtx.MessageThreadId
    },
    hasRepliedRef
  }) ?? {};
  return {
    ...context,
    currentChannelProvider: provider // guaranteed non-null since dock exists
  };
}
const isBunFetchSocketError = (message) => Boolean(message && BUN_FETCH_SOCKET_ERROR_RE.test(message));exports.isBunFetchSocketError = isBunFetchSocketError;
const formatBunFetchSocketError = (message) => {
  const trimmed = message.trim();
  return [
  "⚠️ LLM connection failed. This could be due to server issues, network problems, or context length exceeded (e.g., with local LLMs like LM Studio). Original error:",
  "```",
  trimmed || "Unknown error",
  "```"].
  join("\n");
};exports.formatBunFetchSocketError = formatBunFetchSocketError;
const formatResponseUsageLine = (params) => {
  const usage = params.usage;
  if (!usage) {
    return null;
  }
  const input = usage.input;
  const output = usage.output;
  if (typeof input !== "number" && typeof output !== "number") {
    return null;
  }
  const inputLabel = typeof input === "number" ? (0, _usageFormat.formatTokenCount)(input) : "?";
  const outputLabel = typeof output === "number" ? (0, _usageFormat.formatTokenCount)(output) : "?";
  const cost = params.showCost && typeof input === "number" && typeof output === "number" ?
  (0, _usageFormat.estimateUsageCost)({
    usage: {
      input,
      output,
      cacheRead: usage.cacheRead,
      cacheWrite: usage.cacheWrite
    },
    cost: params.costConfig
  }) :
  undefined;
  const costLabel = params.showCost ? (0, _usageFormat.formatUsd)(cost) : undefined;
  const suffix = costLabel ? ` · est ${costLabel}` : "";
  return `Usage: ${inputLabel} in / ${outputLabel} out${suffix}`;
};exports.formatResponseUsageLine = formatResponseUsageLine;
const appendUsageLine = (payloads, line) => {
  let index = -1;
  for (let i = payloads.length - 1; i >= 0; i -= 1) {
    if (payloads[i]?.text) {
      index = i;
      break;
    }
  }
  if (index === -1) {
    return [...payloads, { text: line }];
  }
  const existing = payloads[index];
  const existingText = existing.text ?? "";
  const separator = existingText.endsWith("\n") ? "" : "\n";
  const next = {
    ...existing,
    text: `${existingText}${separator}${line}`
  };
  const updated = payloads.slice();
  updated[index] = next;
  return updated;
};exports.appendUsageLine = appendUsageLine;
const resolveEnforceFinalTag = (run, provider) => Boolean(run.enforceFinalTag || (0, _providerUtils.isReasoningTagProvider)(provider));exports.resolveEnforceFinalTag = resolveEnforceFinalTag; /* v9-ae6cf17777a1350b */
