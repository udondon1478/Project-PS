"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createEmbeddedPiSessionEventHandler = createEmbeddedPiSessionEventHandler;var _piEmbeddedSubscribeHandlersLifecycle = require("./pi-embedded-subscribe.handlers.lifecycle.js");
var _piEmbeddedSubscribeHandlersMessages = require("./pi-embedded-subscribe.handlers.messages.js");
var _piEmbeddedSubscribeHandlersTools = require("./pi-embedded-subscribe.handlers.tools.js");
function createEmbeddedPiSessionEventHandler(ctx) {
  return (evt) => {
    switch (evt.type) {
      case "message_start":
        (0, _piEmbeddedSubscribeHandlersMessages.handleMessageStart)(ctx, evt);
        return;
      case "message_update":
        (0, _piEmbeddedSubscribeHandlersMessages.handleMessageUpdate)(ctx, evt);
        return;
      case "message_end":
        (0, _piEmbeddedSubscribeHandlersMessages.handleMessageEnd)(ctx, evt);
        return;
      case "tool_execution_start":
        // Async handler - best-effort typing indicator, avoids blocking tool summaries.
        // Catch rejections to avoid unhandled promise rejection crashes.
        (0, _piEmbeddedSubscribeHandlersTools.handleToolExecutionStart)(ctx, evt).catch((err) => {
          ctx.log.debug(`tool_execution_start handler failed: ${String(err)}`);
        });
        return;
      case "tool_execution_update":
        (0, _piEmbeddedSubscribeHandlersTools.handleToolExecutionUpdate)(ctx, evt);
        return;
      case "tool_execution_end":
        (0, _piEmbeddedSubscribeHandlersTools.handleToolExecutionEnd)(ctx, evt);
        return;
      case "agent_start":
        (0, _piEmbeddedSubscribeHandlersLifecycle.handleAgentStart)(ctx);
        return;
      case "auto_compaction_start":
        (0, _piEmbeddedSubscribeHandlersLifecycle.handleAutoCompactionStart)(ctx);
        return;
      case "auto_compaction_end":
        (0, _piEmbeddedSubscribeHandlersLifecycle.handleAutoCompactionEnd)(ctx, evt);
        return;
      case "agent_end":
        (0, _piEmbeddedSubscribeHandlersLifecycle.handleAgentEnd)(ctx);
        return;
      default:
        return;
    }
  };
} /* v9-9ce1aff604382bfc */
