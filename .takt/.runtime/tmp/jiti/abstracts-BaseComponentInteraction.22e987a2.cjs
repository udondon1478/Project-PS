"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.BaseComponentInteraction = void 0;var _v = require("discord-api-types/v10");
var _index = require("../utils/index.js");
var _BaseInteraction = require("./BaseInteraction.js");
class BaseComponentInteraction extends _BaseInteraction.BaseInteraction {
  componentType;
  constructor(client, data, defaults) {
    super(client, data, defaults);
    if (!data.data)
    throw new Error("Invalid interaction data was used to create this class");
    this.componentType = data.data.component_type;
  }
  /**
   * Acknowledge the interaction, the user does not see a loading state.
   * This can only be used for component interactions
   */
  async acknowledge() {
    await this.client.rest.post(_v.Routes.interactionCallback(this.rawData.id, this.rawData.token), {
      body: {
        type: _v.InteractionResponseType.DeferredMessageUpdate
      }
    });
    this._deferred = true;
  }
  /**
   * Update the original message of the component
   */
  async update(data) {
    const serialized = (0, _index.serializePayload)(data);
    // Auto-register any components in the message
    this._internalAutoRegisterComponentsOnSend(data);
    await this.client.rest.post(_v.Routes.interactionCallback(this.rawData.id, this.rawData.token), {
      body: {
        type: _v.InteractionResponseType.UpdateMessage,
        data: {
          ...serialized
        }
      }
    });
  }
}exports.BaseComponentInteraction = BaseComponentInteraction; /* v9-816d940e3d8aee5c */
