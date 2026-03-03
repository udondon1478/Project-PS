"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.FileUpload = void 0;var _v = require("discord-api-types/v10");
var _BaseModalComponent = require("../../abstracts/BaseModalComponent.js");
class FileUpload extends _BaseModalComponent.BaseModalComponent {
  type = _v.ComponentType.FileUpload;
  /**
   * The minimum number of files that must be uploaded
   * Defaults to 1, minimum is 0, maximum is 10
   */
  minValues;
  /**
   * The maximum number of files that can be uploaded
   * Defaults to 1, maximum is 10
   */
  maxValues;
  /**
   * Whether the component is required
   * Defaults to true
   */
  required;
  serialize = () => {
    const data = {
      type: this.type,
      custom_id: this.customId
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
}exports.FileUpload = FileUpload; /* v9-73fb653109bc014b */
