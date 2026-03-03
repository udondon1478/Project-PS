"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DiscordApiError = void 0;exports.fetchDiscord = fetchDiscord;var _fetch = require("../infra/fetch.js");
var _retry = require("../infra/retry.js");
const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_API_RETRY_DEFAULTS = {
  attempts: 3,
  minDelayMs: 500,
  maxDelayMs: 30_000,
  jitter: 0.1
};
function parseDiscordApiErrorPayload(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null;
  }
  try {
    const payload = JSON.parse(trimmed);
    if (payload && typeof payload === "object") {
      return payload;
    }
  }
  catch {
    return null;
  }
  return null;
}
function parseRetryAfterSeconds(text, response) {
  const payload = parseDiscordApiErrorPayload(text);
  const retryAfter = payload && typeof payload.retry_after === "number" && Number.isFinite(payload.retry_after) ?
  payload.retry_after :
  undefined;
  if (retryAfter !== undefined) {
    return retryAfter;
  }
  const header = response.headers.get("Retry-After");
  if (!header) {
    return undefined;
  }
  const parsed = Number(header);
  return Number.isFinite(parsed) ? parsed : undefined;
}
function formatRetryAfterSeconds(value) {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  const rounded = value < 10 ? value.toFixed(1) : Math.round(value).toString();
  return `${rounded}s`;
}
function formatDiscordApiErrorText(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }
  const payload = parseDiscordApiErrorPayload(trimmed);
  if (!payload) {
    const looksJson = trimmed.startsWith("{") && trimmed.endsWith("}");
    return looksJson ? "unknown error" : trimmed;
  }
  const message = typeof payload.message === "string" && payload.message.trim() ?
  payload.message.trim() :
  "unknown error";
  const retryAfter = formatRetryAfterSeconds(typeof payload.retry_after === "number" ? payload.retry_after : undefined);
  return retryAfter ? `${message} (retry after ${retryAfter})` : message;
}
class DiscordApiError extends Error {
  status;
  retryAfter;
  constructor(message, status, retryAfter) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}exports.DiscordApiError = DiscordApiError;
async function fetchDiscord(path, token, fetcher = fetch, options) {
  const fetchImpl = (0, _fetch.resolveFetch)(fetcher);
  if (!fetchImpl) {
    throw new Error("fetch is not available");
  }
  const retryConfig = (0, _retry.resolveRetryConfig)(DISCORD_API_RETRY_DEFAULTS, options?.retry);
  return (0, _retry.retryAsync)(async () => {
    const res = await fetchImpl(`${DISCORD_API_BASE}${path}`, {
      headers: { Authorization: `Bot ${token}` }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const detail = formatDiscordApiErrorText(text);
      const suffix = detail ? `: ${detail}` : "";
      const retryAfter = res.status === 429 ? parseRetryAfterSeconds(text, res) : undefined;
      throw new DiscordApiError(`Discord API ${path} failed (${res.status})${suffix}`, res.status, retryAfter);
    }
    return await res.json();
  }, {
    ...retryConfig,
    label: options?.label ?? path,
    shouldRetry: (err) => err instanceof DiscordApiError && err.status === 429,
    retryAfterMs: (err) => err instanceof DiscordApiError && typeof err.retryAfter === "number" ?
    err.retryAfter * 1000 :
    undefined
  });
} /* v9-ca989a7f2b32b1c1 */
