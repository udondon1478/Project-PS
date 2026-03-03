"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Row = void 0;var _v = require("discord-api-types/v10");
var _BaseComponent = require("../../abstracts/BaseComponent.js");
class Row extends _BaseComponent.BaseComponent {
  type = _v.ComponentType.ActionRow;
  isV2 = false;
  /**
   * The components in the action row
   */
  components = [];
  constructor(components = []) {
    super();
    this.components = components;
  }
  /**
   * Add a component to the action row
   * @param component The component to add
   */
  addComponent(component) {
    this.components.push(component);
  }
  /**
   * Remove a component from the action row
   * @param component The component to remove
   */
  removeComponent(component) {
    const index = this.components.indexOf(component);
    if (index === -1)
    return;
    this.components.splice(index, 1);
  }
  /**
   * Remove all components from the action row
   */
  removeAllComponents() {
    this.components = [];
  }
  serialize = () => {
    return {
      type: _v.ComponentType.ActionRow,
      components: this.components.map((component) => component.serialize())
    };
  };
}exports.Row = Row; /* v9-003fdc8acb0c5b2c */
