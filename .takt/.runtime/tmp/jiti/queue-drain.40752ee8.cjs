"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.scheduleFollowupDrain = scheduleFollowupDrain;var _runtime = require("../../../runtime.js");
var _queueHelpers = require("../../../utils/queue-helpers.js");
var _routeReply = require("../route-reply.js");
var _state = require("./state.js");
function scheduleFollowupDrain(key, runFollowup) {
  const queue = _state.FOLLOWUP_QUEUES.get(key);
  if (!queue || queue.draining) {
    return;
  }
  queue.draining = true;
  void (async () => {
    try {
      let forceIndividualCollect = false;
      while (queue.items.length > 0 || queue.droppedCount > 0) {
        await (0, _queueHelpers.waitForQueueDebounce)(queue);
        if (queue.mode === "collect") {
          // Once the batch is mixed, never collect again within this drain.
          // Prevents “collect after shift” collapsing different targets.
          //
          // Debug: `pnpm test src/auto-reply/reply/queue.collect-routing.test.ts`
          if (forceIndividualCollect) {
            const next = queue.items.shift();
            if (!next) {
              break;
            }
            await runFollowup(next);
            continue;
          }
          // Check if messages span multiple channels.
          // If so, process individually to preserve per-message routing.
          const isCrossChannel = (0, _queueHelpers.hasCrossChannelItems)(queue.items, (item) => {
            const channel = item.originatingChannel;
            const to = item.originatingTo;
            const accountId = item.originatingAccountId;
            const threadId = item.originatingThreadId;
            if (!channel && !to && !accountId && typeof threadId !== "number") {
              return {};
            }
            if (!(0, _routeReply.isRoutableChannel)(channel) || !to) {
              return { cross: true };
            }
            const threadKey = typeof threadId === "number" ? String(threadId) : "";
            return {
              key: [channel, to, accountId || "", threadKey].join("|")
            };
          });
          if (isCrossChannel) {
            forceIndividualCollect = true;
            const next = queue.items.shift();
            if (!next) {
              break;
            }
            await runFollowup(next);
            continue;
          }
          const items = queue.items.splice(0, queue.items.length);
          const summary = (0, _queueHelpers.buildQueueSummaryPrompt)({ state: queue, noun: "message" });
          const run = items.at(-1)?.run ?? queue.lastRun;
          if (!run) {
            break;
          }
          // Preserve originating channel from items when collecting same-channel.
          const originatingChannel = items.find((i) => i.originatingChannel)?.originatingChannel;
          const originatingTo = items.find((i) => i.originatingTo)?.originatingTo;
          const originatingAccountId = items.find((i) => i.originatingAccountId)?.originatingAccountId;
          const originatingThreadId = items.find((i) => typeof i.originatingThreadId === "number")?.originatingThreadId;
          const prompt = (0, _queueHelpers.buildCollectPrompt)({
            title: "[Queued messages while agent was busy]",
            items,
            summary,
            renderItem: (item, idx) => `---\nQueued #${idx + 1}\n${item.prompt}`.trim()
          });
          await runFollowup({
            prompt,
            run,
            enqueuedAt: Date.now(),
            originatingChannel,
            originatingTo,
            originatingAccountId,
            originatingThreadId
          });
          continue;
        }
        const summaryPrompt = (0, _queueHelpers.buildQueueSummaryPrompt)({ state: queue, noun: "message" });
        if (summaryPrompt) {
          const run = queue.lastRun;
          if (!run) {
            break;
          }
          await runFollowup({
            prompt: summaryPrompt,
            run,
            enqueuedAt: Date.now()
          });
          continue;
        }
        const next = queue.items.shift();
        if (!next) {
          break;
        }
        await runFollowup(next);
      }
    }
    catch (err) {
      _runtime.defaultRuntime.error?.(`followup queue drain failed for ${key}: ${String(err)}`);
    } finally
    {
      queue.draining = false;
      if (queue.items.length === 0 && queue.droppedCount === 0) {
        _state.FOLLOWUP_QUEUES.delete(key);
      } else
      {
        scheduleFollowupDrain(key, runFollowup);
      }
    }
  })();
} /* v9-1dcfb907feefc8fa */
