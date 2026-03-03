"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleBashCommand = void 0;var _globals = require("../../globals.js");
var _bashCommand = require("./bash-command.js");
const handleBashCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const { command } = params;
  const bashSlashRequested = command.commandBodyNormalized === "/bash" || command.commandBodyNormalized.startsWith("/bash ");
  const bashBangRequested = command.commandBodyNormalized.startsWith("!");
  if (!bashSlashRequested && !(bashBangRequested && command.isAuthorizedSender)) {
    return null;
  }
  if (!command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /bash from unauthorized sender: ${command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  const reply = await (0, _bashCommand.handleBashChatCommand)({
    ctx: params.ctx,
    cfg: params.cfg,
    agentId: params.agentId,
    sessionKey: params.sessionKey,
    isGroup: params.isGroup,
    elevated: params.elevated
  });
  return { shouldContinue: false, reply };
};exports.handleBashCommand = handleBashCommand; /* v9-22b6946f2bda0811 */
