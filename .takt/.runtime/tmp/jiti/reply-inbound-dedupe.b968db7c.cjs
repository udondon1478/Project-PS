"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildInboundDedupeKey = buildInboundDedupeKey;exports.resetInboundDedupe = resetInboundDedupe;exports.shouldSkipDuplicateInbound = shouldSkipDuplicateInbound;var _globals = require("../../globals.js");
var _dedupe = require("../../infra/dedupe.js");
const DEFAULT_INBOUND_DEDUPE_TTL_MS = 20 * 60_000;
const DEFAULT_INBOUND_DEDUPE_MAX = 5000;
const inboundDedupeCache = (0, _dedupe.createDedupeCache)({
  ttlMs: DEFAULT_INBOUND_DEDUPE_TTL_MS,
  maxSize: DEFAULT_INBOUND_DEDUPE_MAX
});
const normalizeProvider = (value) => value?.trim().toLowerCase() || "";
const resolveInboundPeerId = (ctx) => ctx.OriginatingTo ?? ctx.To ?? ctx.From ?? ctx.SessionKey;
function buildInboundDedupeKey(ctx) {
  const provider = normalizeProvider(ctx.OriginatingChannel ?? ctx.Provider ?? ctx.Surface);
  const messageId = ctx.MessageSid?.trim();
  if (!provider || !messageId) {
    return null;
  }
  const peerId = resolveInboundPeerId(ctx);
  if (!peerId) {
    return null;
  }
  const sessionKey = ctx.SessionKey?.trim() ?? "";
  const accountId = ctx.AccountId?.trim() ?? "";
  const threadId = ctx.MessageThreadId !== undefined && ctx.MessageThreadId !== null ?
  String(ctx.MessageThreadId) :
  "";
  return [provider, accountId, sessionKey, peerId, threadId, messageId].filter(Boolean).join("|");
}
function shouldSkipDuplicateInbound(ctx, opts) {
  const key = buildInboundDedupeKey(ctx);
  if (!key) {
    return false;
  }
  const cache = opts?.cache ?? inboundDedupeCache;
  const skipped = cache.check(key, opts?.now);
  if (skipped && (0, _globals.shouldLogVerbose)()) {
    (0, _globals.logVerbose)(`inbound dedupe: skipped ${key}`);
  }
  return skipped;
}
function resetInboundDedupe() {
  inboundDedupeCache.clear();
} /* v9-17930ab5860d116e */
