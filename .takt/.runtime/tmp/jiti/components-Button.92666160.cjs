"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.PremiumButton = exports.LinkButton = exports.Button = void 0;var _v = require("discord-api-types/v10");
var _BaseMessageInteractiveComponent = require("../../abstracts/BaseMessageInteractiveComponent.js");
class BaseButton extends _BaseMessageInteractiveComponent.BaseMessageInteractiveComponent {
  type = _v.ComponentType.Button;
  isV2 = false;
  /**
   * The emoji of the button
   */
  emoji;
  /**
   * The style of the button
   */
  style = _v.ButtonStyle.Primary;
  /**
   * The disabled state of the button
   */
  disabled = false;
}
class Button extends BaseButton {
  run(interaction, data) {
    // Random things to show the vars as used
    typeof interaction === "string";
    typeof data === "string";
    return;
  }
  serialize = () => {
    if (this.style === _v.ButtonStyle.Link) {
      throw new Error("Link buttons cannot be serialized. Are you using the right class?");
    }
    if (this.style === _v.ButtonStyle.Premium) {
      throw new Error("Premium buttons cannot be serialized. Are you using the right class?");
    }
    return {
      type: _v.ComponentType.Button,
      style: this.style,
      label: this.label,
      custom_id: this.customId,
      disabled: this.disabled,
      emoji: this.emoji
    };
  };
}exports.Button = Button;
class LinkButton extends BaseButton {
  customId = "link";
  style = _v.ButtonStyle.Link;
  run = async () => {
    throw new Error("Link buttons cannot be used in a run method");
  };
  serialize = () => {
    return {
      type: _v.ComponentType.Button,
      url: this.url,
      style: this.style,
      label: this.label,
      disabled: this.disabled,
      emoji: this.emoji
    };
  };
}exports.LinkButton = LinkButton;
class PremiumButton extends BaseButton {
  style = _v.ButtonStyle.Premium;
  serialize = () => {
    return {
      style: this.style,
      type: _v.ComponentType.Button,
      disabled: this.disabled,
      sku_id: this.sku_id
    };
  };
}exports.PremiumButton = PremiumButton; /* v9-a747849673642545 */
