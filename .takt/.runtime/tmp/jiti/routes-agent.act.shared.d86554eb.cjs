"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ACT_KINDS = void 0;exports.isActKind = isActKind;exports.parseClickButton = parseClickButton;exports.parseClickModifiers = parseClickModifiers;const ACT_KINDS = exports.ACT_KINDS = [
"click",
"close",
"drag",
"evaluate",
"fill",
"hover",
"scrollIntoView",
"press",
"resize",
"select",
"type",
"wait"];

function isActKind(value) {
  if (typeof value !== "string") {
    return false;
  }
  return ACT_KINDS.includes(value);
}
const ALLOWED_CLICK_MODIFIERS = new Set([
"Alt",
"Control",
"ControlOrMeta",
"Meta",
"Shift"]
);
function parseClickButton(raw) {
  if (raw === "left" || raw === "right" || raw === "middle") {
    return raw;
  }
  return undefined;
}
function parseClickModifiers(raw) {
  const invalid = raw.filter((m) => !ALLOWED_CLICK_MODIFIERS.has(m));
  if (invalid.length) {
    return { error: "modifiers must be Alt|Control|ControlOrMeta|Meta|Shift" };
  }
  return { modifiers: raw.length ? raw : undefined };
} /* v9-4048f948c646e3a8 */
