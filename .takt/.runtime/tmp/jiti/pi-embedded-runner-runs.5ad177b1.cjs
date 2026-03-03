"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.abortEmbeddedPiRun = abortEmbeddedPiRun;exports.clearActiveEmbeddedRun = clearActiveEmbeddedRun;exports.isEmbeddedPiRunActive = isEmbeddedPiRunActive;exports.isEmbeddedPiRunStreaming = isEmbeddedPiRunStreaming;exports.queueEmbeddedPiMessage = queueEmbeddedPiMessage;exports.setActiveEmbeddedRun = setActiveEmbeddedRun;exports.waitForEmbeddedPiRunEnd = waitForEmbeddedPiRunEnd;var _diagnostic = require("../../logging/diagnostic.js");
const ACTIVE_EMBEDDED_RUNS = new Map();
const EMBEDDED_RUN_WAITERS = new Map();
function queueEmbeddedPiMessage(sessionId, text) {
  const handle = ACTIVE_EMBEDDED_RUNS.get(sessionId);
  if (!handle) {
    _diagnostic.diagnosticLogger.debug(`queue message failed: sessionId=${sessionId} reason=no_active_run`);
    return false;
  }
  if (!handle.isStreaming()) {
    _diagnostic.diagnosticLogger.debug(`queue message failed: sessionId=${sessionId} reason=not_streaming`);
    return false;
  }
  if (handle.isCompacting()) {
    _diagnostic.diagnosticLogger.debug(`queue message failed: sessionId=${sessionId} reason=compacting`);
    return false;
  }
  (0, _diagnostic.logMessageQueued)({ sessionId, source: "pi-embedded-runner" });
  void handle.queueMessage(text);
  return true;
}
function abortEmbeddedPiRun(sessionId) {
  const handle = ACTIVE_EMBEDDED_RUNS.get(sessionId);
  if (!handle) {
    _diagnostic.diagnosticLogger.debug(`abort failed: sessionId=${sessionId} reason=no_active_run`);
    return false;
  }
  _diagnostic.diagnosticLogger.debug(`aborting run: sessionId=${sessionId}`);
  handle.abort();
  return true;
}
function isEmbeddedPiRunActive(sessionId) {
  const active = ACTIVE_EMBEDDED_RUNS.has(sessionId);
  if (active) {
    _diagnostic.diagnosticLogger.debug(`run active check: sessionId=${sessionId} active=true`);
  }
  return active;
}
function isEmbeddedPiRunStreaming(sessionId) {
  const handle = ACTIVE_EMBEDDED_RUNS.get(sessionId);
  if (!handle) {
    return false;
  }
  return handle.isStreaming();
}
function waitForEmbeddedPiRunEnd(sessionId, timeoutMs = 15_000) {
  if (!sessionId || !ACTIVE_EMBEDDED_RUNS.has(sessionId)) {
    return Promise.resolve(true);
  }
  _diagnostic.diagnosticLogger.debug(`waiting for run end: sessionId=${sessionId} timeoutMs=${timeoutMs}`);
  return new Promise((resolve) => {
    const waiters = EMBEDDED_RUN_WAITERS.get(sessionId) ?? new Set();
    const waiter = {
      resolve,
      timer: setTimeout(() => {
        waiters.delete(waiter);
        if (waiters.size === 0) {
          EMBEDDED_RUN_WAITERS.delete(sessionId);
        }
        _diagnostic.diagnosticLogger.warn(`wait timeout: sessionId=${sessionId} timeoutMs=${timeoutMs}`);
        resolve(false);
      }, Math.max(100, timeoutMs))
    };
    waiters.add(waiter);
    EMBEDDED_RUN_WAITERS.set(sessionId, waiters);
    if (!ACTIVE_EMBEDDED_RUNS.has(sessionId)) {
      waiters.delete(waiter);
      if (waiters.size === 0) {
        EMBEDDED_RUN_WAITERS.delete(sessionId);
      }
      clearTimeout(waiter.timer);
      resolve(true);
    }
  });
}
function notifyEmbeddedRunEnded(sessionId) {
  const waiters = EMBEDDED_RUN_WAITERS.get(sessionId);
  if (!waiters || waiters.size === 0) {
    return;
  }
  EMBEDDED_RUN_WAITERS.delete(sessionId);
  _diagnostic.diagnosticLogger.debug(`notifying waiters: sessionId=${sessionId} waiterCount=${waiters.size}`);
  for (const waiter of waiters) {
    clearTimeout(waiter.timer);
    waiter.resolve(true);
  }
}
function setActiveEmbeddedRun(sessionId, handle) {
  const wasActive = ACTIVE_EMBEDDED_RUNS.has(sessionId);
  ACTIVE_EMBEDDED_RUNS.set(sessionId, handle);
  (0, _diagnostic.logSessionStateChange)({
    sessionId,
    state: "processing",
    reason: wasActive ? "run_replaced" : "run_started"
  });
  if (!sessionId.startsWith("probe-")) {
    _diagnostic.diagnosticLogger.debug(`run registered: sessionId=${sessionId} totalActive=${ACTIVE_EMBEDDED_RUNS.size}`);
  }
}
function clearActiveEmbeddedRun(sessionId, handle) {
  if (ACTIVE_EMBEDDED_RUNS.get(sessionId) === handle) {
    ACTIVE_EMBEDDED_RUNS.delete(sessionId);
    (0, _diagnostic.logSessionStateChange)({ sessionId, state: "idle", reason: "run_completed" });
    if (!sessionId.startsWith("probe-")) {
      _diagnostic.diagnosticLogger.debug(`run cleared: sessionId=${sessionId} totalActive=${ACTIVE_EMBEDDED_RUNS.size}`);
    }
    notifyEmbeddedRunEnded(sessionId);
  } else
  {
    _diagnostic.diagnosticLogger.debug(`run clear skipped: sessionId=${sessionId} reason=handle_mismatch`);
  }
} /* v9-4982ca410d98ac99 */
