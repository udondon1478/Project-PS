"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_GATEWAY_URL = void 0;exports.callGatewayTool = callGatewayTool;exports.resolveGatewayOptions = resolveGatewayOptions;var _call = require("../../gateway/call.js");
var _messageChannel = require("../../utils/message-channel.js");
const DEFAULT_GATEWAY_URL = exports.DEFAULT_GATEWAY_URL = "ws://127.0.0.1:18789";
function resolveGatewayOptions(opts) {
  // Prefer an explicit override; otherwise let callGateway choose based on config.
  const url = typeof opts?.gatewayUrl === "string" && opts.gatewayUrl.trim() ?
  opts.gatewayUrl.trim() :
  undefined;
  const token = typeof opts?.gatewayToken === "string" && opts.gatewayToken.trim() ?
  opts.gatewayToken.trim() :
  undefined;
  const timeoutMs = typeof opts?.timeoutMs === "number" && Number.isFinite(opts.timeoutMs) ?
  Math.max(1, Math.floor(opts.timeoutMs)) :
  10_000;
  return { url, token, timeoutMs };
}
async function callGatewayTool(method, opts, params, extra) {
  const gateway = resolveGatewayOptions(opts);
  return await (0, _call.callGateway)({
    url: gateway.url,
    token: gateway.token,
    method,
    params,
    timeoutMs: gateway.timeoutMs,
    expectFinal: extra?.expectFinal,
    clientName: _messageChannel.GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT,
    clientDisplayName: "agent",
    mode: _messageChannel.GATEWAY_CLIENT_MODES.BACKEND
  });
} /* v9-9f355f48396acab2 */
