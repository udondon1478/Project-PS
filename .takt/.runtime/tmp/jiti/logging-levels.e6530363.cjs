"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ALLOWED_LOG_LEVELS = void 0;exports.levelToMinLevel = levelToMinLevel;exports.normalizeLogLevel = normalizeLogLevel;const ALLOWED_LOG_LEVELS = exports.ALLOWED_LOG_LEVELS = [
"silent",
"fatal",
"error",
"warn",
"info",
"debug",
"trace"];

function normalizeLogLevel(level, fallback = "info") {
  const candidate = (level ?? fallback).trim();
  return ALLOWED_LOG_LEVELS.includes(candidate) ? candidate : fallback;
}
function levelToMinLevel(level) {
  // tslog level ordering: fatal=0, error=1, warn=2, info=3, debug=4, trace=5
  const map = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
    silent: Number.POSITIVE_INFINITY
  };
  return map[level];
} /* v9-34f6551c97ba02ef */
