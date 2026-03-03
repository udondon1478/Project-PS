"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.RateLimitError = void 0;var _DiscordError = require("./DiscordError.js");
/**
 * A RateLimitError is thrown when the bot is rate limited by Discord, and you don't have requests set to queue.
 */
class RateLimitError extends _DiscordError.DiscordError {
  retryAfter;
  scope;
  bucket;
  constructor(response, body) {
    super(response, body);
    if (this.status !== 429)
    throw new Error("Invalid status code for RateLimitError");
    this.retryAfter = body.retry_after;
    this.scope = response.headers.get("X-RateLimit-Scope");
    this.bucket = response.headers.get("X-RateLimit-Bucket");
  }
}exports.RateLimitError = RateLimitError; /* v9-c44e9b97bd1af6dc */
