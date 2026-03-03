"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.loadProviderUsageSummary = loadProviderUsageSummary;var _fetch = require("./fetch.js");
var _providerUsageAuth = require("./provider-usage.auth.js");
var _providerUsageFetch = require("./provider-usage.fetch.js");
var _providerUsageShared = require("./provider-usage.shared.js");
async function loadProviderUsageSummary(opts = {}) {
  const now = opts.now ?? Date.now();
  const timeoutMs = opts.timeoutMs ?? _providerUsageShared.DEFAULT_TIMEOUT_MS;
  const fetchFn = (0, _fetch.resolveFetch)(opts.fetch);
  if (!fetchFn) {
    throw new Error("fetch is not available");
  }
  const auths = await (0, _providerUsageAuth.resolveProviderAuths)({
    providers: opts.providers ?? _providerUsageShared.usageProviders,
    auth: opts.auth,
    agentDir: opts.agentDir
  });
  if (auths.length === 0) {
    return { updatedAt: now, providers: [] };
  }
  const tasks = auths.map((auth) => (0, _providerUsageShared.withTimeout)((async () => {
    switch (auth.provider) {
      case "anthropic":
        return await (0, _providerUsageFetch.fetchClaudeUsage)(auth.token, timeoutMs, fetchFn);
      case "github-copilot":
        return await (0, _providerUsageFetch.fetchCopilotUsage)(auth.token, timeoutMs, fetchFn);
      case "google-antigravity":
        return await (0, _providerUsageFetch.fetchAntigravityUsage)(auth.token, timeoutMs, fetchFn);
      case "google-gemini-cli":
        return await (0, _providerUsageFetch.fetchGeminiUsage)(auth.token, timeoutMs, fetchFn, auth.provider);
      case "openai-codex":
        return await (0, _providerUsageFetch.fetchCodexUsage)(auth.token, auth.accountId, timeoutMs, fetchFn);
      case "minimax":
        return await (0, _providerUsageFetch.fetchMinimaxUsage)(auth.token, timeoutMs, fetchFn);
      case "xiaomi":
        return {
          provider: "xiaomi",
          displayName: _providerUsageShared.PROVIDER_LABELS.xiaomi,
          windows: []
        };
      case "zai":
        return await (0, _providerUsageFetch.fetchZaiUsage)(auth.token, timeoutMs, fetchFn);
      default:
        return {
          provider: auth.provider,
          displayName: _providerUsageShared.PROVIDER_LABELS[auth.provider],
          windows: [],
          error: "Unsupported provider"
        };
    }
  })(), timeoutMs + 1000, {
    provider: auth.provider,
    displayName: _providerUsageShared.PROVIDER_LABELS[auth.provider],
    windows: [],
    error: "Timeout"
  }));
  const snapshots = await Promise.all(tasks);
  const providers = snapshots.filter((entry) => {
    if (entry.windows.length > 0) {
      return true;
    }
    if (!entry.error) {
      return true;
    }
    return !_providerUsageShared.ignoredErrors.has(entry.error);
  });
  return { updatedAt: now, providers };
} /* v9-9f2148a4a5d17313 */
