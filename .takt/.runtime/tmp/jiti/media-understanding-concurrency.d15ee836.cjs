"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.runWithConcurrency = runWithConcurrency;var _globals = require("../globals.js");
async function runWithConcurrency(tasks, limit) {
  if (tasks.length === 0) {
    return [];
  }
  const resolvedLimit = Math.max(1, Math.min(limit, tasks.length));
  const results = Array.from({ length: tasks.length });
  let next = 0;
  const workers = Array.from({ length: resolvedLimit }, async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= tasks.length) {
        return;
      }
      try {
        results[index] = await tasks[index]();
      }
      catch (err) {
        if ((0, _globals.shouldLogVerbose)()) {
          (0, _globals.logVerbose)(`Media understanding task failed: ${String(err)}`);
        }
      }
    }
  });
  await Promise.allSettled(workers);
  return results;
} /* v9-1ce9a1f8506ed7e0 */
