"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.AutocompleteOptionsHandler = exports.AutocompleteInteraction = void 0;var _v = require("discord-api-types/v10");
var _BaseInteraction = require("../abstracts/BaseInteraction.js");
var _OptionsHandler = require("./OptionsHandler.js");
class AutocompleteInteraction extends _BaseInteraction.BaseInteraction {
  /**
   * This is the options of the commands, parsed from the interaction data.
   */
  options;
  constructor({ client, data, defaults, processingCommand }) {
    super(client, data, defaults);
    if (data.type !== _v.InteractionType.ApplicationCommandAutocomplete) {
      throw new Error("Invalid interaction type was used to create this class");
    }
    if (data.data.type !== _v.ApplicationCommandType.ChatInput) {
      throw new Error("Invalid command type was used to create this class");
    }
    this.options = new AutocompleteOptionsHandler({
      client,
      options: data.data.options ?? [],
      interactionData: data.data,
      definitions: processingCommand?.options ?? []
    });
  }
  async defer() {
    throw new Error("Defer is not available for autocomplete interactions");
  }
  async reply() {
    throw new Error("Reply is not available for autocomplete interactions");
  }
  /**
   * Respond with the choices for an autocomplete interaction
   */
  async respond(choices) {
    let safeChoices = choices;
    if (choices.length > 25) {
      console.warn(`[Carbon] Autocomplete only supports up to 25 choices. Received ${choices.length}. Only the first 25 will be sent.`);
      safeChoices = choices.slice(0, 25);
    }
    await this.client.rest.post(_v.Routes.interactionCallback(this.rawData.id, this.rawData.token), {
      body: {
        type: _v.InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: {
          choices: safeChoices
        }
      }
    });
  }
}exports.AutocompleteInteraction = AutocompleteInteraction;
class AutocompleteOptionsHandler extends _OptionsHandler.OptionsHandler {
  /**
   * Get the focused option (the one that is being autocompleted)
   */
  getFocused() {
    const focused = this.raw.find((x) => "focused" in x && x.focused);
    if (!focused)
    return null;
    const value = focused.type === _v.ApplicationCommandOptionType.String ?
    this.getString(focused.name) :
    focused.type === _v.ApplicationCommandOptionType.Integer ?
    this.getInteger(focused.name) :
    focused.type === _v.ApplicationCommandOptionType.Number ?
    this.getNumber(focused.name) :
    focused.type === _v.ApplicationCommandOptionType.Boolean ?
    this.getBoolean(focused.name) :
    null;
    return {
      name: focused.name,
      type: focused.type,
      value: value
    };
  }
}exports.AutocompleteOptionsHandler = AutocompleteOptionsHandler; /* v9-c43667facf8b5c22 */
