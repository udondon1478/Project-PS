"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createWebFetchTool = createWebFetchTool;Object.defineProperty(exports, "extractReadableContent", { enumerable: true, get: function () {return _webFetchUtils.extractReadableContent;} });exports.fetchFirecrawlContent = fetchFirecrawlContent;var _typebox = require("@sinclair/typebox");
var _ssrf = require("../../infra/net/ssrf.js");
var _externalContent = require("../../security/external-content.js");
var _typebox2 = require("../schema/typebox.js");
var _common = require("./common.js");
var _webFetchUtils = require("./web-fetch-utils.js");
var _webShared = require("./web-shared.js");

const EXTRACT_MODES = ["markdown", "text"];
const DEFAULT_FETCH_MAX_CHARS = 50_000;
const DEFAULT_FETCH_MAX_REDIRECTS = 3;
const DEFAULT_ERROR_MAX_CHARS = 4_000;
const DEFAULT_FIRECRAWL_BASE_URL = "https://api.firecrawl.dev";
const DEFAULT_FIRECRAWL_MAX_AGE_MS = 172_800_000;
const DEFAULT_FETCH_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const FETCH_CACHE = new Map();
const WebFetchSchema = _typebox.Type.Object({
  url: _typebox.Type.String({ description: "HTTP or HTTPS URL to fetch." }),
  extractMode: _typebox.Type.Optional((0, _typebox2.stringEnum)(EXTRACT_MODES, {
    description: 'Extraction mode ("markdown" or "text").',
    default: "markdown"
  })),
  maxChars: _typebox.Type.Optional(_typebox.Type.Number({
    description: "Maximum characters to return (truncates when exceeded).",
    minimum: 100
  }))
});
function resolveFetchConfig(cfg) {
  const fetch = cfg?.tools?.web?.fetch;
  if (!fetch || typeof fetch !== "object") {
    return undefined;
  }
  return fetch;
}
function resolveFetchEnabled(params) {
  if (typeof params.fetch?.enabled === "boolean") {
    return params.fetch.enabled;
  }
  return true;
}
function resolveFetchReadabilityEnabled(fetch) {
  if (typeof fetch?.readability === "boolean") {
    return fetch.readability;
  }
  return true;
}
function resolveFirecrawlConfig(fetch) {
  if (!fetch || typeof fetch !== "object") {
    return undefined;
  }
  const firecrawl = "firecrawl" in fetch ? fetch.firecrawl : undefined;
  if (!firecrawl || typeof firecrawl !== "object") {
    return undefined;
  }
  return firecrawl;
}
function resolveFirecrawlApiKey(firecrawl) {
  const fromConfig = firecrawl && "apiKey" in firecrawl && typeof firecrawl.apiKey === "string" ?
  firecrawl.apiKey.trim() :
  "";
  const fromEnv = (process.env.FIRECRAWL_API_KEY ?? "").trim();
  return fromConfig || fromEnv || undefined;
}
function resolveFirecrawlEnabled(params) {
  if (typeof params.firecrawl?.enabled === "boolean") {
    return params.firecrawl.enabled;
  }
  return Boolean(params.apiKey);
}
function resolveFirecrawlBaseUrl(firecrawl) {
  const raw = firecrawl && "baseUrl" in firecrawl && typeof firecrawl.baseUrl === "string" ?
  firecrawl.baseUrl.trim() :
  "";
  return raw || DEFAULT_FIRECRAWL_BASE_URL;
}
function resolveFirecrawlOnlyMainContent(firecrawl) {
  if (typeof firecrawl?.onlyMainContent === "boolean") {
    return firecrawl.onlyMainContent;
  }
  return true;
}
function resolveFirecrawlMaxAgeMs(firecrawl) {
  const raw = firecrawl && "maxAgeMs" in firecrawl && typeof firecrawl.maxAgeMs === "number" ?
  firecrawl.maxAgeMs :
  undefined;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }
  const parsed = Math.max(0, Math.floor(raw));
  return parsed > 0 ? parsed : undefined;
}
function resolveFirecrawlMaxAgeMsOrDefault(firecrawl) {
  const resolved = resolveFirecrawlMaxAgeMs(firecrawl);
  if (typeof resolved === "number") {
    return resolved;
  }
  return DEFAULT_FIRECRAWL_MAX_AGE_MS;
}
function resolveMaxChars(value, fallback) {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(100, Math.floor(parsed));
}
function resolveMaxRedirects(value, fallback) {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.floor(parsed));
}
function looksLikeHtml(value) {
  const trimmed = value.trimStart();
  if (!trimmed) {
    return false;
  }
  const head = trimmed.slice(0, 256).toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html");
}
function isRedirectStatus(status) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
async function fetchWithRedirects(params) {
  const signal = (0, _webShared.withTimeout)(undefined, params.timeoutSeconds * 1000);
  const visited = new Set();
  let currentUrl = params.url;
  let redirectCount = 0;
  while (true) {
    let parsedUrl;
    try {
      parsedUrl = new URL(currentUrl);
    }
    catch {
      throw new Error("Invalid URL: must be http or https");
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid URL: must be http or https");
    }
    const pinned = await (0, _ssrf.resolvePinnedHostname)(parsedUrl.hostname);
    const dispatcher = (0, _ssrf.createPinnedDispatcher)(pinned);
    let res;
    try {
      res = await fetch(parsedUrl.toString(), {
        method: "GET",
        headers: {
          Accept: "*/*",
          "User-Agent": params.userAgent,
          "Accept-Language": "en-US,en;q=0.9"
        },
        signal,
        redirect: "manual",
        dispatcher
      });
    }
    catch (err) {
      await (0, _ssrf.closeDispatcher)(dispatcher);
      throw err;
    }
    if (isRedirectStatus(res.status)) {
      const location = res.headers.get("location");
      if (!location) {
        await (0, _ssrf.closeDispatcher)(dispatcher);
        throw new Error(`Redirect missing location header (${res.status})`);
      }
      redirectCount += 1;
      if (redirectCount > params.maxRedirects) {
        await (0, _ssrf.closeDispatcher)(dispatcher);
        throw new Error(`Too many redirects (limit: ${params.maxRedirects})`);
      }
      const nextUrl = new URL(location, parsedUrl).toString();
      if (visited.has(nextUrl)) {
        await (0, _ssrf.closeDispatcher)(dispatcher);
        throw new Error("Redirect loop detected");
      }
      visited.add(nextUrl);
      void res.body?.cancel();
      await (0, _ssrf.closeDispatcher)(dispatcher);
      currentUrl = nextUrl;
      continue;
    }
    return { response: res, finalUrl: currentUrl, dispatcher };
  }
}
function formatWebFetchErrorDetail(params) {
  const { detail, contentType, maxChars } = params;
  if (!detail) {
    return "";
  }
  let text = detail;
  const contentTypeLower = contentType?.toLowerCase();
  if (contentTypeLower?.includes("text/html") || looksLikeHtml(detail)) {
    const rendered = (0, _webFetchUtils.htmlToMarkdown)(detail);
    const withTitle = rendered.title ? `${rendered.title}\n${rendered.text}` : rendered.text;
    text = (0, _webFetchUtils.markdownToText)(withTitle);
  }
  const truncated = (0, _webFetchUtils.truncateText)(text.trim(), maxChars);
  return truncated.text;
}
const WEB_FETCH_WRAPPER_WITH_WARNING_OVERHEAD = (0, _externalContent.wrapWebContent)("", "web_fetch").length;
const WEB_FETCH_WRAPPER_NO_WARNING_OVERHEAD = (0, _externalContent.wrapExternalContent)("", {
  source: "web_fetch",
  includeWarning: false
}).length;
function wrapWebFetchContent(value, maxChars) {
  if (maxChars <= 0) {
    return { text: "", truncated: true, rawLength: 0, wrappedLength: 0 };
  }
  const includeWarning = maxChars >= WEB_FETCH_WRAPPER_WITH_WARNING_OVERHEAD;
  const wrapperOverhead = includeWarning ?
  WEB_FETCH_WRAPPER_WITH_WARNING_OVERHEAD :
  WEB_FETCH_WRAPPER_NO_WARNING_OVERHEAD;
  if (wrapperOverhead > maxChars) {
    const minimal = includeWarning ?
    (0, _externalContent.wrapWebContent)("", "web_fetch") :
    (0, _externalContent.wrapExternalContent)("", { source: "web_fetch", includeWarning: false });
    const truncatedWrapper = (0, _webFetchUtils.truncateText)(minimal, maxChars);
    return {
      text: truncatedWrapper.text,
      truncated: true,
      rawLength: 0,
      wrappedLength: truncatedWrapper.text.length
    };
  }
  const maxInner = Math.max(0, maxChars - wrapperOverhead);
  let truncated = (0, _webFetchUtils.truncateText)(value, maxInner);
  let wrappedText = includeWarning ?
  (0, _externalContent.wrapWebContent)(truncated.text, "web_fetch") :
  (0, _externalContent.wrapExternalContent)(truncated.text, { source: "web_fetch", includeWarning: false });
  if (wrappedText.length > maxChars) {
    const excess = wrappedText.length - maxChars;
    const adjustedMaxInner = Math.max(0, maxInner - excess);
    truncated = (0, _webFetchUtils.truncateText)(value, adjustedMaxInner);
    wrappedText = includeWarning ?
    (0, _externalContent.wrapWebContent)(truncated.text, "web_fetch") :
    (0, _externalContent.wrapExternalContent)(truncated.text, { source: "web_fetch", includeWarning: false });
  }
  return {
    text: wrappedText,
    truncated: truncated.truncated,
    rawLength: truncated.text.length,
    wrappedLength: wrappedText.length
  };
}
function wrapWebFetchField(value) {
  if (!value) {
    return value;
  }
  return (0, _externalContent.wrapExternalContent)(value, { source: "web_fetch", includeWarning: false });
}
function normalizeContentType(value) {
  if (!value) {
    return undefined;
  }
  const [raw] = value.split(";");
  const trimmed = raw?.trim();
  return trimmed || undefined;
}
async function fetchFirecrawlContent(params) {
  const endpoint = resolveFirecrawlEndpoint(params.baseUrl);
  const body = {
    url: params.url,
    formats: ["markdown"],
    onlyMainContent: params.onlyMainContent,
    timeout: params.timeoutSeconds * 1000,
    maxAge: params.maxAgeMs,
    proxy: params.proxy,
    storeInCache: params.storeInCache
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: (0, _webShared.withTimeout)(undefined, params.timeoutSeconds * 1000)
  });
  const payload = await res.json();
  if (!res.ok || payload?.success === false) {
    const detail = payload?.error ?? "";
    throw new Error(`Firecrawl fetch failed (${res.status}): ${(0, _externalContent.wrapWebContent)(detail || res.statusText, "web_fetch")}`.trim());
  }
  const data = payload?.data ?? {};
  const rawText = typeof data.markdown === "string" ?
  data.markdown :
  typeof data.content === "string" ?
  data.content :
  "";
  const text = params.extractMode === "text" ? (0, _webFetchUtils.markdownToText)(rawText) : rawText;
  return {
    text,
    title: data.metadata?.title,
    finalUrl: data.metadata?.sourceURL,
    status: data.metadata?.statusCode,
    warning: payload?.warning
  };
}
async function runWebFetch(params) {
  const cacheKey = (0, _webShared.normalizeCacheKey)(`fetch:${params.url}:${params.extractMode}:${params.maxChars}`);
  const cached = (0, _webShared.readCache)(FETCH_CACHE, cacheKey);
  if (cached) {
    return { ...cached.value, cached: true };
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(params.url);
  }
  catch {
    throw new Error("Invalid URL: must be http or https");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Invalid URL: must be http or https");
  }
  const start = Date.now();
  let res;
  let dispatcher = null;
  let finalUrl = params.url;
  try {
    const result = await fetchWithRedirects({
      url: params.url,
      maxRedirects: params.maxRedirects,
      timeoutSeconds: params.timeoutSeconds,
      userAgent: params.userAgent
    });
    res = result.response;
    finalUrl = result.finalUrl;
    dispatcher = result.dispatcher;
  }
  catch (error) {
    if (error instanceof _ssrf.SsrFBlockedError) {
      throw error;
    }
    if (params.firecrawlEnabled && params.firecrawlApiKey) {
      const firecrawl = await fetchFirecrawlContent({
        url: finalUrl,
        extractMode: params.extractMode,
        apiKey: params.firecrawlApiKey,
        baseUrl: params.firecrawlBaseUrl,
        onlyMainContent: params.firecrawlOnlyMainContent,
        maxAgeMs: params.firecrawlMaxAgeMs,
        proxy: params.firecrawlProxy,
        storeInCache: params.firecrawlStoreInCache,
        timeoutSeconds: params.firecrawlTimeoutSeconds
      });
      const wrapped = wrapWebFetchContent(firecrawl.text, params.maxChars);
      const wrappedTitle = firecrawl.title ? wrapWebFetchField(firecrawl.title) : undefined;
      const payload = {
        url: params.url, // Keep raw for tool chaining
        finalUrl: firecrawl.finalUrl || finalUrl, // Keep raw
        status: firecrawl.status ?? 200,
        contentType: "text/markdown", // Protocol metadata, don't wrap
        title: wrappedTitle,
        extractMode: params.extractMode,
        extractor: "firecrawl",
        truncated: wrapped.truncated,
        length: wrapped.wrappedLength,
        rawLength: wrapped.rawLength, // Actual content length, not wrapped
        wrappedLength: wrapped.wrappedLength,
        fetchedAt: new Date().toISOString(),
        tookMs: Date.now() - start,
        text: wrapped.text,
        warning: wrapWebFetchField(firecrawl.warning)
      };
      (0, _webShared.writeCache)(FETCH_CACHE, cacheKey, payload, params.cacheTtlMs);
      return payload;
    }
    throw error;
  }
  try {
    if (!res.ok) {
      if (params.firecrawlEnabled && params.firecrawlApiKey) {
        const firecrawl = await fetchFirecrawlContent({
          url: params.url,
          extractMode: params.extractMode,
          apiKey: params.firecrawlApiKey,
          baseUrl: params.firecrawlBaseUrl,
          onlyMainContent: params.firecrawlOnlyMainContent,
          maxAgeMs: params.firecrawlMaxAgeMs,
          proxy: params.firecrawlProxy,
          storeInCache: params.firecrawlStoreInCache,
          timeoutSeconds: params.firecrawlTimeoutSeconds
        });
        const wrapped = wrapWebFetchContent(firecrawl.text, params.maxChars);
        const wrappedTitle = firecrawl.title ? wrapWebFetchField(firecrawl.title) : undefined;
        const payload = {
          url: params.url, // Keep raw for tool chaining
          finalUrl: firecrawl.finalUrl || finalUrl, // Keep raw
          status: firecrawl.status ?? res.status,
          contentType: "text/markdown", // Protocol metadata, don't wrap
          title: wrappedTitle,
          extractMode: params.extractMode,
          extractor: "firecrawl",
          truncated: wrapped.truncated,
          length: wrapped.wrappedLength,
          rawLength: wrapped.rawLength, // Actual content length, not wrapped
          wrappedLength: wrapped.wrappedLength,
          fetchedAt: new Date().toISOString(),
          tookMs: Date.now() - start,
          text: wrapped.text,
          warning: wrapWebFetchField(firecrawl.warning)
        };
        (0, _webShared.writeCache)(FETCH_CACHE, cacheKey, payload, params.cacheTtlMs);
        return payload;
      }
      const rawDetail = await (0, _webShared.readResponseText)(res);
      const detail = formatWebFetchErrorDetail({
        detail: rawDetail,
        contentType: res.headers.get("content-type"),
        maxChars: DEFAULT_ERROR_MAX_CHARS
      });
      const wrappedDetail = wrapWebFetchContent(detail || res.statusText, DEFAULT_ERROR_MAX_CHARS);
      throw new Error(`Web fetch failed (${res.status}): ${wrappedDetail.text}`);
    }
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const normalizedContentType = normalizeContentType(contentType) ?? "application/octet-stream";
    const body = await (0, _webShared.readResponseText)(res);
    let title;
    let extractor = "raw";
    let text = body;
    if (contentType.includes("text/html")) {
      if (params.readabilityEnabled) {
        const readable = await (0, _webFetchUtils.extractReadableContent)({
          html: body,
          url: finalUrl,
          extractMode: params.extractMode
        });
        if (readable?.text) {
          text = readable.text;
          title = readable.title;
          extractor = "readability";
        } else
        {
          const firecrawl = await tryFirecrawlFallback({ ...params, url: finalUrl });
          if (firecrawl) {
            text = firecrawl.text;
            title = firecrawl.title;
            extractor = "firecrawl";
          } else
          {
            throw new Error("Web fetch extraction failed: Readability and Firecrawl returned no content.");
          }
        }
      } else
      {
        throw new Error("Web fetch extraction failed: Readability disabled and Firecrawl unavailable.");
      }
    } else
    if (contentType.includes("application/json")) {
      try {
        text = JSON.stringify(JSON.parse(body), null, 2);
        extractor = "json";
      }
      catch {
        text = body;
        extractor = "raw";
      }
    }
    const wrapped = wrapWebFetchContent(text, params.maxChars);
    const wrappedTitle = title ? wrapWebFetchField(title) : undefined;
    const payload = {
      url: params.url, // Keep raw for tool chaining
      finalUrl, // Keep raw
      status: res.status,
      contentType: normalizedContentType, // Protocol metadata, don't wrap
      title: wrappedTitle,
      extractMode: params.extractMode,
      extractor,
      truncated: wrapped.truncated,
      length: wrapped.wrappedLength,
      rawLength: wrapped.rawLength, // Actual content length, not wrapped
      wrappedLength: wrapped.wrappedLength,
      fetchedAt: new Date().toISOString(),
      tookMs: Date.now() - start,
      text: wrapped.text
    };
    (0, _webShared.writeCache)(FETCH_CACHE, cacheKey, payload, params.cacheTtlMs);
    return payload;
  } finally
  {
    await (0, _ssrf.closeDispatcher)(dispatcher);
  }
}
async function tryFirecrawlFallback(params) {
  if (!params.firecrawlEnabled || !params.firecrawlApiKey) {
    return null;
  }
  try {
    const firecrawl = await fetchFirecrawlContent({
      url: params.url,
      extractMode: params.extractMode,
      apiKey: params.firecrawlApiKey,
      baseUrl: params.firecrawlBaseUrl,
      onlyMainContent: params.firecrawlOnlyMainContent,
      maxAgeMs: params.firecrawlMaxAgeMs,
      proxy: params.firecrawlProxy,
      storeInCache: params.firecrawlStoreInCache,
      timeoutSeconds: params.firecrawlTimeoutSeconds
    });
    return { text: firecrawl.text, title: firecrawl.title };
  }
  catch {
    return null;
  }
}
function resolveFirecrawlEndpoint(baseUrl) {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return `${DEFAULT_FIRECRAWL_BASE_URL}/v2/scrape`;
  }
  try {
    const url = new URL(trimmed);
    if (url.pathname && url.pathname !== "/") {
      return url.toString();
    }
    url.pathname = "/v2/scrape";
    return url.toString();
  }
  catch {
    return `${DEFAULT_FIRECRAWL_BASE_URL}/v2/scrape`;
  }
}
function createWebFetchTool(options) {
  const fetch = resolveFetchConfig(options?.config);
  if (!resolveFetchEnabled({ fetch, sandboxed: options?.sandboxed })) {
    return null;
  }
  const readabilityEnabled = resolveFetchReadabilityEnabled(fetch);
  const firecrawl = resolveFirecrawlConfig(fetch);
  const firecrawlApiKey = resolveFirecrawlApiKey(firecrawl);
  const firecrawlEnabled = resolveFirecrawlEnabled({ firecrawl, apiKey: firecrawlApiKey });
  const firecrawlBaseUrl = resolveFirecrawlBaseUrl(firecrawl);
  const firecrawlOnlyMainContent = resolveFirecrawlOnlyMainContent(firecrawl);
  const firecrawlMaxAgeMs = resolveFirecrawlMaxAgeMsOrDefault(firecrawl);
  const firecrawlTimeoutSeconds = (0, _webShared.resolveTimeoutSeconds)(firecrawl?.timeoutSeconds ?? fetch?.timeoutSeconds, _webShared.DEFAULT_TIMEOUT_SECONDS);
  const userAgent = fetch && "userAgent" in fetch && typeof fetch.userAgent === "string" && fetch.userAgent ||
  DEFAULT_FETCH_USER_AGENT;
  return {
    label: "Web Fetch",
    name: "web_fetch",
    description: "Fetch and extract readable content from a URL (HTML → markdown/text). Use for lightweight page access without browser automation.",
    parameters: WebFetchSchema,
    execute: async (_toolCallId, args) => {
      const params = args;
      const url = (0, _common.readStringParam)(params, "url", { required: true });
      const extractMode = (0, _common.readStringParam)(params, "extractMode") === "text" ? "text" : "markdown";
      const maxChars = (0, _common.readNumberParam)(params, "maxChars", { integer: true });
      const result = await runWebFetch({
        url,
        extractMode,
        maxChars: resolveMaxChars(maxChars ?? fetch?.maxChars, DEFAULT_FETCH_MAX_CHARS),
        maxRedirects: resolveMaxRedirects(fetch?.maxRedirects, DEFAULT_FETCH_MAX_REDIRECTS),
        timeoutSeconds: (0, _webShared.resolveTimeoutSeconds)(fetch?.timeoutSeconds, _webShared.DEFAULT_TIMEOUT_SECONDS),
        cacheTtlMs: (0, _webShared.resolveCacheTtlMs)(fetch?.cacheTtlMinutes, _webShared.DEFAULT_CACHE_TTL_MINUTES),
        userAgent,
        readabilityEnabled,
        firecrawlEnabled,
        firecrawlApiKey,
        firecrawlBaseUrl,
        firecrawlOnlyMainContent,
        firecrawlMaxAgeMs,
        firecrawlProxy: "auto",
        firecrawlStoreInCache: true,
        firecrawlTimeoutSeconds
      });
      return (0, _common.jsonResult)(result);
    }
  };
} /* v9-f56430987bd8621d */
