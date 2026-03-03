"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_MEMORY_FLUSH_SYSTEM_PROMPT = exports.DEFAULT_MEMORY_FLUSH_SOFT_TOKENS = exports.DEFAULT_MEMORY_FLUSH_PROMPT = void 0;exports.resolveMemoryFlushContextWindowTokens = resolveMemoryFlushContextWindowTokens;exports.resolveMemoryFlushSettings = resolveMemoryFlushSettings;exports.shouldRunMemoryFlush = shouldRunMemoryFlush;var _context = require("../../agents/context.js");
var _defaults = require("../../agents/defaults.js");
var _piSettings = require("../../agents/pi-settings.js");
var _tokens = require("../tokens.js");
const DEFAULT_MEMORY_FLUSH_SOFT_TOKENS = exports.DEFAULT_MEMORY_FLUSH_SOFT_TOKENS = 4000;
const DEFAULT_MEMORY_FLUSH_PROMPT = exports.DEFAULT_MEMORY_FLUSH_PROMPT = [
"Pre-compaction memory flush.",
"Store durable memories now (use memory/YYYY-MM-DD.md; create memory/ if needed).",
`If nothing to store, reply with ${_tokens.SILENT_REPLY_TOKEN}.`].
join(" ");
const DEFAULT_MEMORY_FLUSH_SYSTEM_PROMPT = exports.DEFAULT_MEMORY_FLUSH_SYSTEM_PROMPT = [
"Pre-compaction memory flush turn.",
"The session is near auto-compaction; capture durable memories to disk.",
`You may reply, but usually ${_tokens.SILENT_REPLY_TOKEN} is correct.`].
join(" ");
const normalizeNonNegativeInt = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const int = Math.floor(value);
  return int >= 0 ? int : null;
};
function resolveMemoryFlushSettings(cfg) {
  const defaults = cfg?.agents?.defaults?.compaction?.memoryFlush;
  const enabled = defaults?.enabled ?? true;
  if (!enabled) {
    return null;
  }
  const softThresholdTokens = normalizeNonNegativeInt(defaults?.softThresholdTokens) ?? DEFAULT_MEMORY_FLUSH_SOFT_TOKENS;
  const prompt = defaults?.prompt?.trim() || DEFAULT_MEMORY_FLUSH_PROMPT;
  const systemPrompt = defaults?.systemPrompt?.trim() || DEFAULT_MEMORY_FLUSH_SYSTEM_PROMPT;
  const reserveTokensFloor = normalizeNonNegativeInt(cfg?.agents?.defaults?.compaction?.reserveTokensFloor) ??
  _piSettings.DEFAULT_PI_COMPACTION_RESERVE_TOKENS_FLOOR;
  return {
    enabled,
    softThresholdTokens,
    prompt: ensureNoReplyHint(prompt),
    systemPrompt: ensureNoReplyHint(systemPrompt),
    reserveTokensFloor
  };
}
function ensureNoReplyHint(text) {
  if (text.includes(_tokens.SILENT_REPLY_TOKEN)) {
    return text;
  }
  return `${text}\n\nIf no user-visible reply is needed, start with ${_tokens.SILENT_REPLY_TOKEN}.`;
}
function resolveMemoryFlushContextWindowTokens(params) {
  return (0, _context.lookupContextTokens)(params.modelId) ?? params.agentCfgContextTokens ?? _defaults.DEFAULT_CONTEXT_TOKENS;
}
function shouldRunMemoryFlush(params) {
  const totalTokens = params.entry?.totalTokens;
  if (!totalTokens || totalTokens <= 0) {
    return false;
  }
  const contextWindow = Math.max(1, Math.floor(params.contextWindowTokens));
  const reserveTokens = Math.max(0, Math.floor(params.reserveTokensFloor));
  const softThreshold = Math.max(0, Math.floor(params.softThresholdTokens));
  const threshold = Math.max(0, contextWindow - reserveTokens - softThreshold);
  if (threshold <= 0) {
    return false;
  }
  if (totalTokens < threshold) {
    return false;
  }
  const compactionCount = params.entry?.compactionCount ?? 0;
  const lastFlushAt = params.entry?.memoryFlushCompactionCount;
  if (typeof lastFlushAt === "number" && lastFlushAt === compactionCount) {
    return false;
  }
  return true;
} /* v9-43b52566281a5bf5 */
