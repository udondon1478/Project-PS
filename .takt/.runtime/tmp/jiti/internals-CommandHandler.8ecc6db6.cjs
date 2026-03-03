"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.CommandHandler = void 0;var _v = require("discord-api-types/v10");
var _Base = require("../abstracts/Base.js");
var _Command = require("../classes/Command.js");
var _CommandWithSubcommandGroups = require("../classes/CommandWithSubcommandGroups.js");
var _CommandWithSubcommands = require("../classes/CommandWithSubcommands.js");
var _AutocompleteInteraction = require("./AutocompleteInteraction.js");
var _CommandInteraction = require("./CommandInteraction.js");
class CommandHandler extends _Base.Base {
  getSubcommand(command, rawInteraction) {
    if (rawInteraction.data.type !== _v.ApplicationCommandType.ChatInput) {
      throw new Error("Subcommands must be used with ChatInput");
    }
    const data = rawInteraction.data;
    const subcommand = command.subcommands.find((x) => x.name === data.options?.[0]?.name);
    if (!subcommand)
    throw new Error("Subcommand not found");
    return subcommand;
  }
  getCommand(rawInteraction) {
    let command = this.client.commands.find((x) => x.name === rawInteraction.data.name);
    if (!command)
    command = this.client.commands.find((x) => x.name === "*");
    if (!command)
    throw new Error("Command not found");
    if (command instanceof _CommandWithSubcommandGroups.CommandWithSubcommandGroups) {
      if (rawInteraction.data.type !== _v.ApplicationCommandType.ChatInput) {
        throw new Error("Subcommand groups must be used with ChatInput");
      }
      const data = rawInteraction.data;
      const subcommandGroupName = data.options?.find((x) => x.type === _v.ApplicationCommandOptionType.SubcommandGroup)?.name;
      if (!subcommandGroupName) {
        try {
          return this.getSubcommand(command, rawInteraction);
        }
        catch {
          throw new Error("No subcommand group name or subcommand found");
        }
      }
      const subcommandGroup = command.subcommandGroups.find((x) => x.name === subcommandGroupName);
      if (!subcommandGroup)
      throw new Error("Subcommand group not found");
      const subcommandName = (data.options?.find((x) => x.type === _v.ApplicationCommandOptionType.SubcommandGroup)).options?.find((x) => x.type === _v.ApplicationCommandOptionType.Subcommand)?.name;
      if (!subcommandName)
      throw new Error("No subcommand name");
      const subcommand = subcommandGroup.subcommands.find((x) => x.name === subcommandName);
      if (!subcommand)
      throw new Error("Subcommand not found");
      return subcommand;
    }
    if (command instanceof _CommandWithSubcommands.CommandWithSubcommands) {
      return this.getSubcommand(command, rawInteraction);
    }
    if (command instanceof _Command.Command) {
      return command;
    }
    throw new Error("Command is not a valid command type");
  }
  /**
   * Handle a command interaction
   * @internal
   */
  async handleCommandInteraction(rawInteraction) {
    const command = this.getCommand(rawInteraction);
    if (!command)
    return false;
    if (command.components) {
      for (const component of command.components) {
        this.client.componentHandler.registerComponent(component);
      }
    }
    const interaction = new _CommandInteraction.CommandInteraction({
      client: this.client,
      data: rawInteraction,
      defaults: {
        ephemeral: typeof command.ephemeral === "function" ?
        false // Will be resolved later after interaction is created
        : command.ephemeral
      },
      processingCommand: command
    });
    try {
      const command = this.getCommand(rawInteraction);
      // Resolve ephemeral setting if it's a function
      if (typeof command.ephemeral === "function") {
        interaction.setDefaultEphemeral(command.ephemeral(interaction));
      }
      // Resolve defer setting if it's a function
      const shouldDefer = typeof command.defer === "function" ?
      command.defer(interaction) :
      command.defer;
      if (shouldDefer) {
        await interaction.defer();
      }
      if (command.preCheck) {
        const result = await command.preCheck(interaction);
        if (!result)
        return false;
      }
      return await command.run(interaction);
    }
    catch (e) {
      if (e instanceof Error)
      console.error(e.message);
      console.error(e);
    }
  }
  async handleAutocompleteInteraction(rawInteraction) {
    const command = this.getCommand(rawInteraction);
    if (!command)
    return false;
    const interaction = new _AutocompleteInteraction.AutocompleteInteraction({
      client: this.client,
      data: rawInteraction,
      defaults: {
        ephemeral: typeof command.ephemeral === "function" ?
        false // Autocomplete interactions don't use ephemeral typically, but resolve for consistency
        : command.ephemeral
      },
      processingCommand: command
    });
    try {
      const command = this.getCommand(rawInteraction);
      // Check if the focused option has its own autocomplete function
      const focusedOption = interaction.options.getFocused();
      if (focusedOption && command.options) {
        const optionDefinition = command.options.find((opt) => opt.name === focusedOption.name);
        if (optionDefinition &&
        "autocomplete" in optionDefinition &&
        typeof optionDefinition.autocomplete === "function") {
          return await optionDefinition.autocomplete(interaction);
        }
      }
      // Fall back to command-level autocomplete
      return await command.autocomplete(interaction);
    }
    catch (e) {
      if (e instanceof Error)
      console.error(e.message);
      console.error(e);
    }
  }
}exports.CommandHandler = CommandHandler; /* v9-b628866aebba042a */
