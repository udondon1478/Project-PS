"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getChannelActivity = getChannelActivity;exports.recordChannelActivity = recordChannelActivity;exports.resetChannelActivityForTest = resetChannelActivityForTest;const activity = new Map();
function keyFor(channel, accountId) {
  return `${channel}:${accountId || "default"}`;
}
function ensureEntry(channel, accountId) {
  const key = keyFor(channel, accountId);
  const existing = activity.get(key);
  if (existing) {
    return existing;
  }
  const created = { inboundAt: null, outboundAt: null };
  activity.set(key, created);
  return created;
}
function recordChannelActivity(params) {
  const at = typeof params.at === "number" ? params.at : Date.now();
  const accountId = params.accountId?.trim() || "default";
  const entry = ensureEntry(params.channel, accountId);
  if (params.direction === "inbound") {
    entry.inboundAt = at;
  }
  if (params.direction === "outbound") {
    entry.outboundAt = at;
  }
}
function getChannelActivity(params) {
  const accountId = params.accountId?.trim() || "default";
  return activity.get(keyFor(params.channel, accountId)) ?? {
    inboundAt: null,
    outboundAt: null
  };
}
function resetChannelActivityForTest() {
  activity.clear();
} /* v9-03dd0e92aeff40c6 */
