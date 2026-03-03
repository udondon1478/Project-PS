"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.resolveReplyDirectives = resolveReplyDirectives;var _sandbox = require("../../agents/sandbox.js");
var _commandsRegistry = require("../commands-registry.js");
var _skillCommands = require("../skill-commands.js");
var _blockStreaming = require("./block-streaming.js");
var _commands = require("./commands.js");
var _directiveHandling = require("./directive-handling.js");
var _getReplyDirectivesApply = require("./get-reply-directives-apply.js");
var _getReplyDirectivesUtils = require("./get-reply-directives-utils.js");
var _groups = require("./groups.js");
var _mentions = require("./mentions.js");
var _modelSelection = require("./model-selection.js");
var _replyElevated = require("./reply-elevated.js");
var _replyInline = require("./reply-inline.js");
function resolveExecOverrides(params) {
  const host = params.directives.execHost ?? params.sessionEntry?.execHost;
  const security = params.directives.execSecurity ??
  params.sessionEntry?.execSecurity;
  const ask = params.directives.execAsk ?? params.sessionEntry?.execAsk;
  const node = params.directives.execNode ?? params.sessionEntry?.execNode;
  if (!host && !security && !ask && !node) {
    return undefined;
  }
  return { host, security, ask, node };
}
async function resolveReplyDirectives(params) {
  const { ctx, cfg, agentId, agentCfg, agentDir, workspaceDir, sessionCtx, sessionEntry, sessionStore, sessionKey, storePath, sessionScope, groupResolution, isGroup, triggerBodyNormalized, commandAuthorized, defaultProvider, defaultModel, provider: initialProvider, model: initialModel, typing, opts, skillFilter } = params;
  let provider = initialProvider;
  let model = initialModel;
  // Prefer CommandBody/RawBody (clean message without structural context) for directive parsing.
  // Keep `Body`/`BodyStripped` as the best-available prompt text (may include context).
  const commandSource = sessionCtx.BodyForCommands ??
  sessionCtx.CommandBody ??
  sessionCtx.RawBody ??
  sessionCtx.Transcript ??
  sessionCtx.BodyStripped ??
  sessionCtx.Body ??
  ctx.BodyForCommands ??
  ctx.CommandBody ??
  ctx.RawBody ??
  "";
  const promptSource = sessionCtx.BodyForAgent ?? sessionCtx.BodyStripped ?? sessionCtx.Body ?? "";
  const commandText = commandSource || promptSource;
  const command = (0, _commands.buildCommandContext)({
    ctx,
    cfg,
    agentId,
    sessionKey,
    isGroup,
    triggerBodyNormalized,
    commandAuthorized
  });
  const allowTextCommands = (0, _commandsRegistry.shouldHandleTextCommands)({
    cfg,
    surface: command.surface,
    commandSource: ctx.CommandSource
  });
  const shouldResolveSkillCommands = allowTextCommands && command.commandBodyNormalized.includes("/");
  const skillCommands = shouldResolveSkillCommands ?
  (0, _skillCommands.listSkillCommandsForWorkspace)({
    workspaceDir,
    cfg,
    skillFilter
  }) :
  [];
  const reservedCommands = new Set((0, _commandsRegistry.listChatCommands)().flatMap((cmd) => cmd.textAliases.map((a) => a.replace(/^\//, "").toLowerCase())));
  for (const command of skillCommands) {
    reservedCommands.add(command.name.toLowerCase());
  }
  const configuredAliases = Object.values(cfg.agents?.defaults?.models ?? {}).
  map((entry) => entry.alias?.trim()).
  filter((alias) => Boolean(alias)).
  filter((alias) => !reservedCommands.has(alias.toLowerCase()));
  const allowStatusDirective = allowTextCommands && command.isAuthorizedSender;
  let parsedDirectives = (0, _directiveHandling.parseInlineDirectives)(commandText, {
    modelAliases: configuredAliases,
    allowStatusDirective
  });
  const hasInlineStatus = parsedDirectives.hasStatusDirective && parsedDirectives.cleaned.trim().length > 0;
  if (hasInlineStatus) {
    parsedDirectives = {
      ...parsedDirectives,
      hasStatusDirective: false
    };
  }
  if (isGroup && ctx.WasMentioned !== true && parsedDirectives.hasElevatedDirective) {
    if (parsedDirectives.elevatedLevel !== "off") {
      parsedDirectives = {
        ...parsedDirectives,
        hasElevatedDirective: false,
        elevatedLevel: undefined,
        rawElevatedLevel: undefined
      };
    }
  }
  if (isGroup && ctx.WasMentioned !== true && parsedDirectives.hasExecDirective) {
    if (parsedDirectives.execSecurity !== "deny") {
      parsedDirectives = {
        ...parsedDirectives,
        hasExecDirective: false,
        execHost: undefined,
        execSecurity: undefined,
        execAsk: undefined,
        execNode: undefined,
        rawExecHost: undefined,
        rawExecSecurity: undefined,
        rawExecAsk: undefined,
        rawExecNode: undefined,
        hasExecOptions: false,
        invalidExecHost: false,
        invalidExecSecurity: false,
        invalidExecAsk: false,
        invalidExecNode: false
      };
    }
  }
  const hasInlineDirective = parsedDirectives.hasThinkDirective ||
  parsedDirectives.hasVerboseDirective ||
  parsedDirectives.hasReasoningDirective ||
  parsedDirectives.hasElevatedDirective ||
  parsedDirectives.hasExecDirective ||
  parsedDirectives.hasModelDirective ||
  parsedDirectives.hasQueueDirective;
  if (hasInlineDirective) {
    const stripped = (0, _mentions.stripStructuralPrefixes)(parsedDirectives.cleaned);
    const noMentions = isGroup ? (0, _mentions.stripMentions)(stripped, ctx, cfg, agentId) : stripped;
    if (noMentions.trim().length > 0) {
      const directiveOnlyCheck = (0, _directiveHandling.parseInlineDirectives)(noMentions, {
        modelAliases: configuredAliases
      });
      if (directiveOnlyCheck.cleaned.trim().length > 0) {
        const allowInlineStatus = parsedDirectives.hasStatusDirective && allowTextCommands && command.isAuthorizedSender;
        parsedDirectives = allowInlineStatus ?
        {
          ...(0, _getReplyDirectivesUtils.clearInlineDirectives)(parsedDirectives.cleaned),
          hasStatusDirective: true
        } :
        (0, _getReplyDirectivesUtils.clearInlineDirectives)(parsedDirectives.cleaned);
      }
    }
  }
  let directives = commandAuthorized ?
  parsedDirectives :
  {
    ...parsedDirectives,
    hasThinkDirective: false,
    hasVerboseDirective: false,
    hasReasoningDirective: false,
    hasStatusDirective: false,
    hasModelDirective: false,
    hasQueueDirective: false,
    queueReset: false
  };
  const existingBody = sessionCtx.BodyStripped ?? sessionCtx.Body ?? "";
  let cleanedBody = (() => {
    if (!existingBody) {
      return parsedDirectives.cleaned;
    }
    if (!sessionCtx.CommandBody && !sessionCtx.RawBody) {
      return (0, _directiveHandling.parseInlineDirectives)(existingBody, {
        modelAliases: configuredAliases,
        allowStatusDirective
      }).cleaned;
    }
    const markerIndex = existingBody.indexOf(_mentions.CURRENT_MESSAGE_MARKER);
    if (markerIndex < 0) {
      return (0, _directiveHandling.parseInlineDirectives)(existingBody, {
        modelAliases: configuredAliases,
        allowStatusDirective
      }).cleaned;
    }
    const head = existingBody.slice(0, markerIndex + _mentions.CURRENT_MESSAGE_MARKER.length);
    const tail = existingBody.slice(markerIndex + _mentions.CURRENT_MESSAGE_MARKER.length);
    const cleanedTail = (0, _directiveHandling.parseInlineDirectives)(tail, {
      modelAliases: configuredAliases,
      allowStatusDirective
    }).cleaned;
    return `${head}${cleanedTail}`;
  })();
  if (allowStatusDirective) {
    cleanedBody = (0, _replyInline.stripInlineStatus)(cleanedBody).cleaned;
  }
  sessionCtx.BodyForAgent = cleanedBody;
  sessionCtx.Body = cleanedBody;
  sessionCtx.BodyStripped = cleanedBody;
  const messageProviderKey = sessionCtx.Provider?.trim().toLowerCase() ?? ctx.Provider?.trim().toLowerCase() ?? "";
  const elevated = (0, _replyElevated.resolveElevatedPermissions)({
    cfg,
    agentId,
    ctx,
    provider: messageProviderKey
  });
  const elevatedEnabled = elevated.enabled;
  const elevatedAllowed = elevated.allowed;
  const elevatedFailures = elevated.failures;
  if (directives.hasElevatedDirective && (!elevatedEnabled || !elevatedAllowed)) {
    typing.cleanup();
    const runtimeSandboxed = (0, _sandbox.resolveSandboxRuntimeStatus)({
      cfg,
      sessionKey: ctx.SessionKey
    }).sandboxed;
    return {
      kind: "reply",
      reply: {
        text: (0, _replyElevated.formatElevatedUnavailableMessage)({
          runtimeSandboxed,
          failures: elevatedFailures,
          sessionKey: ctx.SessionKey
        })
      }
    };
  }
  const requireMention = (0, _groups.resolveGroupRequireMention)({
    cfg,
    ctx: sessionCtx,
    groupResolution
  });
  const defaultActivation = (0, _groups.defaultGroupActivation)(requireMention);
  const resolvedThinkLevel = directives.thinkLevel ??
  sessionEntry?.thinkingLevel ??
  agentCfg?.thinkingDefault;
  const resolvedVerboseLevel = directives.verboseLevel ??
  sessionEntry?.verboseLevel ??
  agentCfg?.verboseDefault;
  const resolvedReasoningLevel = directives.reasoningLevel ??
  sessionEntry?.reasoningLevel ??
  "off";
  const resolvedElevatedLevel = elevatedAllowed ?
  directives.elevatedLevel ??
  sessionEntry?.elevatedLevel ??
  agentCfg?.elevatedDefault ??
  "on" :
  "off";
  const resolvedBlockStreaming = opts?.disableBlockStreaming === true ?
  "off" :
  opts?.disableBlockStreaming === false ?
  "on" :
  agentCfg?.blockStreamingDefault === "on" ?
  "on" :
  "off";
  const resolvedBlockStreamingBreak = agentCfg?.blockStreamingBreak === "message_end" ? "message_end" : "text_end";
  const blockStreamingEnabled = resolvedBlockStreaming === "on" && opts?.disableBlockStreaming !== true;
  const blockReplyChunking = blockStreamingEnabled ?
  (0, _blockStreaming.resolveBlockStreamingChunking)(cfg, sessionCtx.Provider, sessionCtx.AccountId) :
  undefined;
  const modelState = await (0, _modelSelection.createModelSelectionState)({
    cfg,
    agentCfg,
    sessionEntry,
    sessionStore,
    sessionKey,
    parentSessionKey: ctx.ParentSessionKey,
    storePath,
    defaultProvider,
    defaultModel,
    provider,
    model,
    hasModelDirective: directives.hasModelDirective
  });
  provider = modelState.provider;
  model = modelState.model;
  let contextTokens = (0, _modelSelection.resolveContextTokens)({
    agentCfg,
    model
  });
  const initialModelLabel = `${provider}/${model}`;
  const formatModelSwitchEvent = (label, alias) => alias ? `Model switched to ${alias} (${label}).` : `Model switched to ${label}.`;
  const isModelListAlias = directives.hasModelDirective &&
  ["status", "list"].includes(directives.rawModelDirective?.trim().toLowerCase() ?? "");
  const effectiveModelDirective = isModelListAlias ? undefined : directives.rawModelDirective;
  const inlineStatusRequested = hasInlineStatus && allowTextCommands && command.isAuthorizedSender;
  const applyResult = await (0, _getReplyDirectivesApply.applyInlineDirectiveOverrides)({
    ctx,
    cfg,
    agentId,
    agentDir,
    agentCfg,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    sessionScope,
    isGroup,
    allowTextCommands,
    command,
    directives,
    messageProviderKey,
    elevatedEnabled,
    elevatedAllowed,
    elevatedFailures,
    defaultProvider,
    defaultModel,
    aliasIndex: params.aliasIndex,
    provider,
    model,
    modelState,
    initialModelLabel,
    formatModelSwitchEvent,
    resolvedElevatedLevel,
    defaultActivation: () => defaultActivation,
    contextTokens,
    effectiveModelDirective,
    typing
  });
  if (applyResult.kind === "reply") {
    return { kind: "reply", reply: applyResult.reply };
  }
  directives = applyResult.directives;
  provider = applyResult.provider;
  model = applyResult.model;
  contextTokens = applyResult.contextTokens;
  const { directiveAck, perMessageQueueMode, perMessageQueueOptions } = applyResult;
  const execOverrides = resolveExecOverrides({ directives, sessionEntry });
  return {
    kind: "continue",
    result: {
      commandSource: commandText,
      command,
      allowTextCommands,
      skillCommands,
      directives,
      cleanedBody,
      messageProviderKey,
      elevatedEnabled,
      elevatedAllowed,
      elevatedFailures,
      defaultActivation,
      resolvedThinkLevel,
      resolvedVerboseLevel,
      resolvedReasoningLevel,
      resolvedElevatedLevel,
      execOverrides,
      blockStreamingEnabled,
      blockReplyChunking,
      resolvedBlockStreamingBreak,
      provider,
      model,
      modelState,
      contextTokens,
      inlineStatusRequested,
      directiveAck,
      perMessageQueueMode,
      perMessageQueueOptions
    }
  };
} /* v9-bbb3602fdfdd96e3 */
