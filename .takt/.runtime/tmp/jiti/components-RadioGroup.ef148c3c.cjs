"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.RadioGroup = void 0;var _BaseModalComponent = require("../../abstracts/BaseModalComponent.js");
class RadioGroup extends _BaseModalComponent.BaseModalComponent {
  type = 21;
  /**
   * The options in the radio group
   */
  options = [];
  /**
   * Whether the radio group is required
   */
  required;
  /**
   * The minimum number of options that must be selected
   */
  minValues;
  /**
   * The maximum number of options that can be selected
   */
  maxValues;
  serialize = () => {
    const data = {
      type: this.type,
      custom_id: this.customId,
      options: this.options
    };
    if (this.id !== undefined)
    data.id = this.id;
    if (this.required !== undefined)
    data.required = this.required;
    return data;
  };
}exports.RadioGroup = RadioGroup; /* v9-13e9bd644982cd3f */
