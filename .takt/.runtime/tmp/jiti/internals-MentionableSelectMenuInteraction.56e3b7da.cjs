"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.MentionableSelectMenuInteraction = void 0;var _v = require("discord-api-types/v10");
var _AnySelectMenuInteraction = require("../abstracts/AnySelectMenuInteraction.js");
class MentionableSelectMenuInteraction extends _AnySelectMenuInteraction.AnySelectMenuInteraction {
  constructor(client, data, defaults) {
    super(client, data, defaults);
    if (data.data.component_type !== _v.ComponentType.MentionableSelect) {
      throw new Error("Invalid component type was used to create this class");
    }
  }
  get values() {
    return this.rawData.data.
    values;
  }
}exports.MentionableSelectMenuInteraction = MentionableSelectMenuInteraction; /* v9-79ba190e5867c74c */
