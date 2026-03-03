"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.enqueueFollowupRun = enqueueFollowupRun;exports.getFollowupQueueDepth = getFollowupQueueDepth;var _queueHelpers = require("../../../utils/queue-helpers.js");
var _state = require("./state.js");
function isRunAlreadyQueued(run, items, allowPromptFallback = false) {
  const hasSameRouting = (item) => item.originatingChannel === run.originatingChannel &&
  item.originatingTo === run.originatingTo &&
  item.originatingAccountId === run.originatingAccountId &&
  item.originatingThreadId === run.originatingThreadId;
  const messageId = run.messageId?.trim();
  if (messageId) {
    return items.some((item) => item.messageId?.trim() === messageId && hasSameRouting(item));
  }
  if (!allowPromptFallback) {
    return false;
  }
  return items.some((item) => item.prompt === run.prompt && hasSameRouting(item));
}
function enqueueFollowupRun(key, run, settings, dedupeMode = "message-id") {
  const queue = (0, _state.getFollowupQueue)(key, settings);
  const dedupe = dedupeMode === "none" ?
  undefined :
  (item, items) => isRunAlreadyQueued(item, items, dedupeMode === "prompt");
  // Deduplicate: skip if the same message is already queued.
  if ((0, _queueHelpers.shouldSkipQueueItem)({ item: run, items: queue.items, dedupe })) {
    return false;
  }
  queue.lastEnqueuedAt = Date.now();
  queue.lastRun = run.run;
  const shouldEnqueue = (0, _queueHelpers.applyQueueDropPolicy)({
    queue,
    summarize: (item) => item.summaryLine?.trim() || item.prompt.trim()
  });
  if (!shouldEnqueue) {
    return false;
  }
  queue.items.push(run);
  return true;
}
function getFollowupQueueDepth(key) {
  const cleaned = key.trim();
  if (!cleaned) {
    return 0;
  }
  const queue = _state.FOLLOWUP_QUEUES.get(cleaned);
  if (!queue) {
    return 0;
  }
  return queue.items.length;
} /* v9-644af9e095957242 */
