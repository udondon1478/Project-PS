"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.fetchCopilotUsage = fetchCopilotUsage;var _providerUsageFetchShared = require("./provider-usage.fetch.shared.js");
var _providerUsageShared = require("./provider-usage.shared.js");
async function fetchCopilotUsage(token, timeoutMs, fetchFn) {
  const res = await (0, _providerUsageFetchShared.fetchJson)("https://api.github.com/copilot_internal/user", {
    headers: {
      Authorization: `token ${token}`,
      "Editor-Version": "vscode/1.96.2",
      "User-Agent": "GitHubCopilotChat/0.26.7",
      "X-Github-Api-Version": "2025-04-01"
    }
  }, timeoutMs, fetchFn);
  if (!res.ok) {
    return {
      provider: "github-copilot",
      displayName: _providerUsageShared.PROVIDER_LABELS["github-copilot"],
      windows: [],
      error: `HTTP ${res.status}`
    };
  }
  const data = await res.json();
  const windows = [];
  if (data.quota_snapshots?.premium_interactions) {
    const remaining = data.quota_snapshots.premium_interactions.percent_remaining;
    windows.push({
      label: "Premium",
      usedPercent: (0, _providerUsageShared.clampPercent)(100 - (remaining ?? 0))
    });
  }
  if (data.quota_snapshots?.chat) {
    const remaining = data.quota_snapshots.chat.percent_remaining;
    windows.push({
      label: "Chat",
      usedPercent: (0, _providerUsageShared.clampPercent)(100 - (remaining ?? 0))
    });
  }
  return {
    provider: "github-copilot",
    displayName: _providerUsageShared.PROVIDER_LABELS["github-copilot"],
    windows,
    plan: data.copilot_plan
  };
} /* v9-7e519b685c531421 */
