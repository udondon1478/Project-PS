"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.TextDisplay = void 0;var _v = require("discord-api-types/v10");
var _BaseComponent = require("../../abstracts/BaseComponent.js");
class TextDisplay extends _BaseComponent.BaseComponent {
  type = _v.ComponentType.TextDisplay;
  isV2 = true;
  content;
  constructor(content) {
    super();
    this.content = content;
  }
  serialize = () => {
    if (!this.content) {
      throw new Error("TextDisplay must have content");
    }
    return {
      type: this.type,
      id: this.id,
      content: this.content
    };
  };
}exports.TextDisplay = TextDisplay; /* v9-48cdac4e3625a4fe */
