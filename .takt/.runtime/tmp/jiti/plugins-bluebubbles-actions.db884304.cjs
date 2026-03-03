"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.BLUEBUBBLES_GROUP_ACTIONS = exports.BLUEBUBBLES_ACTION_NAMES = exports.BLUEBUBBLES_ACTIONS = void 0;const BLUEBUBBLES_ACTIONS = exports.BLUEBUBBLES_ACTIONS = {
  react: { gate: "reactions" },
  edit: { gate: "edit", unsupportedOnMacOS26: true },
  unsend: { gate: "unsend" },
  reply: { gate: "reply" },
  sendWithEffect: { gate: "sendWithEffect" },
  renameGroup: { gate: "renameGroup", groupOnly: true },
  setGroupIcon: { gate: "setGroupIcon", groupOnly: true },
  addParticipant: { gate: "addParticipant", groupOnly: true },
  removeParticipant: { gate: "removeParticipant", groupOnly: true },
  leaveGroup: { gate: "leaveGroup", groupOnly: true },
  sendAttachment: { gate: "sendAttachment" }
};
const BLUEBUBBLES_ACTION_SPECS = BLUEBUBBLES_ACTIONS;
const BLUEBUBBLES_ACTION_NAMES = exports.BLUEBUBBLES_ACTION_NAMES = Object.keys(BLUEBUBBLES_ACTIONS);
const BLUEBUBBLES_GROUP_ACTIONS = exports.BLUEBUBBLES_GROUP_ACTIONS = new Set(BLUEBUBBLES_ACTION_NAMES.filter((action) => BLUEBUBBLES_ACTION_SPECS[action]?.groupOnly)); /* v9-67113bb920ef1df2 */
