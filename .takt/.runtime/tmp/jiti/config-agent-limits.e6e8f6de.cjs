"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_SUBAGENT_MAX_CONCURRENT = exports.DEFAULT_AGENT_MAX_CONCURRENT = void 0;exports.resolveAgentMaxConcurrent = resolveAgentMaxConcurrent;exports.resolveSubagentMaxConcurrent = resolveSubagentMaxConcurrent;const DEFAULT_AGENT_MAX_CONCURRENT = exports.DEFAULT_AGENT_MAX_CONCURRENT = 4;
const DEFAULT_SUBAGENT_MAX_CONCURRENT = exports.DEFAULT_SUBAGENT_MAX_CONCURRENT = 8;
function resolveAgentMaxConcurrent(cfg) {
  const raw = cfg?.agents?.defaults?.maxConcurrent;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(1, Math.floor(raw));
  }
  return DEFAULT_AGENT_MAX_CONCURRENT;
}
function resolveSubagentMaxConcurrent(cfg) {
  const raw = cfg?.agents?.defaults?.subagents?.maxConcurrent;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(1, Math.floor(raw));
  }
  return DEFAULT_SUBAGENT_MAX_CONCURRENT;
} /* v9-403ac2557261e8d1 */
