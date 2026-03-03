"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.serializeByKey = serializeByKey;const SKILLS_SYNC_QUEUE = new Map();
async function serializeByKey(key, task) {
  const prev = SKILLS_SYNC_QUEUE.get(key) ?? Promise.resolve();
  const next = prev.then(task, task);
  SKILLS_SYNC_QUEUE.set(key, next);
  try {
    return await next;
  } finally
  {
    if (SKILLS_SYNC_QUEUE.get(key) === next) {
      SKILLS_SYNC_QUEUE.delete(key);
    }
  }
} /* v9-de9983cfeb19ff82 */
