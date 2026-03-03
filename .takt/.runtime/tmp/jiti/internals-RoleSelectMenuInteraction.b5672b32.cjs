"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.RoleSelectMenuInteraction = void 0;var _v = require("discord-api-types/v10");
var _AnySelectMenuInteraction = require("../abstracts/AnySelectMenuInteraction.js");
class RoleSelectMenuInteraction extends _AnySelectMenuInteraction.AnySelectMenuInteraction {
  constructor(client, data, defaults) {
    super(client, data, defaults);
    if (data.data.component_type !== _v.ComponentType.RoleSelect) {
      throw new Error("Invalid component type was used to create this class");
    }
  }
  get values() {
    return this.rawData.data.values;
  }
}exports.RoleSelectMenuInteraction = RoleSelectMenuInteraction; /* v9-ec34ce659ee4ceba */
