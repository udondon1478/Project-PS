"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.appendMatchMetadata = appendMatchMetadata;exports.asString = asString;exports.formatMatchMetadata = formatMatchMetadata;exports.isRecord = isRecord;function asString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function formatMatchMetadata(params) {
  const matchKey = typeof params.matchKey === "string" ?
  params.matchKey :
  typeof params.matchKey === "number" ?
  String(params.matchKey) :
  undefined;
  const matchSource = asString(params.matchSource);
  const parts = [
  matchKey ? `matchKey=${matchKey}` : null,
  matchSource ? `matchSource=${matchSource}` : null].
  filter((entry) => Boolean(entry));
  return parts.length > 0 ? parts.join(" ") : undefined;
}
function appendMatchMetadata(message, params) {
  const meta = formatMatchMetadata(params);
  return meta ? `${message} (${meta})` : message;
} /* v9-a6b12ed6e12a8e62 */
