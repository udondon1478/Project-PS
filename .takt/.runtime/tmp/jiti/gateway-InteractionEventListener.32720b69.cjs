"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.InteractionEventListener = void 0;var _Listener = require("../../classes/Listener.js");
var _listeners = require("../../types/listeners.js");
class InteractionEventListener extends _Listener.InteractionCreateListener {
  type = _listeners.ListenerEvent.InteractionCreate;
  async handle(data, client) {
    await client.handleInteraction(data, {});
  }
}exports.InteractionEventListener = InteractionEventListener; /* v9-eff4ae48939dc418 */
