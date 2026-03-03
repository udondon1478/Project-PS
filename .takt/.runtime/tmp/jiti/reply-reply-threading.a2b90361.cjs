"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createReplyToModeFilter = createReplyToModeFilter;exports.createReplyToModeFilterForChannel = createReplyToModeFilterForChannel;exports.resolveReplyToMode = resolveReplyToMode;var _dock = require("../../channels/dock.js");
var _index = require("../../channels/plugins/index.js");
function resolveReplyToMode(cfg, channel, accountId, chatType) {
  const provider = (0, _index.normalizeChannelId)(channel);
  if (!provider) {
    return "all";
  }
  const resolved = (0, _dock.getChannelDock)(provider)?.threading?.resolveReplyToMode?.({
    cfg,
    accountId,
    chatType
  });
  return resolved ?? "all";
}
function createReplyToModeFilter(mode, opts = {}) {
  let hasThreaded = false;
  return (payload) => {
    if (!payload.replyToId) {
      return payload;
    }
    if (mode === "off") {
      if (opts.allowTagsWhenOff && payload.replyToTag) {
        return payload;
      }
      return { ...payload, replyToId: undefined };
    }
    if (mode === "all") {
      return payload;
    }
    if (hasThreaded) {
      return { ...payload, replyToId: undefined };
    }
    hasThreaded = true;
    return payload;
  };
}
function createReplyToModeFilterForChannel(mode, channel) {
  const provider = (0, _index.normalizeChannelId)(channel);
  const allowTagsWhenOff = provider ?
  Boolean((0, _dock.getChannelDock)(provider)?.threading?.allowTagsWhenOff) :
  false;
  return createReplyToModeFilter(mode, {
    allowTagsWhenOff
  });
} /* v9-d6e721323b3bc856 */
