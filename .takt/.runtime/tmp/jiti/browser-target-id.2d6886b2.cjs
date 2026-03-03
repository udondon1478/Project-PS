"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveTargetIdFromTabs = resolveTargetIdFromTabs;function resolveTargetIdFromTabs(input, tabs) {
  const needle = input.trim();
  if (!needle) {
    return { ok: false, reason: "not_found" };
  }
  const exact = tabs.find((t) => t.targetId === needle);
  if (exact) {
    return { ok: true, targetId: exact.targetId };
  }
  const lower = needle.toLowerCase();
  const matches = tabs.map((t) => t.targetId).filter((id) => id.toLowerCase().startsWith(lower));
  const only = matches.length === 1 ? matches[0] : undefined;
  if (only) {
    return { ok: true, targetId: only };
  }
  if (matches.length === 0) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: false, reason: "ambiguous", matches };
} /* v9-a35ac7fd3a59e2f6 */
