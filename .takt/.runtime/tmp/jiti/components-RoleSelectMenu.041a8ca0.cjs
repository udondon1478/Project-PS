"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.RoleSelectMenu = void 0;var _v = require("discord-api-types/v10");
var _AnySelectMenu = require("../../abstracts/AnySelectMenu.js");
class RoleSelectMenu extends _AnySelectMenu.AnySelectMenu {
  type = _v.ComponentType.RoleSelect;
  isV2 = false;
  defaultValues;
  run(interaction, data) {
    // Random things to show the vars as used
    typeof interaction === "string";
    typeof data === "string";
    return;
  }
  serializeOptions() {
    return {
      type: this.type,
      default_values: this.defaultValues
    };
  }
}exports.RoleSelectMenu = RoleSelectMenu; /* v9-ec53f38fbc3ad017 */
