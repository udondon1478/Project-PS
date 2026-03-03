"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeAccountId = normalizeAccountId;function normalizeAccountId(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
} /* v9-941a59af4a124bb2 */
