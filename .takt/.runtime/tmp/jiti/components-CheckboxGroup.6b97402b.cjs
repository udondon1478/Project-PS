"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.CheckboxGroup = void 0;var _BaseModalComponent = require("../../abstracts/BaseModalComponent.js");
class CheckboxGroup extends _BaseModalComponent.BaseModalComponent {
  type = 22;
  /**
   * The options in the checkbox group
   */
  options = [];
  /**
   * Whether the checkbox group is required
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
    if (this.minValues !== undefined)
    data.min_values = this.minValues;
    if (this.maxValues !== undefined)
    data.max_values = this.maxValues;
    if (this.required !== undefined)
    data.required = this.required;
    return data;
  };
}exports.CheckboxGroup = CheckboxGroup; /* v9-ceb929399f4a9734 */
