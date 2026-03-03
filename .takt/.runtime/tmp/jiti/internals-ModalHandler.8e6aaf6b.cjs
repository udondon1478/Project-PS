"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ModalHandler = void 0;var _Base = require("../abstracts/Base.js");
var _ModalInteraction = require("./ModalInteraction.js");
class ModalHandler extends _Base.Base {
  modals = [];
  /**
   * Register a modal with the handler
   * @internal
   */
  registerModal(modal) {
    if (!this.modals.find((x) => x.customId === modal.customId)) {
      this.modals.push(modal);
    }
  }
  /**
   * Handle an interaction
   * @internal
   */
  async handleInteraction(data) {
    let modal = this.modals.find((x) => {
      const modalKey = x.customIdParser(x.customId).key;
      const interactionKey = x.customIdParser(data.data.custom_id).key;
      return modalKey === interactionKey;
    });
    if (!modal) {
      modal = this.modals.find((x) => {
        const modalKey = x.customIdParser(x.customId).key;
        return modalKey === "*";
      });
    }
    if (!modal)
    return false;
    return await modal.run(new _ModalInteraction.ModalInteraction(this.client, data, {}), modal.customIdParser(data.data.custom_id).data);
  }
}exports.ModalHandler = ModalHandler; /* v9-bcced5d86df4c961 */
