"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleCommands = handleCommands;var _globals = require("../../globals.js");
var _internalHooks = require("../../hooks/internal-hooks.js");
var _sendPolicy = require("../../sessions/send-policy.js");
var _commandsRegistry = require("../commands-registry.js");
var _commandsAllowlist = require("./commands-allowlist.js");
var _commandsApprove = require("./commands-approve.js");
var _commandsBash = require("./commands-bash.js");
var _commandsCompact = require("./commands-compact.js");
var _commandsConfig = require("./commands-config.js");
var _commandsInfo = require("./commands-info.js");
var _commandsModels = require("./commands-models.js");
var _commandsPlugin = require("./commands-plugin.js");
var _commandsSession = require("./commands-session.js");
var _commandsSubagents = require("./commands-subagents.js");
var _commandsTts = require("./commands-tts.js");
var _routeReply = require("./route-reply.js");
let HANDLERS = null;
async function handleCommands(params) {
  if (HANDLERS === null) {
    HANDLERS = [
    // Plugin commands are processed first, before built-in commands
    _commandsPlugin.handlePluginCommand,
    _commandsBash.handleBashCommand,
    _commandsSession.handleActivationCommand,
    _commandsSession.handleSendPolicyCommand,
    _commandsSession.handleUsageCommand,
    _commandsSession.handleRestartCommand,
    _commandsTts.handleTtsCommands,
    _commandsInfo.handleHelpCommand,
    _commandsInfo.handleCommandsListCommand,
    _commandsInfo.handleStatusCommand,
    _commandsAllowlist.handleAllowlistCommand,
    _commandsApprove.handleApproveCommand,
    _commandsInfo.handleContextCommand,
    _commandsInfo.handleWhoamiCommand,
    _commandsSubagents.handleSubagentsCommand,
    _commandsConfig.handleConfigCommand,
    _commandsConfig.handleDebugCommand,
    _commandsModels.handleModelsCommand,
    _commandsSession.handleStopCommand,
    _commandsCompact.handleCompactCommand,
    _commandsSession.handleAbortTrigger];

  }
  const resetMatch = params.command.commandBodyNormalized.match(/^\/(new|reset)(?:\s|$)/);
  const resetRequested = Boolean(resetMatch);
  if (resetRequested && !params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /reset from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  // Trigger internal hook for reset/new commands
  if (resetRequested && params.command.isAuthorizedSender) {
    const commandAction = resetMatch?.[1] ?? "new";
    const hookEvent = (0, _internalHooks.createInternalHookEvent)("command", commandAction, params.sessionKey ?? "", {
      sessionEntry: params.sessionEntry,
      previousSessionEntry: params.previousSessionEntry,
      commandSource: params.command.surface,
      senderId: params.command.senderId,
      cfg: params.cfg // Pass config for LLM slug generation
    });
    await (0, _internalHooks.triggerInternalHook)(hookEvent);
    // Send hook messages immediately if present
    if (hookEvent.messages.length > 0) {
      // Use OriginatingChannel/To if available, otherwise fall back to command channel/from
      // oxlint-disable-next-line typescript/no-explicit-any
      const channel = params.ctx.OriginatingChannel || params.command.channel;
      // For replies, use 'from' (the sender) not 'to' (which might be the bot itself)
      const to = params.ctx.OriginatingTo || params.command.from || params.command.to;
      if (channel && to) {
        const hookReply = { text: hookEvent.messages.join("\n\n") };
        await (0, _routeReply.routeReply)({
          payload: hookReply,
          channel: channel,
          to: to,
          sessionKey: params.sessionKey,
          accountId: params.ctx.AccountId,
          threadId: params.ctx.MessageThreadId,
          cfg: params.cfg
        });
      }
    }
  }
  const allowTextCommands = (0, _commandsRegistry.shouldHandleTextCommands)({
    cfg: params.cfg,
    surface: params.command.surface,
    commandSource: params.ctx.CommandSource
  });
  for (const handler of HANDLERS) {
    const result = await handler(params, allowTextCommands);
    if (result) {
      return result;
    }
  }
  const sendPolicy = (0, _sendPolicy.resolveSendPolicy)({
    cfg: params.cfg,
    entry: params.sessionEntry,
    sessionKey: params.sessionKey,
    channel: params.sessionEntry?.channel ?? params.command.channel,
    chatType: params.sessionEntry?.chatType
  });
  if (sendPolicy === "deny") {
    (0, _globals.logVerbose)(`Send blocked by policy for session ${params.sessionKey ?? "unknown"}`);
    return { shouldContinue: false };
  }
  return { shouldContinue: true };
} /* v9-f93399753d9967a1 */
