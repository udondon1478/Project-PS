"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ModalInteraction = void 0;var _v = require("discord-api-types/v10");
var _BaseInteraction = require("../abstracts/BaseInteraction.js");
var _index = require("../utils/index.js");
var _FieldsHandler = require("./FieldsHandler.js");
class ModalInteraction extends _BaseInteraction.BaseInteraction {
  customId;
  fields;
  constructor(client, data, defaults) {
    super(client, data, defaults);
    this.customId = data.data.custom_id;
    this.fields = new _FieldsHandler.FieldsHandler(client, data);
  }
  /**
   * Acknowledge the interaction, the user does not see a loading state.
   * This can only be used for modals triggered from components
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
   * Update the original message of the component.
   * This can only be used for modals triggered from components
   */
  async update(data) {
    const serialized = (0, _index.serializePayload)(data);
    await this.client.rest.post(_v.Routes.interactionCallback(this.rawData.id, this.rawData.token), {
      body: {
        type: _v.InteractionResponseType.UpdateMessage,
        data: {
          ...serialized
        }
      }
    });
  }
}exports.ModalInteraction = ModalInteraction; /* v9-3819832d976d2740 */
