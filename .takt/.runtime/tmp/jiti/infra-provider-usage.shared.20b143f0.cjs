"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ignoredErrors = exports.clampPercent = exports.PROVIDER_LABELS = exports.DEFAULT_TIMEOUT_MS = void 0;exports.resolveUsageProviderId = resolveUsageProviderId;exports.withTimeout = exports.usageProviders = void 0;var _modelSelection = require("../agents/model-selection.js");
const DEFAULT_TIMEOUT_MS = exports.DEFAULT_TIMEOUT_MS = 5000;
const PROVIDER_LABELS = exports.PROVIDER_LABELS = {
  anthropic: "Claude",
  "github-copilot": "Copilot",
  "google-gemini-cli": "Gemini",
  "google-antigravity": "Antigravity",
  minimax: "MiniMax",
  "openai-codex": "Codex",
  xiaomi: "Xiaomi",
  zai: "z.ai"
};
const usageProviders = exports.usageProviders = [
"anthropic",
"github-copilot",
"google-gemini-cli",
"google-antigravity",
"minimax",
"openai-codex",
"xiaomi",
"zai"];

function resolveUsageProviderId(provider) {
  if (!provider) {
    return undefined;
  }
  const normalized = (0, _modelSelection.normalizeProviderId)(provider);
  return usageProviders.includes(normalized) ?
  normalized :
  undefined;
}
const ignoredErrors = exports.ignoredErrors = new Set([
"No credentials",
"No token",
"No API key",
"Not logged in",
"No auth"]
);
const clampPercent = (value) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));exports.clampPercent = clampPercent;
const withTimeout = async (work, ms, fallback) => {
  let timeout;
  try {
    return await Promise.race([
    work,
    new Promise((resolve) => {
      timeout = setTimeout(() => resolve(fallback), ms);
    })]
    );
  } finally
  {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};exports.withTimeout = withTimeout; /* v9-e66ab1e796e9e30a */
