"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isSlackChannelAllowedByPolicy = isSlackChannelAllowedByPolicy;function isSlackChannelAllowedByPolicy(params) {
  const { groupPolicy, channelAllowlistConfigured, channelAllowed } = params;
  if (groupPolicy === "disabled") {
    return false;
  }
  if (groupPolicy === "open") {
    return true;
  }
  if (!channelAllowlistConfigured) {
    return false;
  }
  return channelAllowed;
} /* v9-2955f00461d36302 */
