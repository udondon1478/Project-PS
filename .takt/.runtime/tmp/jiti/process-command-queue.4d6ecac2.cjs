"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.clearCommandLane = clearCommandLane;exports.enqueueCommand = enqueueCommand;exports.enqueueCommandInLane = enqueueCommandInLane;exports.getQueueSize = getQueueSize;exports.getTotalQueueSize = getTotalQueueSize;exports.setCommandLaneConcurrency = setCommandLaneConcurrency;var _diagnostic = require("../logging/diagnostic.js");
const lanes = new Map();
function getLaneState(lane) {
  const existing = lanes.get(lane);
  if (existing) {
    return existing;
  }
  const created = {
    lane,
    queue: [],
    active: 0,
    maxConcurrent: 1,
    draining: false
  };
  lanes.set(lane, created);
  return created;
}
function drainLane(lane) {
  const state = getLaneState(lane);
  if (state.draining) {
    return;
  }
  state.draining = true;
  const pump = () => {
    while (state.active < state.maxConcurrent && state.queue.length > 0) {
      const entry = state.queue.shift();
      const waitedMs = Date.now() - entry.enqueuedAt;
      if (waitedMs >= entry.warnAfterMs) {
        entry.onWait?.(waitedMs, state.queue.length);
        _diagnostic.diagnosticLogger.warn(`lane wait exceeded: lane=${lane} waitedMs=${waitedMs} queueAhead=${state.queue.length}`);
      }
      (0, _diagnostic.logLaneDequeue)(lane, waitedMs, state.queue.length);
      state.active += 1;
      void (async () => {
        const startTime = Date.now();
        try {
          const result = await entry.task();
          state.active -= 1;
          _diagnostic.diagnosticLogger.debug(`lane task done: lane=${lane} durationMs=${Date.now() - startTime} active=${state.active} queued=${state.queue.length}`);
          pump();
          entry.resolve(result);
        }
        catch (err) {
          state.active -= 1;
          const isProbeLane = lane.startsWith("auth-probe:") || lane.startsWith("session:probe-");
          if (!isProbeLane) {
            _diagnostic.diagnosticLogger.error(`lane task error: lane=${lane} durationMs=${Date.now() - startTime} error="${String(err)}"`);
          }
          pump();
          entry.reject(err);
        }
      })();
    }
    state.draining = false;
  };
  pump();
}
function setCommandLaneConcurrency(lane, maxConcurrent) {
  const cleaned = lane.trim() || "main" /* CommandLane.Main */;
  const state = getLaneState(cleaned);
  state.maxConcurrent = Math.max(1, Math.floor(maxConcurrent));
  drainLane(cleaned);
}
function enqueueCommandInLane(lane, task, opts) {
  const cleaned = lane.trim() || "main" /* CommandLane.Main */;
  const warnAfterMs = opts?.warnAfterMs ?? 2_000;
  const state = getLaneState(cleaned);
  return new Promise((resolve, reject) => {
    state.queue.push({
      task: () => task(),
      resolve: (value) => resolve(value),
      reject,
      enqueuedAt: Date.now(),
      warnAfterMs,
      onWait: opts?.onWait
    });
    (0, _diagnostic.logLaneEnqueue)(cleaned, state.queue.length + state.active);
    drainLane(cleaned);
  });
}
function enqueueCommand(task, opts) {
  return enqueueCommandInLane("main" /* CommandLane.Main */, task, opts);
}
function getQueueSize(lane = "main" /* CommandLane.Main */) {
  const resolved = lane.trim() || "main" /* CommandLane.Main */;
  const state = lanes.get(resolved);
  if (!state) {
    return 0;
  }
  return state.queue.length + state.active;
}
function getTotalQueueSize() {
  let total = 0;
  for (const s of lanes.values()) {
    total += s.queue.length + s.active;
  }
  return total;
}
function clearCommandLane(lane = "main" /* CommandLane.Main */) {
  const cleaned = lane.trim() || "main" /* CommandLane.Main */;
  const state = lanes.get(cleaned);
  if (!state) {
    return 0;
  }
  const removed = state.queue.length;
  state.queue.length = 0;
  return removed;
} /* v9-0a55eef79e6f9a29 */
