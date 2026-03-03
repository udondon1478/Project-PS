"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.browserConsoleMessages = browserConsoleMessages;exports.browserHighlight = browserHighlight;exports.browserPageErrors = browserPageErrors;exports.browserPdfSave = browserPdfSave;exports.browserRequests = browserRequests;exports.browserResponseBody = browserResponseBody;exports.browserTraceStart = browserTraceStart;exports.browserTraceStop = browserTraceStop;var _clientFetch = require("./client-fetch.js");
function buildProfileQuery(profile) {
  return profile ? `?profile=${encodeURIComponent(profile)}` : "";
}
function withBaseUrl(baseUrl, path) {
  const trimmed = baseUrl?.trim();
  if (!trimmed) {
    return path;
  }
  return `${trimmed.replace(/\/$/, "")}${path}`;
}
async function browserConsoleMessages(baseUrl, opts = {}) {
  const q = new URLSearchParams();
  if (opts.level) {
    q.set("level", opts.level);
  }
  if (opts.targetId) {
    q.set("targetId", opts.targetId);
  }
  if (opts.profile) {
    q.set("profile", opts.profile);
  }
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return await (0, _clientFetch.fetchBrowserJson)(withBaseUrl(baseUrl, `/console${suffix}`), { timeoutMs: 20000 });
}
async function browserPdfSave(baseUrl, opts = {}) {
  const q = buildProfileQuery(opts.profile);
  return await (0, _clientFetch.fetchBrowserJson)(withBaseUrl(baseUrl, `/pdf${q}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetId: opts.targetId }),
    timeoutMs: 20000
  });
}
async function browserPageErrors(baseUrl, opts = {}) {
  const q = new URLSearchParams();
  if (opts.targetId) {
    q.set("targetId", opts.targetId);
  }
  if (typeof opts.clear === "boolean") {
    q.set("clear", String(opts.clear));
  }
  if (opts.profile) {
    q.set("profile", opts.profile);
  }
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return await (0, _clientFetch.fetchBrowserJson)(withBaseUrl(baseUrl, `/errors${suffix}`), { timeoutMs: 20000 });
}
async function browserRequests(baseUrl, opts = {}) {
  const q = new URLSearchParams();
  if (opts.targetId) {
    q.set("targetId", opts.targetId);
  }
  if (opts.filter) {
    q.set("filter", opts.filter);
  }
  if (typeof opts.clear === "boolean") {
    q.set("clear", String(opts.clear));
  }
  if (opts.profile) {
    q.set("profile", opts.profile);
  }
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return await (0, _clientFetch.fetchBrowserJson)(withBaseUrl(baseUrl, `/requests${suffix}`), { timeoutMs: 20000 });
}
async function browserTraceStart(baseUrl, opts = {}) {
  const q = buildProfileQuery(opts.profile);
  return await (0, _clientFetch.fetchBrowserJson)(withBaseUrl(baseUrl, `/trace/start${q}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetId: opts.targetId,
      screenshots: opts.screenshots,
      snapshots: opts.snapshots,
      sources: opts.sources
    }),
    timeoutMs: 20000
  });
}
async function browserTraceStop(baseUrl, opts = {}) {
  const q = buildProfileQuery(opts.profile);
  return await (0, _clientFetch.fetchBrowserJson)(withBaseUrl(baseUrl, `/trace/stop${q}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetId: opts.targetId, path: opts.path }),
    timeoutMs: 20000
  });
}
async function browserHighlight(baseUrl, opts) {
  const q = buildProfileQuery(opts.profile);
  return await (0, _clientFetch.fetchBrowserJson)(withBaseUrl(baseUrl, `/highlight${q}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetId: opts.targetId, ref: opts.ref }),
    timeoutMs: 20000
  });
}
async function browserResponseBody(baseUrl, opts) {
  const q = buildProfileQuery(opts.profile);
  return await (0, _clientFetch.fetchBrowserJson)(withBaseUrl(baseUrl, `/response/body${q}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetId: opts.targetId,
      url: opts.url,
      timeoutMs: opts.timeoutMs,
      maxChars: opts.maxChars
    }),
    timeoutMs: 20000
  });
} /* v9-cdfb427f294dfc90 */
