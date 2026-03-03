"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Checkbox = void 0;var _BaseModalComponent = require("../../abstracts/BaseModalComponent.js");
class Checkbox extends _BaseModalComponent.BaseModalComponent {
  type = 23;
  /**
   * Whether the checkbox is checked by default
   */
  default;
  serialize = () => {
    const data = {
      type: this.type,
      custom_id: this.customId
    };
    if (this.id !== undefined)
    data.id = this.id;
    if (this.default !== undefined)
    data.default = this.default;
    return data;
  };
}exports.Checkbox = Checkbox; /* v9-034576a24d93560d */
