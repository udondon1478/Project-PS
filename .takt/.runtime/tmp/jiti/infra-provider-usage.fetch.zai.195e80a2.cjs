"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.fetchZaiUsage = fetchZaiUsage;var _providerUsageFetchShared = require("./provider-usage.fetch.shared.js");
var _providerUsageShared = require("./provider-usage.shared.js");
async function fetchZaiUsage(apiKey, timeoutMs, fetchFn) {
  const res = await (0, _providerUsageFetchShared.fetchJson)("https://api.z.ai/api/monitor/usage/quota/limit", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json"
    }
  }, timeoutMs, fetchFn);
  if (!res.ok) {
    return {
      provider: "zai",
      displayName: _providerUsageShared.PROVIDER_LABELS.zai,
      windows: [],
      error: `HTTP ${res.status}`
    };
  }
  const data = await res.json();
  if (!data.success || data.code !== 200) {
    return {
      provider: "zai",
      displayName: _providerUsageShared.PROVIDER_LABELS.zai,
      windows: [],
      error: data.msg || "API error"
    };
  }
  const windows = [];
  const limits = data.data?.limits || [];
  for (const limit of limits) {
    const percent = (0, _providerUsageShared.clampPercent)(limit.percentage || 0);
    const nextReset = limit.nextResetTime ? new Date(limit.nextResetTime).getTime() : undefined;
    let windowLabel = "Limit";
    if (limit.unit === 1) {
      windowLabel = `${limit.number}d`;
    } else
    if (limit.unit === 3) {
      windowLabel = `${limit.number}h`;
    } else
    if (limit.unit === 5) {
      windowLabel = `${limit.number}m`;
    }
    if (limit.type === "TOKENS_LIMIT") {
      windows.push({
        label: `Tokens (${windowLabel})`,
        usedPercent: percent,
        resetAt: nextReset
      });
    } else
    if (limit.type === "TIME_LIMIT") {
      windows.push({
        label: "Monthly",
        usedPercent: percent,
        resetAt: nextReset
      });
    }
  }
  const planName = data.data?.planName || data.data?.plan || undefined;
  return {
    provider: "zai",
    displayName: _providerUsageShared.PROVIDER_LABELS.zai,
    windows,
    plan: planName
  };
} /* v9-f1427ce711812465 */
