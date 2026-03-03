"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.CACHE_TTL_CUSTOM_TYPE = void 0;exports.appendCacheTtlTimestamp = appendCacheTtlTimestamp;exports.isCacheTtlEligibleProvider = isCacheTtlEligibleProvider;exports.readLastCacheTtlTimestamp = readLastCacheTtlTimestamp;const CACHE_TTL_CUSTOM_TYPE = exports.CACHE_TTL_CUSTOM_TYPE = "openclaw.cache-ttl";
function isCacheTtlEligibleProvider(provider, modelId) {
  const normalizedProvider = provider.toLowerCase();
  const normalizedModelId = modelId.toLowerCase();
  if (normalizedProvider === "anthropic") {
    return true;
  }
  if (normalizedProvider === "openrouter" && normalizedModelId.startsWith("anthropic/")) {
    return true;
  }
  return false;
}
function readLastCacheTtlTimestamp(sessionManager) {
  const sm = sessionManager;
  if (!sm?.getEntries) {
    return null;
  }
  try {
    const entries = sm.getEntries();
    let last = null;
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry?.type !== "custom" || entry?.customType !== CACHE_TTL_CUSTOM_TYPE) {
        continue;
      }
      const data = entry?.data;
      const ts = typeof data?.timestamp === "number" ? data.timestamp : null;
      if (ts && Number.isFinite(ts)) {
        last = ts;
        break;
      }
    }
    return last;
  }
  catch {
    return null;
  }
}
function appendCacheTtlTimestamp(sessionManager, data) {
  const sm = sessionManager;
  if (!sm?.appendCustomEntry) {
    return;
  }
  try {
    sm.appendCustomEntry(CACHE_TTL_CUSTOM_TYPE, data);
  }
  catch {

    // ignore persistence failures
  }} /* v9-d8efb3d68e76d10d */
