"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.fetchGeminiUsage = fetchGeminiUsage;var _providerUsageFetchShared = require("./provider-usage.fetch.shared.js");
var _providerUsageShared = require("./provider-usage.shared.js");
async function fetchGeminiUsage(token, timeoutMs, fetchFn, provider) {
  const res = await (0, _providerUsageFetchShared.fetchJson)("https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: "{}"
  }, timeoutMs, fetchFn);
  if (!res.ok) {
    return {
      provider,
      displayName: _providerUsageShared.PROVIDER_LABELS[provider],
      windows: [],
      error: `HTTP ${res.status}`
    };
  }
  const data = await res.json();
  const quotas = {};
  for (const bucket of data.buckets || []) {
    const model = bucket.modelId || "unknown";
    const frac = bucket.remainingFraction ?? 1;
    if (!quotas[model] || frac < quotas[model]) {
      quotas[model] = frac;
    }
  }
  const windows = [];
  let proMin = 1;
  let flashMin = 1;
  let hasPro = false;
  let hasFlash = false;
  for (const [model, frac] of Object.entries(quotas)) {
    const lower = model.toLowerCase();
    if (lower.includes("pro")) {
      hasPro = true;
      if (frac < proMin) {
        proMin = frac;
      }
    }
    if (lower.includes("flash")) {
      hasFlash = true;
      if (frac < flashMin) {
        flashMin = frac;
      }
    }
  }
  if (hasPro) {
    windows.push({
      label: "Pro",
      usedPercent: (0, _providerUsageShared.clampPercent)((1 - proMin) * 100)
    });
  }
  if (hasFlash) {
    windows.push({
      label: "Flash",
      usedPercent: (0, _providerUsageShared.clampPercent)((1 - flashMin) * 100)
    });
  }
  return { provider, displayName: _providerUsageShared.PROVIDER_LABELS[provider], windows };
} /* v9-7007a08d9e2c0c48 */
