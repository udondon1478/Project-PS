"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleToolExecutionEnd = handleToolExecutionEnd;exports.handleToolExecutionStart = handleToolExecutionStart;exports.handleToolExecutionUpdate = handleToolExecutionUpdate;var _agentEvents = require("../infra/agent-events.js");
var _piEmbeddedHelpers = require("./pi-embedded-helpers.js");
var _piEmbeddedMessaging = require("./pi-embedded-messaging.js");
var _piEmbeddedSubscribeTools = require("./pi-embedded-subscribe.tools.js");
var _piEmbeddedUtils = require("./pi-embedded-utils.js");
var _toolPolicy = require("./tool-policy.js");
function extendExecMeta(toolName, args, meta) {
  const normalized = toolName.trim().toLowerCase();
  if (normalized !== "exec" && normalized !== "bash") {
    return meta;
  }
  if (!args || typeof args !== "object") {
    return meta;
  }
  const record = args;
  const flags = [];
  if (record.pty === true) {
    flags.push("pty");
  }
  if (record.elevated === true) {
    flags.push("elevated");
  }
  if (flags.length === 0) {
    return meta;
  }
  const suffix = flags.join(" · ");
  return meta ? `${meta} · ${suffix}` : suffix;
}
async function handleToolExecutionStart(ctx, evt) {
  // Flush pending block replies to preserve message boundaries before tool execution.
  ctx.flushBlockReplyBuffer();
  if (ctx.params.onBlockReplyFlush) {
    void ctx.params.onBlockReplyFlush();
  }
  const rawToolName = String(evt.toolName);
  const toolName = (0, _toolPolicy.normalizeToolName)(rawToolName);
  const toolCallId = String(evt.toolCallId);
  const args = evt.args;
  if (toolName === "read") {
    const record = args && typeof args === "object" ? args : {};
    const filePath = typeof record.path === "string" ? record.path.trim() : "";
    if (!filePath) {
      const argsPreview = typeof args === "string" ? args.slice(0, 200) : undefined;
      ctx.log.warn(`read tool called without path: toolCallId=${toolCallId} argsType=${typeof args}${argsPreview ? ` argsPreview=${argsPreview}` : ""}`);
    }
  }
  const meta = extendExecMeta(toolName, args, (0, _piEmbeddedUtils.inferToolMetaFromArgs)(toolName, args));
  ctx.state.toolMetaById.set(toolCallId, meta);
  ctx.log.debug(`embedded run tool start: runId=${ctx.params.runId} tool=${toolName} toolCallId=${toolCallId}`);
  const shouldEmitToolEvents = ctx.shouldEmitToolResult();
  (0, _agentEvents.emitAgentEvent)({
    runId: ctx.params.runId,
    stream: "tool",
    data: {
      phase: "start",
      name: toolName,
      toolCallId,
      args: args
    }
  });
  // Best-effort typing signal; do not block tool summaries on slow emitters.
  void ctx.params.onAgentEvent?.({
    stream: "tool",
    data: { phase: "start", name: toolName, toolCallId }
  });
  if (ctx.params.onToolResult &&
  shouldEmitToolEvents &&
  !ctx.state.toolSummaryById.has(toolCallId)) {
    ctx.state.toolSummaryById.add(toolCallId);
    ctx.emitToolSummary(toolName, meta);
  }
  // Track messaging tool sends (pending until confirmed in tool_execution_end).
  if ((0, _piEmbeddedMessaging.isMessagingTool)(toolName)) {
    const argsRecord = args && typeof args === "object" ? args : {};
    const isMessagingSend = (0, _piEmbeddedMessaging.isMessagingToolSendAction)(toolName, argsRecord);
    if (isMessagingSend) {
      const sendTarget = (0, _piEmbeddedSubscribeTools.extractMessagingToolSend)(toolName, argsRecord);
      if (sendTarget) {
        ctx.state.pendingMessagingTargets.set(toolCallId, sendTarget);
      }
      // Field names vary by tool: Discord/Slack use "content", sessions_send uses "message"
      const text = argsRecord.content ?? argsRecord.message;
      if (text && typeof text === "string") {
        ctx.state.pendingMessagingTexts.set(toolCallId, text);
        ctx.log.debug(`Tracking pending messaging text: tool=${toolName} len=${text.length}`);
      }
    }
  }
}
function handleToolExecutionUpdate(ctx, evt) {
  const toolName = (0, _toolPolicy.normalizeToolName)(String(evt.toolName));
  const toolCallId = String(evt.toolCallId);
  const partial = evt.partialResult;
  const sanitized = (0, _piEmbeddedSubscribeTools.sanitizeToolResult)(partial);
  (0, _agentEvents.emitAgentEvent)({
    runId: ctx.params.runId,
    stream: "tool",
    data: {
      phase: "update",
      name: toolName,
      toolCallId,
      partialResult: sanitized
    }
  });
  void ctx.params.onAgentEvent?.({
    stream: "tool",
    data: {
      phase: "update",
      name: toolName,
      toolCallId
    }
  });
}
function handleToolExecutionEnd(ctx, evt) {
  const toolName = (0, _toolPolicy.normalizeToolName)(String(evt.toolName));
  const toolCallId = String(evt.toolCallId);
  const isError = Boolean(evt.isError);
  const result = evt.result;
  const isToolError = isError || (0, _piEmbeddedSubscribeTools.isToolResultError)(result);
  const sanitizedResult = (0, _piEmbeddedSubscribeTools.sanitizeToolResult)(result);
  const meta = ctx.state.toolMetaById.get(toolCallId);
  ctx.state.toolMetas.push({ toolName, meta });
  ctx.state.toolMetaById.delete(toolCallId);
  ctx.state.toolSummaryById.delete(toolCallId);
  if (isToolError) {
    const errorMessage = (0, _piEmbeddedSubscribeTools.extractToolErrorMessage)(sanitizedResult);
    ctx.state.lastToolError = {
      toolName,
      meta,
      error: errorMessage
    };
  }
  // Commit messaging tool text on success, discard on error.
  const pendingText = ctx.state.pendingMessagingTexts.get(toolCallId);
  const pendingTarget = ctx.state.pendingMessagingTargets.get(toolCallId);
  if (pendingText) {
    ctx.state.pendingMessagingTexts.delete(toolCallId);
    if (!isToolError) {
      ctx.state.messagingToolSentTexts.push(pendingText);
      ctx.state.messagingToolSentTextsNormalized.push((0, _piEmbeddedHelpers.normalizeTextForComparison)(pendingText));
      ctx.log.debug(`Committed messaging text: tool=${toolName} len=${pendingText.length}`);
      ctx.trimMessagingToolSent();
    }
  }
  if (pendingTarget) {
    ctx.state.pendingMessagingTargets.delete(toolCallId);
    if (!isToolError) {
      ctx.state.messagingToolSentTargets.push(pendingTarget);
      ctx.trimMessagingToolSent();
    }
  }
  (0, _agentEvents.emitAgentEvent)({
    runId: ctx.params.runId,
    stream: "tool",
    data: {
      phase: "result",
      name: toolName,
      toolCallId,
      meta,
      isError: isToolError,
      result: sanitizedResult
    }
  });
  void ctx.params.onAgentEvent?.({
    stream: "tool",
    data: {
      phase: "result",
      name: toolName,
      toolCallId,
      meta,
      isError: isToolError
    }
  });
  ctx.log.debug(`embedded run tool end: runId=${ctx.params.runId} tool=${toolName} toolCallId=${toolCallId}`);
  if (ctx.params.onToolResult && ctx.shouldEmitToolOutput()) {
    const outputText = (0, _piEmbeddedSubscribeTools.extractToolResultText)(sanitizedResult);
    if (outputText) {
      ctx.emitToolOutput(toolName, meta, outputText);
    }
  }
} /* v9-e494b9d5d0c7c3bc */
