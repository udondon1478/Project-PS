"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.SESSION_LABEL_MAX_LENGTH = void 0;exports.parseSessionLabel = parseSessionLabel;const SESSION_LABEL_MAX_LENGTH = exports.SESSION_LABEL_MAX_LENGTH = 64;
function parseSessionLabel(raw) {
  if (typeof raw !== "string") {
    return { ok: false, error: "invalid label: must be a string" };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "invalid label: empty" };
  }
  if (trimmed.length > SESSION_LABEL_MAX_LENGTH) {
    return {
      ok: false,
      error: `invalid label: too long (max ${SESSION_LABEL_MAX_LENGTH})`
    };
  }
  return { ok: true, label: trimmed };
} /* v9-74b057954200869f */
