"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.applyLinkUnderstanding = applyLinkUnderstanding;var _inboundContext = require("../auto-reply/reply/inbound-context.js");
var _format = require("./format.js");
var _runner = require("./runner.js");
async function applyLinkUnderstanding(params) {
  const result = await (0, _runner.runLinkUnderstanding)({
    cfg: params.cfg,
    ctx: params.ctx
  });
  if (result.outputs.length === 0) {
    return result;
  }
  params.ctx.LinkUnderstanding = [...(params.ctx.LinkUnderstanding ?? []), ...result.outputs];
  params.ctx.Body = (0, _format.formatLinkUnderstandingBody)({
    body: params.ctx.Body,
    outputs: result.outputs
  });
  (0, _inboundContext.finalizeInboundContext)(params.ctx, {
    forceBodyForAgent: true,
    forceBodyForCommands: true
  });
  return result;
} /* v9-bb2d959a3a862172 */
