"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.dispatchChannelMessageAction = dispatchChannelMessageAction;exports.listChannelMessageActions = listChannelMessageActions;exports.supportsChannelMessageButtons = supportsChannelMessageButtons;exports.supportsChannelMessageCards = supportsChannelMessageCards;var _index = require("./index.js");
function listChannelMessageActions(cfg) {
  const actions = new Set(["send", "broadcast"]);
  for (const plugin of (0, _index.listChannelPlugins)()) {
    const list = plugin.actions?.listActions?.({ cfg });
    if (!list) {
      continue;
    }
    for (const action of list) {
      actions.add(action);
    }
  }
  return Array.from(actions);
}
function supportsChannelMessageButtons(cfg) {
  for (const plugin of (0, _index.listChannelPlugins)()) {
    if (plugin.actions?.supportsButtons?.({ cfg })) {
      return true;
    }
  }
  return false;
}
function supportsChannelMessageCards(cfg) {
  for (const plugin of (0, _index.listChannelPlugins)()) {
    if (plugin.actions?.supportsCards?.({ cfg })) {
      return true;
    }
  }
  return false;
}
async function dispatchChannelMessageAction(ctx) {
  const plugin = (0, _index.getChannelPlugin)(ctx.channel);
  if (!plugin?.actions?.handleAction) {
    return null;
  }
  if (plugin.actions.supportsAction && !plugin.actions.supportsAction({ action: ctx.action })) {
    return null;
  }
  return await plugin.actions.handleAction(ctx);
} /* v9-c3cede54c0ed4f62 */
