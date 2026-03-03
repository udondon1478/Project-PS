"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.__testing = void 0;exports.runBeforeToolCallHook = runBeforeToolCallHook;exports.wrapToolWithBeforeToolCallHook = wrapToolWithBeforeToolCallHook;var _subsystem = require("../logging/subsystem.js");
var _hookRunnerGlobal = require("../plugins/hook-runner-global.js");
var _toolPolicy = require("./tool-policy.js");
const log = (0, _subsystem.createSubsystemLogger)("agents/tools");
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
async function runBeforeToolCallHook(args) {
  const hookRunner = (0, _hookRunnerGlobal.getGlobalHookRunner)();
  if (!hookRunner?.hasHooks("before_tool_call")) {
    return { blocked: false, params: args.params };
  }
  const toolName = (0, _toolPolicy.normalizeToolName)(args.toolName || "tool");
  const params = args.params;
  try {
    const normalizedParams = isPlainObject(params) ? params : {};
    const hookResult = await hookRunner.runBeforeToolCall({
      toolName,
      params: normalizedParams
    }, {
      toolName,
      agentId: args.ctx?.agentId,
      sessionKey: args.ctx?.sessionKey
    });
    if (hookResult?.block) {
      return {
        blocked: true,
        reason: hookResult.blockReason || "Tool call blocked by plugin hook"
      };
    }
    if (hookResult?.params && isPlainObject(hookResult.params)) {
      if (isPlainObject(params)) {
        return { blocked: false, params: { ...params, ...hookResult.params } };
      }
      return { blocked: false, params: hookResult.params };
    }
  }
  catch (err) {
    const toolCallId = args.toolCallId ? ` toolCallId=${args.toolCallId}` : "";
    log.warn(`before_tool_call hook failed: tool=${toolName}${toolCallId} error=${String(err)}`);
  }
  return { blocked: false, params };
}
function wrapToolWithBeforeToolCallHook(tool, ctx) {
  const execute = tool.execute;
  if (!execute) {
    return tool;
  }
  const toolName = tool.name || "tool";
  return {
    ...tool,
    execute: async (toolCallId, params, signal, onUpdate) => {
      const outcome = await runBeforeToolCallHook({
        toolName,
        params,
        toolCallId,
        ctx
      });
      if (outcome.blocked) {
        throw new Error(outcome.reason);
      }
      return await execute(toolCallId, outcome.params, signal, onUpdate);
    }
  };
}
const __testing = exports.__testing = {
  runBeforeToolCallHook,
  isPlainObject
}; /* v9-dbe874c0abde5e80 */
