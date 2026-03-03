"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.AnySelectMenuInteraction = void 0;var _v = require("discord-api-types/v10");
var _BaseComponentInteraction = require("./BaseComponentInteraction.js");
class AnySelectMenuInteraction extends _BaseComponentInteraction.BaseComponentInteraction {
  constructor(client, data, defaults) {
    super(client, data, defaults);
    if (!data.data)
    throw new Error("Invalid interaction data was used to create this class");
    if (data.type !== _v.InteractionType.MessageComponent) {
      throw new Error("Invalid interaction type was used to create this class");
    }
  }
  /**
   * The raw IDs of the selected options (either role/string/channel IDs or the IDs you provided in your options)
   */
  get values() {
    return this.rawData.data.values;
  }
}exports.AnySelectMenuInteraction = AnySelectMenuInteraction; /* v9-6b71528f758c9c64 */
