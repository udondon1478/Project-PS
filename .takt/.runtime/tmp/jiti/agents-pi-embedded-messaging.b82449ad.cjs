"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isMessagingTool = isMessagingTool;exports.isMessagingToolSendAction = isMessagingToolSendAction;var _index = require("../channels/plugins/index.js");
const CORE_MESSAGING_TOOLS = new Set(["sessions_send", "message"]);
// Provider docking: any plugin with `actions` opts into messaging tool handling.
function isMessagingTool(toolName) {
  if (CORE_MESSAGING_TOOLS.has(toolName)) {
    return true;
  }
  const providerId = (0, _index.normalizeChannelId)(toolName);
  return Boolean(providerId && (0, _index.getChannelPlugin)(providerId)?.actions);
}
function isMessagingToolSendAction(toolName, args) {
  const action = typeof args.action === "string" ? args.action.trim() : "";
  if (toolName === "sessions_send") {
    return true;
  }
  if (toolName === "message") {
    return action === "send" || action === "thread-reply";
  }
  const providerId = (0, _index.normalizeChannelId)(toolName);
  if (!providerId) {
    return false;
  }
  const plugin = (0, _index.getChannelPlugin)(providerId);
  if (!plugin?.actions?.extractToolSend) {
    return false;
  }
  return Boolean(plugin.actions.extractToolSend({ args })?.to);
} /* v9-871f8ab5c31807bd */
