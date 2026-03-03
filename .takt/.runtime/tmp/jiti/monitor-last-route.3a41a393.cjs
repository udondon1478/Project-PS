"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.awaitBackgroundTasks = awaitBackgroundTasks;exports.trackBackgroundTask = trackBackgroundTask;exports.updateLastRouteInBackground = updateLastRouteInBackground;var _sessions = require("../../../config/sessions.js");
var _session = require("../../session.js");
function trackBackgroundTask(backgroundTasks, task) {
  backgroundTasks.add(task);
  void task.finally(() => {
    backgroundTasks.delete(task);
  });
}
function updateLastRouteInBackground(params) {
  const storePath = (0, _sessions.resolveStorePath)(params.cfg.session?.store, {
    agentId: params.storeAgentId
  });
  const task = (0, _sessions.updateLastRoute)({
    storePath,
    sessionKey: params.sessionKey,
    deliveryContext: {
      channel: params.channel,
      to: params.to,
      accountId: params.accountId
    },
    ctx: params.ctx
  }).catch((err) => {
    params.warn({
      error: (0, _session.formatError)(err),
      storePath,
      sessionKey: params.sessionKey,
      to: params.to
    }, "failed updating last route");
  });
  trackBackgroundTask(params.backgroundTasks, task);
}
function awaitBackgroundTasks(backgroundTasks) {
  if (backgroundTasks.size === 0) {
    return Promise.resolve();
  }
  return Promise.allSettled(backgroundTasks).then(() => {
    backgroundTasks.clear();
  });
} /* v9-ab53fb45e39e31d8 */
