"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatDurationMs = formatDurationMs;exports.formatDurationSeconds = formatDurationSeconds;function formatDurationSeconds(ms, options = {}) {
  if (!Number.isFinite(ms)) {
    return "unknown";
  }
  const decimals = options.decimals ?? 1;
  const unit = options.unit ?? "s";
  const seconds = Math.max(0, ms) / 1000;
  const fixed = seconds.toFixed(Math.max(0, decimals));
  const trimmed = fixed.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  return unit === "seconds" ? `${trimmed} seconds` : `${trimmed}s`;
}
function formatDurationMs(ms, options = {}) {
  if (!Number.isFinite(ms)) {
    return "unknown";
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return formatDurationSeconds(ms, {
    decimals: options.decimals ?? 2,
    unit: options.unit ?? "s"
  });
} /* v9-6d80664a21d38e5b */
