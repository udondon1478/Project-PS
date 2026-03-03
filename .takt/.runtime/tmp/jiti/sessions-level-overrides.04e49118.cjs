"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applyVerboseOverride = applyVerboseOverride;exports.parseVerboseOverride = parseVerboseOverride;var _thinking = require("../auto-reply/thinking.js");
function parseVerboseOverride(raw) {
  if (raw === null) {
    return { ok: true, value: null };
  }
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: 'invalid verboseLevel (use "on"|"off")' };
  }
  const normalized = (0, _thinking.normalizeVerboseLevel)(raw);
  if (!normalized) {
    return { ok: false, error: 'invalid verboseLevel (use "on"|"off")' };
  }
  return { ok: true, value: normalized };
}
function applyVerboseOverride(entry, level) {
  if (level === undefined) {
    return;
  }
  if (level === null) {
    delete entry.verboseLevel;
    return;
  }
  entry.verboseLevel = level;
} /* v9-37ddc371faa77e9e */
