"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.fetchWithTimeout = fetchWithTimeout;exports.normalizeBaseUrl = normalizeBaseUrl;exports.readErrorResponse = readErrorResponse;const MAX_ERROR_CHARS = 300;
function normalizeBaseUrl(baseUrl, fallback) {
  const raw = baseUrl?.trim() || fallback;
  return raw.replace(/\/+$/, "");
}
async function fetchWithTimeout(url, init, timeoutMs, fetchFn) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } finally
  {
    clearTimeout(timer);
  }
}
async function readErrorResponse(res) {
  try {
    const text = await res.text();
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (!collapsed) {
      return undefined;
    }
    if (collapsed.length <= MAX_ERROR_CHARS) {
      return collapsed;
    }
    return `${collapsed.slice(0, MAX_ERROR_CHARS)}…`;
  }
  catch {
    return undefined;
  }
} /* v9-7c2f519ed337430f */
