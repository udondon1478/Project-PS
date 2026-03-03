"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handlePluginCommand = void 0;





var _commands = require("../../plugins/commands.js"); /**
 * Plugin Command Handler
 *
 * Handles commands registered by plugins, bypassing the LLM agent.
 * This handler is called before built-in command handlers.
 */ /**
 * Handle plugin-registered commands.
 * Returns a result if a plugin command was matched and executed,
 * or null to continue to the next handler.
 */const handlePluginCommand = async (params, allowTextCommands) => {const { command, cfg } = params;if (!allowTextCommands) {return null;
  }
  // Try to match a plugin command
  const match = (0, _commands.matchPluginCommand)(command.commandBodyNormalized);
  if (!match) {
    return null;
  }
  // Execute the plugin command (always returns a result)
  const result = await (0, _commands.executePluginCommand)({
    command: match.command,
    args: match.args,
    senderId: command.senderId,
    channel: command.channel,
    isAuthorizedSender: command.isAuthorizedSender,
    commandBody: command.commandBodyNormalized,
    config: cfg
  });
  return {
    shouldContinue: false,
    reply: result
  };
};exports.handlePluginCommand = handlePluginCommand; /* v9-9870d8b3578a0717 */
