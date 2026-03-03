"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.recordInboundSession = recordInboundSession;var _sessions = require("../config/sessions.js");
async function recordInboundSession(params) {
  const { storePath, sessionKey, ctx, groupResolution, createIfMissing } = params;
  void (0, _sessions.recordSessionMetaFromInbound)({
    storePath,
    sessionKey,
    ctx,
    groupResolution,
    createIfMissing
  }).catch(params.onRecordError);
  const update = params.updateLastRoute;
  if (!update) {
    return;
  }
  await (0, _sessions.updateLastRoute)({
    storePath,
    sessionKey: update.sessionKey,
    deliveryContext: {
      channel: update.channel,
      to: update.to,
      accountId: update.accountId,
      threadId: update.threadId
    },
    ctx,
    groupResolution
  });
} /* v9-874a827bbc4b2323 */
