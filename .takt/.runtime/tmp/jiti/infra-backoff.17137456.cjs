"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.computeBackoff = computeBackoff;exports.sleepWithAbort = sleepWithAbort;var _promises = require("node:timers/promises");
function computeBackoff(policy, attempt) {
  const base = policy.initialMs * policy.factor ** Math.max(attempt - 1, 0);
  const jitter = base * policy.jitter * Math.random();
  return Math.min(policy.maxMs, Math.round(base + jitter));
}
async function sleepWithAbort(ms, abortSignal) {
  if (ms <= 0) {
    return;
  }
  try {
    await (0, _promises.setTimeout)(ms, undefined, { signal: abortSignal });
  }
  catch (err) {
    if (abortSignal?.aborted) {
      throw new Error("aborted", { cause: err });
    }
    throw err;
  }
} /* v9-c9e4b8f7e7019dfa */
