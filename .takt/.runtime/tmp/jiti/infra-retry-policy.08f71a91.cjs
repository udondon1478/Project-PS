"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.TELEGRAM_RETRY_DEFAULTS = exports.DISCORD_RETRY_DEFAULTS = void 0;exports.createDiscordRetryRunner = createDiscordRetryRunner;exports.createTelegramRetryRunner = createTelegramRetryRunner;var _carbon = require("@buape/carbon");
var _errors = require("./errors.js");
var _retry = require("./retry.js");
const DISCORD_RETRY_DEFAULTS = exports.DISCORD_RETRY_DEFAULTS = {
  attempts: 3,
  minDelayMs: 500,
  maxDelayMs: 30_000,
  jitter: 0.1
};
const TELEGRAM_RETRY_DEFAULTS = exports.TELEGRAM_RETRY_DEFAULTS = {
  attempts: 3,
  minDelayMs: 400,
  maxDelayMs: 30_000,
  jitter: 0.1
};
const TELEGRAM_RETRY_RE = /429|timeout|connect|reset|closed|unavailable|temporarily/i;
function getTelegramRetryAfterMs(err) {
  if (!err || typeof err !== "object") {
    return undefined;
  }
  const candidate = "parameters" in err && err.parameters && typeof err.parameters === "object" ?
  err.parameters.retry_after :
  "response" in err &&
  err.response &&
  typeof err.response === "object" &&
  "parameters" in err.response ?
  err.response.parameters?.retry_after :
  "error" in err && err.error && typeof err.error === "object" && "parameters" in err.error ?
  err.error.parameters?.retry_after :
  undefined;
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate * 1000 : undefined;
}
function createDiscordRetryRunner(params) {
  const retryConfig = (0, _retry.resolveRetryConfig)(DISCORD_RETRY_DEFAULTS, {
    ...params.configRetry,
    ...params.retry
  });
  return (fn, label) => (0, _retry.retryAsync)(fn, {
    ...retryConfig,
    label,
    shouldRetry: (err) => err instanceof _carbon.RateLimitError,
    retryAfterMs: (err) => err instanceof _carbon.RateLimitError ? err.retryAfter * 1000 : undefined,
    onRetry: params.verbose ?
    (info) => {
      const labelText = info.label ?? "request";
      const maxRetries = Math.max(1, info.maxAttempts - 1);
      console.warn(`discord ${labelText} rate limited, retry ${info.attempt}/${maxRetries} in ${info.delayMs}ms`);
    } :
    undefined
  });
}
function createTelegramRetryRunner(params) {
  const retryConfig = (0, _retry.resolveRetryConfig)(TELEGRAM_RETRY_DEFAULTS, {
    ...params.configRetry,
    ...params.retry
  });
  const shouldRetry = params.shouldRetry ?
  (err) => params.shouldRetry?.(err) || TELEGRAM_RETRY_RE.test((0, _errors.formatErrorMessage)(err)) :
  (err) => TELEGRAM_RETRY_RE.test((0, _errors.formatErrorMessage)(err));
  return (fn, label) => (0, _retry.retryAsync)(fn, {
    ...retryConfig,
    label,
    shouldRetry,
    retryAfterMs: getTelegramRetryAfterMs,
    onRetry: params.verbose ?
    (info) => {
      const maxRetries = Math.max(1, info.maxAttempts - 1);
      console.warn(`telegram send retry ${info.attempt}/${maxRetries} for ${info.label ?? label ?? "request"} in ${info.delayMs}ms: ${(0, _errors.formatErrorMessage)(info.err)}`);
    } :
    undefined
  });
} /* v9-a4c2a04cdbfe4eee */
