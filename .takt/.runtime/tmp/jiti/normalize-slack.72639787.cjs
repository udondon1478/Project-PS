"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.looksLikeSlackTargetId = looksLikeSlackTargetId;exports.normalizeSlackMessagingTarget = normalizeSlackMessagingTarget;var _targets = require("../../../slack/targets.js");
function normalizeSlackMessagingTarget(raw) {
  const target = (0, _targets.parseSlackTarget)(raw, { defaultKind: "channel" });
  return target?.normalized;
}
function looksLikeSlackTargetId(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  if (/^<@([A-Z0-9]+)>$/i.test(trimmed)) {
    return true;
  }
  if (/^(user|channel):/i.test(trimmed)) {
    return true;
  }
  if (/^slack:/i.test(trimmed)) {
    return true;
  }
  if (/^[@#]/.test(trimmed)) {
    return true;
  }
  return /^[CUWGD][A-Z0-9]{8,}$/i.test(trimmed);
} /* v9-af0d55a99e368099 */
