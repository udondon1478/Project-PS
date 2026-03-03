"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeFingerprint = normalizeFingerprint;function normalizeFingerprint(input) {
  const trimmed = input.trim();
  const withoutPrefix = trimmed.replace(/^sha-?256\s*:?\s*/i, "");
  return withoutPrefix.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
} /* v9-8e219bce968ff7f6 */
