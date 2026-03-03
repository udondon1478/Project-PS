"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerSlackMonitorEvents = registerSlackMonitorEvents;var _channels = require("./events/channels.js");
var _members = require("./events/members.js");
var _messages = require("./events/messages.js");
var _pins = require("./events/pins.js");
var _reactions = require("./events/reactions.js");
function registerSlackMonitorEvents(params) {
  (0, _messages.registerSlackMessageEvents)({
    ctx: params.ctx,
    handleSlackMessage: params.handleSlackMessage
  });
  (0, _reactions.registerSlackReactionEvents)({ ctx: params.ctx });
  (0, _members.registerSlackMemberEvents)({ ctx: params.ctx });
  (0, _channels.registerSlackChannelEvents)({ ctx: params.ctx });
  (0, _pins.registerSlackPinEvents)({ ctx: params.ctx });
} /* v9-302b3ff7297ad111 */
