"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveChannelMediaMaxBytes = resolveChannelMediaMaxBytes;var _sessionKey = require("../../routing/session-key.js");
const MB = 1024 * 1024;
function resolveChannelMediaMaxBytes(params) {
  const accountId = (0, _sessionKey.normalizeAccountId)(params.accountId);
  const channelLimit = params.resolveChannelLimitMb({
    cfg: params.cfg,
    accountId
  });
  if (channelLimit) {
    return channelLimit * MB;
  }
  if (params.cfg.agents?.defaults?.mediaMaxMb) {
    return params.cfg.agents.defaults.mediaMaxMb * MB;
  }
  return undefined;
} /* v9-eee6508ab92a9e11 */
