"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.guardSessionManager = guardSessionManager;var _hookRunnerGlobal = require("../plugins/hook-runner-global.js");
var _sessionToolResultGuard = require("./session-tool-result-guard.js");
/**
 * Apply the tool-result guard to a SessionManager exactly once and expose
 * a flush method on the instance for easy teardown handling.
 */
function guardSessionManager(sessionManager, opts) {
  if (typeof sessionManager.flushPendingToolResults === "function") {
    return sessionManager;
  }
  const hookRunner = (0, _hookRunnerGlobal.getGlobalHookRunner)();
  const transform = hookRunner?.hasHooks("tool_result_persist") ?
  // oxlint-disable-next-line typescript/no-explicit-any
  (message, meta) => {
    const out = hookRunner.runToolResultPersist({
      toolName: meta.toolName,
      toolCallId: meta.toolCallId,
      message,
      isSynthetic: meta.isSynthetic
    }, {
      agentId: opts?.agentId,
      sessionKey: opts?.sessionKey,
      toolName: meta.toolName,
      toolCallId: meta.toolCallId
    });
    return out?.message ?? message;
  } :
  undefined;
  const guard = (0, _sessionToolResultGuard.installSessionToolResultGuard)(sessionManager, {
    transformToolResultForPersistence: transform,
    allowSyntheticToolResults: opts?.allowSyntheticToolResults
  });
  sessionManager.flushPendingToolResults = guard.flushPendingToolResults;
  return sessionManager;
} /* v9-489e6a59f141f1c5 */
