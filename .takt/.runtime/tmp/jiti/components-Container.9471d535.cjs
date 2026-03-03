"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Container = void 0;var _v = require("discord-api-types/v10");
var _BaseComponent = require("../../abstracts/BaseComponent.js");
class Container extends _BaseComponent.BaseComponent {
  type = _v.ComponentType.Container;
  isV2 = true;
  components = [];
  /**
   * The accent color of the container
   */
  accentColor;
  /**
   * Whether the container should be marked a spoiler
   */
  spoiler = false;
  constructor(components = [], options = {}) {
    super();
    this.components = components;
    if (options.accentColor) {
      this.accentColor = options.accentColor;
    }
    if (options.spoiler) {
      this.spoiler = options.spoiler;
    }
  }
  serialize = () => {
    return {
      type: this.type,
      components: this.components.map((component) => component.serialize()),
      accent_color: this.accentColor ?
      typeof this.accentColor === "string" ?
      Number.parseInt(this.accentColor.slice(1), 16) :
      this.accentColor :
      undefined,
      spoiler: this.spoiler
    };
  };
}exports.Container = Container; /* v9-fec457eb0346da58 */
