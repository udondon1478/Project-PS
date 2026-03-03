"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.CommandWithSubcommands = void 0;var _v = require("discord-api-types/v10");
var _BaseCommand = require("../abstracts/BaseCommand.js");
/**
 * Represents a subcommand command that the user creates.
 * You make this instead of a {@link Command} class when you want to have subcommands in your options.
 */
class CommandWithSubcommands extends _BaseCommand.BaseCommand {
  type = _v.ApplicationCommandType.ChatInput;
  /**
   * @internal
   */
  serializeOptions() {
    return this.subcommands.map((subcommand) => ({
      ...subcommand.serialize(),
      type: _v.ApplicationCommandOptionType.Subcommand
    }));
  }
}exports.CommandWithSubcommands = CommandWithSubcommands; /* v9-c3ed514d51c6b1da */
