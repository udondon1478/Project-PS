"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildCommandsPaginationKeyboard = buildCommandsPaginationKeyboard;exports.handleWhoamiCommand = exports.handleStatusCommand = exports.handleHelpCommand = exports.handleContextCommand = exports.handleCommandsListCommand = void 0;var _globals = require("../../globals.js");
var _skillCommands = require("../skill-commands.js");
var _status = require("../status.js");
var _commandsContextReport = require("./commands-context-report.js");
var _commandsStatus = require("./commands-status.js");
const handleHelpCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  if (params.command.commandBodyNormalized !== "/help") {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /help from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  return {
    shouldContinue: false,
    reply: { text: (0, _status.buildHelpMessage)(params.cfg) }
  };
};exports.handleHelpCommand = handleHelpCommand;
const handleCommandsListCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  if (params.command.commandBodyNormalized !== "/commands") {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /commands from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  const skillCommands = params.skillCommands ??
  (0, _skillCommands.listSkillCommandsForAgents)({
    cfg: params.cfg,
    agentIds: params.agentId ? [params.agentId] : undefined
  });
  const surface = params.ctx.Surface;
  if (surface === "telegram") {
    const result = (0, _status.buildCommandsMessagePaginated)(params.cfg, skillCommands, {
      page: 1,
      surface
    });
    if (result.totalPages > 1) {
      return {
        shouldContinue: false,
        reply: {
          text: result.text,
          channelData: {
            telegram: {
              buttons: buildCommandsPaginationKeyboard(result.currentPage, result.totalPages, params.agentId)
            }
          }
        }
      };
    }
    return {
      shouldContinue: false,
      reply: { text: result.text }
    };
  }
  return {
    shouldContinue: false,
    reply: { text: (0, _status.buildCommandsMessage)(params.cfg, skillCommands, { surface }) }
  };
};exports.handleCommandsListCommand = handleCommandsListCommand;
function buildCommandsPaginationKeyboard(currentPage, totalPages, agentId) {
  const buttons = [];
  const suffix = agentId ? `:${agentId}` : "";
  if (currentPage > 1) {
    buttons.push({
      text: "◀ Prev",
      callback_data: `commands_page_${currentPage - 1}${suffix}`
    });
  }
  buttons.push({
    text: `${currentPage}/${totalPages}`,
    callback_data: `commands_page_noop${suffix}`
  });
  if (currentPage < totalPages) {
    buttons.push({
      text: "Next ▶",
      callback_data: `commands_page_${currentPage + 1}${suffix}`
    });
  }
  return [buttons];
}
const handleStatusCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const statusRequested = params.directives.hasStatusDirective || params.command.commandBodyNormalized === "/status";
  if (!statusRequested) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /status from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  const reply = await (0, _commandsStatus.buildStatusReply)({
    cfg: params.cfg,
    command: params.command,
    sessionEntry: params.sessionEntry,
    sessionKey: params.sessionKey,
    sessionScope: params.sessionScope,
    provider: params.provider,
    model: params.model,
    contextTokens: params.contextTokens,
    resolvedThinkLevel: params.resolvedThinkLevel,
    resolvedVerboseLevel: params.resolvedVerboseLevel,
    resolvedReasoningLevel: params.resolvedReasoningLevel,
    resolvedElevatedLevel: params.resolvedElevatedLevel,
    resolveDefaultThinkingLevel: params.resolveDefaultThinkingLevel,
    isGroup: params.isGroup,
    defaultGroupActivation: params.defaultGroupActivation,
    mediaDecisions: params.ctx.MediaUnderstandingDecisions
  });
  return { shouldContinue: false, reply };
};exports.handleStatusCommand = handleStatusCommand;
const handleContextCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const normalized = params.command.commandBodyNormalized;
  if (normalized !== "/context" && !normalized.startsWith("/context ")) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /context from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  return { shouldContinue: false, reply: await (0, _commandsContextReport.buildContextReply)(params) };
};exports.handleContextCommand = handleContextCommand;
const handleWhoamiCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  if (params.command.commandBodyNormalized !== "/whoami") {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /whoami from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  const senderId = params.ctx.SenderId ?? "";
  const senderUsername = params.ctx.SenderUsername ?? "";
  const lines = ["🧭 Identity", `Channel: ${params.command.channel}`];
  if (senderId) {
    lines.push(`User id: ${senderId}`);
  }
  if (senderUsername) {
    const handle = senderUsername.startsWith("@") ? senderUsername : `@${senderUsername}`;
    lines.push(`Username: ${handle}`);
  }
  if (params.ctx.ChatType === "group" && params.ctx.From) {
    lines.push(`Chat: ${params.ctx.From}`);
  }
  if (params.ctx.MessageThreadId != null) {
    lines.push(`Thread: ${params.ctx.MessageThreadId}`);
  }
  if (senderId) {
    lines.push(`AllowFrom: ${senderId}`);
  }
  return { shouldContinue: false, reply: { text: lines.join("\n") } };
};exports.handleWhoamiCommand = handleWhoamiCommand; /* v9-0a08d75e470be68b */
