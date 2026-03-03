"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.StringSelectMenu = void 0;var _v = require("discord-api-types/v10");
var _AnySelectMenu = require("../../abstracts/AnySelectMenu.js");
class StringSelectMenu extends _AnySelectMenu.AnySelectMenu {
  type = _v.ComponentType.StringSelect;
  isV2 = false;
  run(interaction, data) {
    // Random things to show the vars as used
    typeof interaction === "string";
    typeof data === "string";
    return;
  }
  serializeOptions() {
    return {
      type: this.type,
      options: this.options
    };
  }
}exports.StringSelectMenu = StringSelectMenu; /* v9-88d0de972cc9f133 */
