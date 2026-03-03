"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ChannelSelectMenu = void 0;var _v = require("discord-api-types/v10");
var _AnySelectMenu = require("../../abstracts/AnySelectMenu.js");
class ChannelSelectMenu extends _AnySelectMenu.AnySelectMenu {
  type = _v.ComponentType.ChannelSelect;
  isV2 = false;
  channelTypes;
  defaultValues;
  run(interaction, data) {
    // Random things to show the vars as used
    typeof interaction === "string";
    typeof data === "string";
    return;
  }
  serializeOptions() {
    return {
      type: this.type,
      default_values: this.defaultValues,
      channel_types: this.channelTypes
    };
  }
}exports.ChannelSelectMenu = ChannelSelectMenu; /* v9-8adf0cdc08ad66b3 */
