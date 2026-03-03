"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isAbortError = isAbortError;function isAbortError(err) {
  if (!err || typeof err !== "object") {
    return false;
  }
  const name = "name" in err ? String(err.name) : "";
  if (name === "AbortError") {
    return true;
  }
  const message = "message" in err && typeof err.message === "string" ? err.message.toLowerCase() : "";
  return message.includes("aborted");
} /* v9-b7f21afc6a0ab39e */
