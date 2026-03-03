"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.StringSelectMenuInteraction = void 0;var _v = require("discord-api-types/v10");
var _AnySelectMenuInteraction = require("../abstracts/AnySelectMenuInteraction.js");
class StringSelectMenuInteraction extends _AnySelectMenuInteraction.AnySelectMenuInteraction {
  constructor(client, data, defaults) {
    super(client, data, defaults);
    if (data.data.component_type !== _v.ComponentType.StringSelect) {
      throw new Error("Invalid component type was used to create this class");
    }
  }
  get values() {
    return this.rawData.data.values;
  }
}exports.StringSelectMenuInteraction = StringSelectMenuInteraction; /* v9-4798d3d6ff119d30 */
