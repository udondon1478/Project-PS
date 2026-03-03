"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.CommandWithSubcommandGroups = void 0;var _v = require("discord-api-types/v10");
var _CommandWithSubcommands = require("./CommandWithSubcommands.js");
/**
 * Represents a subcommand group command that the user creates.
 * You make this instead of a {@link Command} class when you want to have subcommand groups in your options.
 */
class CommandWithSubcommandGroups extends _CommandWithSubcommands.CommandWithSubcommands {
  /**
   * The subcommands that the user can use
   */
  subcommands = [];
  /**
   * @internal
   */
  serializeOptions() {
    const subcommands = this.subcommands.map((subcommand) => ({
      ...subcommand.serialize(),
      type: _v.ApplicationCommandOptionType.Subcommand
    }));
    const subcommandGroups = this.subcommandGroups.map((subcommandGroup) => ({
      ...subcommandGroup.serialize(),
      type: _v.ApplicationCommandOptionType.SubcommandGroup
    }));
    return [...subcommands, ...subcommandGroups];
  }
}exports.CommandWithSubcommandGroups = CommandWithSubcommandGroups; /* v9-8b938267cae5749f */
