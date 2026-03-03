"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.UserSelectMenuInteraction = void 0;var _v = require("discord-api-types/v10");
var _AnySelectMenuInteraction = require("../abstracts/AnySelectMenuInteraction.js");
class UserSelectMenuInteraction extends _AnySelectMenuInteraction.AnySelectMenuInteraction {
  constructor(client, data, defaults) {
    super(client, data, defaults);
    if (data.data.component_type !== _v.ComponentType.UserSelect) {
      throw new Error("Invalid component type was used to create this class");
    }
  }
  get values() {
    return this.rawData.data.values;
  }
}exports.UserSelectMenuInteraction = UserSelectMenuInteraction; /* v9-830e282d5609984c */
