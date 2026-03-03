"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleAgentEnd = handleAgentEnd;exports.handleAgentStart = handleAgentStart;exports.handleAutoCompactionEnd = handleAutoCompactionEnd;exports.handleAutoCompactionStart = handleAutoCompactionStart;var _agentEvents = require("../infra/agent-events.js");
var _codeSpans = require("../markdown/code-spans.js");
function handleAgentStart(ctx) {
  ctx.log.debug(`embedded run agent start: runId=${ctx.params.runId}`);
  (0, _agentEvents.emitAgentEvent)({
    runId: ctx.params.runId,
    stream: "lifecycle",
    data: {
      phase: "start",
      startedAt: Date.now()
    }
  });
  void ctx.params.onAgentEvent?.({
    stream: "lifecycle",
    data: { phase: "start" }
  });
}
function handleAutoCompactionStart(ctx) {
  ctx.state.compactionInFlight = true;
  ctx.ensureCompactionPromise();
  ctx.log.debug(`embedded run compaction start: runId=${ctx.params.runId}`);
  (0, _agentEvents.emitAgentEvent)({
    runId: ctx.params.runId,
    stream: "compaction",
    data: { phase: "start" }
  });
  void ctx.params.onAgentEvent?.({
    stream: "compaction",
    data: { phase: "start" }
  });
}
function handleAutoCompactionEnd(ctx, evt) {
  ctx.state.compactionInFlight = false;
  const willRetry = Boolean(evt.willRetry);
  if (willRetry) {
    ctx.noteCompactionRetry();
    ctx.resetForCompactionRetry();
    ctx.log.debug(`embedded run compaction retry: runId=${ctx.params.runId}`);
  } else
  {
    ctx.maybeResolveCompactionWait();
  }
  (0, _agentEvents.emitAgentEvent)({
    runId: ctx.params.runId,
    stream: "compaction",
    data: { phase: "end", willRetry }
  });
  void ctx.params.onAgentEvent?.({
    stream: "compaction",
    data: { phase: "end", willRetry }
  });
}
function handleAgentEnd(ctx) {
  ctx.log.debug(`embedded run agent end: runId=${ctx.params.runId}`);
  (0, _agentEvents.emitAgentEvent)({
    runId: ctx.params.runId,
    stream: "lifecycle",
    data: {
      phase: "end",
      endedAt: Date.now()
    }
  });
  void ctx.params.onAgentEvent?.({
    stream: "lifecycle",
    data: { phase: "end" }
  });
  if (ctx.params.onBlockReply) {
    if (ctx.blockChunker?.hasBuffered()) {
      ctx.blockChunker.drain({ force: true, emit: ctx.emitBlockChunk });
      ctx.blockChunker.reset();
    } else
    if (ctx.state.blockBuffer.length > 0) {
      ctx.emitBlockChunk(ctx.state.blockBuffer);
      ctx.state.blockBuffer = "";
    }
  }
  ctx.state.blockState.thinking = false;
  ctx.state.blockState.final = false;
  ctx.state.blockState.inlineCode = (0, _codeSpans.createInlineCodeState)();
  if (ctx.state.pendingCompactionRetry > 0) {
    ctx.resolveCompactionRetry();
  } else
  {
    ctx.maybeResolveCompactionWait();
  }
} /* v9-919772191fcd0204 */
