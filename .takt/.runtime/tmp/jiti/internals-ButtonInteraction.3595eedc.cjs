"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ButtonInteraction = void 0;var _v = require("discord-api-types/v10");
var _BaseComponentInteraction = require("../abstracts/BaseComponentInteraction.js");
class ButtonInteraction extends _BaseComponentInteraction.BaseComponentInteraction {
  constructor(client, data, defaults) {
    super(client, data, defaults);
    if (!data.data)
    throw new Error("Invalid interaction data was used to create this class");
    if (data.type !== _v.InteractionType.MessageComponent) {
      throw new Error("Invalid interaction type was used to create this class");
    }
    if (data.data.component_type !== _v.ComponentType.Button) {
      throw new Error("Invalid component type was used to create this class");
    }
  }
}exports.ButtonInteraction = ButtonInteraction; /* v9-d2d0ffa95b34da84 */
