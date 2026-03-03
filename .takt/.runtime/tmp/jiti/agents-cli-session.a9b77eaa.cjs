"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getCliSessionId = getCliSessionId;exports.setCliSessionId = setCliSessionId;var _modelSelection = require("./model-selection.js");
function getCliSessionId(entry, provider) {
  if (!entry) {
    return undefined;
  }
  const normalized = (0, _modelSelection.normalizeProviderId)(provider);
  const fromMap = entry.cliSessionIds?.[normalized];
  if (fromMap?.trim()) {
    return fromMap.trim();
  }
  if (normalized === "claude-cli") {
    const legacy = entry.claudeCliSessionId?.trim();
    if (legacy) {
      return legacy;
    }
  }
  return undefined;
}
function setCliSessionId(entry, provider, sessionId) {
  const normalized = (0, _modelSelection.normalizeProviderId)(provider);
  const trimmed = sessionId.trim();
  if (!trimmed) {
    return;
  }
  const existing = entry.cliSessionIds ?? {};
  entry.cliSessionIds = { ...existing };
  entry.cliSessionIds[normalized] = trimmed;
  if (normalized === "claude-cli") {
    entry.claudeCliSessionId = trimmed;
  }
} /* v9-73112b26b2500d1d */
