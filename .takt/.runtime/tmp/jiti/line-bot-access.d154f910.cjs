"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.normalizeAllowFromWithStore = exports.normalizeAllowFrom = exports.isSenderAllowed = exports.firstDefined = void 0;function normalizeAllowEntry(value) {
  const trimmed = String(value).trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed === "*") {
    return "*";
  }
  return trimmed.replace(/^line:(?:user:)?/i, "");
}
const normalizeAllowFrom = (list) => {
  const entries = (list ?? []).map((value) => normalizeAllowEntry(value)).filter(Boolean);
  const hasWildcard = entries.includes("*");
  return {
    entries,
    hasWildcard,
    hasEntries: entries.length > 0
  };
};exports.normalizeAllowFrom = normalizeAllowFrom;
const normalizeAllowFromWithStore = (params) => {
  const combined = [...(params.allowFrom ?? []), ...(params.storeAllowFrom ?? [])];
  return normalizeAllowFrom(combined);
};exports.normalizeAllowFromWithStore = normalizeAllowFromWithStore;
const firstDefined = (...values) => {
  for (const value of values) {
    if (typeof value !== "undefined") {
      return value;
    }
  }
  return undefined;
};exports.firstDefined = firstDefined;
const isSenderAllowed = (params) => {
  const { allow, senderId } = params;
  if (!allow.hasEntries) {
    return false;
  }
  if (allow.hasWildcard) {
    return true;
  }
  if (!senderId) {
    return false;
  }
  return allow.entries.includes(senderId);
};exports.isSenderAllowed = isSenderAllowed; /* v9-d04888b0d9faa90d */
