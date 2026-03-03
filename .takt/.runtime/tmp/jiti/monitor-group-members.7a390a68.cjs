"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatGroupMembers = formatGroupMembers;exports.noteGroupMember = noteGroupMember;var _utils = require("../../../utils.js");
function noteGroupMember(groupMemberNames, conversationId, e164, name) {
  if (!e164 || !name) {
    return;
  }
  const normalized = (0, _utils.normalizeE164)(e164);
  const key = normalized ?? e164;
  if (!key) {
    return;
  }
  let roster = groupMemberNames.get(conversationId);
  if (!roster) {
    roster = new Map();
    groupMemberNames.set(conversationId, roster);
  }
  roster.set(key, name);
}
function formatGroupMembers(params) {
  const { participants, roster, fallbackE164 } = params;
  const seen = new Set();
  const ordered = [];
  if (participants?.length) {
    for (const entry of participants) {
      if (!entry) {
        continue;
      }
      const normalized = (0, _utils.normalizeE164)(entry) ?? entry;
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      ordered.push(normalized);
    }
  }
  if (roster) {
    for (const entry of roster.keys()) {
      const normalized = (0, _utils.normalizeE164)(entry) ?? entry;
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      ordered.push(normalized);
    }
  }
  if (ordered.length === 0 && fallbackE164) {
    const normalized = (0, _utils.normalizeE164)(fallbackE164) ?? fallbackE164;
    if (normalized) {
      ordered.push(normalized);
    }
  }
  if (ordered.length === 0) {
    return undefined;
  }
  return ordered.
  map((entry) => {
    const name = roster?.get(entry);
    return name ? `${name} (${entry})` : entry;
  }).
  join(", ");
} /* v9-a5f93d2a54124352 */
