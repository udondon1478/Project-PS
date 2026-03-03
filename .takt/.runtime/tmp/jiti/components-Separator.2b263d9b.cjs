"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Separator = void 0;var _v = require("discord-api-types/v10");
var _BaseComponent = require("../../abstracts/BaseComponent.js");
class Separator extends _BaseComponent.BaseComponent {
  type = _v.ComponentType.Separator;
  isV2 = true;
  /**
   * Whether a visual divider should be displayed in the component
   */
  divider = true;
  /**
   * The size of the separator's padding
   * Either "small" or "large"
   * @default "small"
   */
  spacing = "small"; // integers here because its technically that on the API
  constructor(options = {}) {
    super();
    this.spacing = options.spacing ?? "small";
    this.divider = options.divider ?? true;
  }
  serialize = () => {
    return {
      type: this.type,
      divider: this.divider,
      spacing: typeof this.spacing === "number" ?
      this.spacing :
      this.spacing === "small" ?
      _v.SeparatorSpacingSize.Small :
      _v.SeparatorSpacingSize.Large
    };
  };
}exports.Separator = Separator; /* v9-e0e7508959d854d1 */
