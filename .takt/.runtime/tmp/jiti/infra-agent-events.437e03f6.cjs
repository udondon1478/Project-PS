"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.clearAgentRunContext = clearAgentRunContext;exports.emitAgentEvent = emitAgentEvent;exports.getAgentRunContext = getAgentRunContext;exports.onAgentEvent = onAgentEvent;exports.registerAgentRunContext = registerAgentRunContext;exports.resetAgentRunContextForTest = resetAgentRunContextForTest; // Keep per-run counters so streams stay strictly monotonic per runId.
const seqByRun = new Map();
const listeners = new Set();
const runContextById = new Map();
function registerAgentRunContext(runId, context) {
  if (!runId) {
    return;
  }
  const existing = runContextById.get(runId);
  if (!existing) {
    runContextById.set(runId, { ...context });
    return;
  }
  if (context.sessionKey && existing.sessionKey !== context.sessionKey) {
    existing.sessionKey = context.sessionKey;
  }
  if (context.verboseLevel && existing.verboseLevel !== context.verboseLevel) {
    existing.verboseLevel = context.verboseLevel;
  }
  if (context.isHeartbeat !== undefined && existing.isHeartbeat !== context.isHeartbeat) {
    existing.isHeartbeat = context.isHeartbeat;
  }
}
function getAgentRunContext(runId) {
  return runContextById.get(runId);
}
function clearAgentRunContext(runId) {
  runContextById.delete(runId);
}
function resetAgentRunContextForTest() {
  runContextById.clear();
}
function emitAgentEvent(event) {
  const nextSeq = (seqByRun.get(event.runId) ?? 0) + 1;
  seqByRun.set(event.runId, nextSeq);
  const context = runContextById.get(event.runId);
  const sessionKey = typeof event.sessionKey === "string" && event.sessionKey.trim() ?
  event.sessionKey :
  context?.sessionKey;
  const enriched = {
    ...event,
    sessionKey,
    seq: nextSeq,
    ts: Date.now()
  };
  for (const listener of listeners) {
    try {
      listener(enriched);
    }
    catch {

      /* ignore */}
  }
}
function onAgentEvent(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
} /* v9-6c7010aa91da3e69 */
