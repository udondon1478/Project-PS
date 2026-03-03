"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleInlineActions = handleInlineActions;var _openclawTools = require("../../agents/openclaw-tools.js");
var _dock = require("../../channels/dock.js");
var _globals = require("../../globals.js");
var _messageChannel = require("../../utils/message-channel.js");
var _skillCommands = require("../skill-commands.js");
var _abort = require("./abort.js");
var _commands = require("./commands.js");
var _directiveHandling = require("./directive-handling.js");
var _replyInline = require("./reply-inline.js");
// oxlint-disable-next-line typescript/no-explicit-any
function extractTextFromToolResult(result) {
  if (!result || typeof result !== "object") {
    return null;
  }
  const content = result.content;
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed ? trimmed : null;
  }
  if (!Array.isArray(content)) {
    return null;
  }
  const parts = [];
  for (const block of content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const rec = block;
    if (rec.type === "text" && typeof rec.text === "string") {
      parts.push(rec.text);
    }
  }
  const out = parts.join("");
  const trimmed = out.trim();
  return trimmed ? trimmed : null;
}
async function handleInlineActions(params) {
  const { ctx, sessionCtx, cfg, agentId, agentDir, sessionEntry, previousSessionEntry, sessionStore, sessionKey, storePath, sessionScope, workspaceDir, isGroup, opts, typing, allowTextCommands, inlineStatusRequested, command, directives: initialDirectives, cleanedBody: initialCleanedBody, elevatedEnabled, elevatedAllowed, elevatedFailures, defaultActivation, resolvedThinkLevel, resolvedVerboseLevel, resolvedReasoningLevel, resolvedElevatedLevel, resolveDefaultThinkingLevel, provider, model, contextTokens, directiveAck, abortedLastRun: initialAbortedLastRun, skillFilter } = params;
  let directives = initialDirectives;
  let cleanedBody = initialCleanedBody;
  const shouldLoadSkillCommands = command.commandBodyNormalized.startsWith("/");
  const skillCommands = shouldLoadSkillCommands && params.skillCommands ?
  params.skillCommands :
  shouldLoadSkillCommands ?
  (0, _skillCommands.listSkillCommandsForWorkspace)({
    workspaceDir,
    cfg,
    skillFilter
  }) :
  [];
  const skillInvocation = allowTextCommands && skillCommands.length > 0 ?
  (0, _skillCommands.resolveSkillCommandInvocation)({
    commandBodyNormalized: command.commandBodyNormalized,
    skillCommands
  }) :
  null;
  if (skillInvocation) {
    if (!command.isAuthorizedSender) {
      (0, _globals.logVerbose)(`Ignoring /${skillInvocation.command.name} from unauthorized sender: ${command.senderId || "<unknown>"}`);
      typing.cleanup();
      return { kind: "reply", reply: undefined };
    }
    const dispatch = skillInvocation.command.dispatch;
    if (dispatch?.kind === "tool") {
      const rawArgs = (skillInvocation.args ?? "").trim();
      const channel = (0, _messageChannel.resolveGatewayMessageChannel)(ctx.Surface) ??
      (0, _messageChannel.resolveGatewayMessageChannel)(ctx.Provider) ??
      undefined;
      const tools = (0, _openclawTools.createOpenClawTools)({
        agentSessionKey: sessionKey,
        agentChannel: channel,
        agentAccountId: ctx.AccountId,
        agentTo: ctx.OriginatingTo ?? ctx.To,
        agentThreadId: ctx.MessageThreadId ?? undefined,
        agentDir,
        workspaceDir,
        config: cfg
      });
      const tool = tools.find((candidate) => candidate.name === dispatch.toolName);
      if (!tool) {
        typing.cleanup();
        return { kind: "reply", reply: { text: `❌ Tool not available: ${dispatch.toolName}` } };
      }
      const toolCallId = `cmd_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      try {
        const result = await tool.execute(toolCallId, {
          command: rawArgs,
          commandName: skillInvocation.command.name,
          skillName: skillInvocation.command.skillName
          // oxlint-disable-next-line typescript/no-explicit-any
        });
        const text = extractTextFromToolResult(result) ?? "✅ Done.";
        typing.cleanup();
        return { kind: "reply", reply: { text } };
      }
      catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        typing.cleanup();
        return { kind: "reply", reply: { text: `❌ ${message}` } };
      }
    }
    const promptParts = [
    `Use the "${skillInvocation.command.skillName}" skill for this request.`,
    skillInvocation.args ? `User input:\n${skillInvocation.args}` : null].
    filter((entry) => Boolean(entry));
    const rewrittenBody = promptParts.join("\n\n");
    ctx.Body = rewrittenBody;
    ctx.BodyForAgent = rewrittenBody;
    sessionCtx.Body = rewrittenBody;
    sessionCtx.BodyForAgent = rewrittenBody;
    sessionCtx.BodyStripped = rewrittenBody;
    cleanedBody = rewrittenBody;
  }
  const sendInlineReply = async (reply) => {
    if (!reply) {
      return;
    }
    if (!opts?.onBlockReply) {
      return;
    }
    await opts.onBlockReply(reply);
  };
  const inlineCommand = allowTextCommands && command.isAuthorizedSender ?
  (0, _replyInline.extractInlineSimpleCommand)(cleanedBody) :
  null;
  if (inlineCommand) {
    cleanedBody = inlineCommand.cleaned;
    sessionCtx.Body = cleanedBody;
    sessionCtx.BodyForAgent = cleanedBody;
    sessionCtx.BodyStripped = cleanedBody;
  }
  const handleInlineStatus = !(0, _directiveHandling.isDirectiveOnly)({
    directives,
    cleanedBody: directives.cleaned,
    ctx,
    cfg,
    agentId,
    isGroup
  }) && inlineStatusRequested;
  if (handleInlineStatus) {
    const inlineStatusReply = await (0, _commands.buildStatusReply)({
      cfg,
      command,
      sessionEntry,
      sessionKey,
      sessionScope,
      provider,
      model,
      contextTokens,
      resolvedThinkLevel,
      resolvedVerboseLevel: resolvedVerboseLevel ?? "off",
      resolvedReasoningLevel,
      resolvedElevatedLevel,
      resolveDefaultThinkingLevel,
      isGroup,
      defaultGroupActivation: defaultActivation,
      mediaDecisions: ctx.MediaUnderstandingDecisions
    });
    await sendInlineReply(inlineStatusReply);
    directives = { ...directives, hasStatusDirective: false };
  }
  if (inlineCommand) {
    const inlineCommandContext = {
      ...command,
      rawBodyNormalized: inlineCommand.command,
      commandBodyNormalized: inlineCommand.command
    };
    const inlineResult = await (0, _commands.handleCommands)({
      ctx,
      cfg,
      command: inlineCommandContext,
      agentId,
      directives,
      elevated: {
        enabled: elevatedEnabled,
        allowed: elevatedAllowed,
        failures: elevatedFailures
      },
      sessionEntry,
      previousSessionEntry,
      sessionStore,
      sessionKey,
      storePath,
      sessionScope,
      workspaceDir,
      defaultGroupActivation: defaultActivation,
      resolvedThinkLevel,
      resolvedVerboseLevel: resolvedVerboseLevel ?? "off",
      resolvedReasoningLevel,
      resolvedElevatedLevel,
      resolveDefaultThinkingLevel,
      provider,
      model,
      contextTokens,
      isGroup,
      skillCommands
    });
    if (inlineResult.reply) {
      if (!inlineCommand.cleaned) {
        typing.cleanup();
        return { kind: "reply", reply: inlineResult.reply };
      }
      await sendInlineReply(inlineResult.reply);
    }
  }
  if (directiveAck) {
    await sendInlineReply(directiveAck);
  }
  const isEmptyConfig = Object.keys(cfg).length === 0;
  const skipWhenConfigEmpty = command.channelId ?
  Boolean((0, _dock.getChannelDock)(command.channelId)?.commands?.skipWhenConfigEmpty) :
  false;
  if (skipWhenConfigEmpty &&
  isEmptyConfig &&
  command.from &&
  command.to &&
  command.from !== command.to) {
    typing.cleanup();
    return { kind: "reply", reply: undefined };
  }
  let abortedLastRun = initialAbortedLastRun;
  if (!sessionEntry && command.abortKey) {
    abortedLastRun = (0, _abort.getAbortMemory)(command.abortKey) ?? false;
  }
  const commandResult = await (0, _commands.handleCommands)({
    ctx,
    cfg,
    command,
    agentId,
    directives,
    elevated: {
      enabled: elevatedEnabled,
      allowed: elevatedAllowed,
      failures: elevatedFailures
    },
    sessionEntry,
    previousSessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    sessionScope,
    workspaceDir,
    defaultGroupActivation: defaultActivation,
    resolvedThinkLevel,
    resolvedVerboseLevel: resolvedVerboseLevel ?? "off",
    resolvedReasoningLevel,
    resolvedElevatedLevel,
    resolveDefaultThinkingLevel,
    provider,
    model,
    contextTokens,
    isGroup,
    skillCommands
  });
  if (!commandResult.shouldContinue) {
    typing.cleanup();
    return { kind: "reply", reply: commandResult.reply };
  }
  return {
    kind: "continue",
    directives,
    abortedLastRun
  };
} /* v9-92234a2ecca3da7d */
