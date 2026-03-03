"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.extractLinksFromMessage = extractLinksFromMessage;var _defaults = require("./defaults.js");
// Remove markdown link syntax so only bare URLs are considered.
const MARKDOWN_LINK_RE = /\[[^\]]*]\((https?:\/\/\S+?)\)/gi;
const BARE_LINK_RE = /https?:\/\/\S+/gi;
function stripMarkdownLinks(message) {
  return message.replace(MARKDOWN_LINK_RE, " ");
}
function resolveMaxLinks(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return _defaults.DEFAULT_MAX_LINKS;
}
function isAllowedUrl(raw) {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    if (parsed.hostname === "127.0.0.1") {
      return false;
    }
    return true;
  }
  catch {
    return false;
  }
}
function extractLinksFromMessage(message, opts) {
  const source = message?.trim();
  if (!source) {
    return [];
  }
  const maxLinks = resolveMaxLinks(opts?.maxLinks);
  const sanitized = stripMarkdownLinks(source);
  const seen = new Set();
  const results = [];
  for (const match of sanitized.matchAll(BARE_LINK_RE)) {
    const raw = match[0]?.trim();
    if (!raw) {
      continue;
    }
    if (!isAllowedUrl(raw)) {
      continue;
    }
    if (seen.has(raw)) {
      continue;
    }
    seen.add(raw);
    results.push(raw);
    if (results.length >= maxLinks) {
      break;
    }
  }
  return results;
} /* v9-4bc619d41074e2f0 */
