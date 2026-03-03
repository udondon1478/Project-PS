"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.clearSessionQueues = clearSessionQueues;var _piEmbedded = require("../../../agents/pi-embedded.js");
var _commandQueue = require("../../../process/command-queue.js");
var _state = require("./state.js");
function clearSessionQueues(keys) {
  const seen = new Set();
  let followupCleared = 0;
  let laneCleared = 0;
  const clearedKeys = [];
  for (const key of keys) {
    const cleaned = key?.trim();
    if (!cleaned || seen.has(cleaned)) {
      continue;
    }
    seen.add(cleaned);
    clearedKeys.push(cleaned);
    followupCleared += (0, _state.clearFollowupQueue)(cleaned);
    laneCleared += (0, _commandQueue.clearCommandLane)((0, _piEmbedded.resolveEmbeddedSessionLane)(cleaned));
  }
  return { followupCleared, laneCleared, keys: clearedKeys };
} /* v9-bb46635e13206f4b */
