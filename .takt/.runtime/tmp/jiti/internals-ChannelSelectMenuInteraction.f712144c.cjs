"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ChannelSelectMenuInteraction = void 0;var _v = require("discord-api-types/v10");
var _AnySelectMenuInteraction = require("../abstracts/AnySelectMenuInteraction.js");
class ChannelSelectMenuInteraction extends _AnySelectMenuInteraction.AnySelectMenuInteraction {
  constructor(client, data, defaults) {
    super(client, data, defaults);
    if (data.data.component_type !== _v.ComponentType.ChannelSelect) {
      throw new Error("Invalid component type was used to create this class");
    }
  }
}exports.ChannelSelectMenuInteraction = ChannelSelectMenuInteraction; /* v9-add2cd25a0352ffa */
