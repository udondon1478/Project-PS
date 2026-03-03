"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Label = void 0;var _v = require("discord-api-types/v10");
var _BaseModalComponent = require("../../abstracts/BaseModalComponent.js");
class Label extends _BaseModalComponent.BaseModalComponent {
  type = _v.ComponentType.Label;
  /**
   * The description of the label (optional)
   */
  description;
  /**
   * The component within this label
   */
  component;
  /**
   * The custom ID of the label - required by BaseModalComponent
   */
  customId = "label";
  constructor(component) {
    super();
    if (component) {
      this.component = component;
    }
  }
  serialize = () => {
    if (!this.component) {
      throw new Error("Label must have a component, either assign it ahead of time or pass it to the constructor");
    }
    return {
      type: this.type,
      label: this.label,
      description: this.description,
      component: this.component.serialize()
    };
  };
}exports.Label = Label; /* v9-06f0f05b565c6a2d */
