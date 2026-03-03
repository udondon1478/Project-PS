"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getReplyFromConfig = getReplyFromConfig;var _agentScope = require("../../agents/agent-scope.js");
var _modelSelection = require("../../agents/model-selection.js");
var _timeout = require("../../agents/timeout.js");
var _workspace = require("../../agents/workspace.js");
var _config = require("../../config/config.js");
var _apply = require("../../link-understanding/apply.js");
var _apply2 = require("../../media-understanding/apply.js");
var _runtime = require("../../runtime.js");
var _commandAuth = require("../command-auth.js");
var _tokens = require("../tokens.js");
var _directiveHandling = require("./directive-handling.js");
var _getReplyDirectives = require("./get-reply-directives.js");
var _getReplyInlineActions = require("./get-reply-inline-actions.js");
var _getReplyRun = require("./get-reply-run.js");
var _inboundContext = require("./inbound-context.js");
var _sessionResetModel = require("./session-reset-model.js");
var _session = require("./session.js");
var _stageSandboxMedia = require("./stage-sandbox-media.js");
var _typing = require("./typing.js");
async function getReplyFromConfig(ctx, opts, configOverride) {
  const isFastTestEnv = process.env.OPENCLAW_TEST_FAST === "1";
  const cfg = configOverride ?? (0, _config.loadConfig)();
  const targetSessionKey = ctx.CommandSource === "native" ? ctx.CommandTargetSessionKey?.trim() : undefined;
  const agentSessionKey = targetSessionKey || ctx.SessionKey;
  const agentId = (0, _agentScope.resolveSessionAgentId)({
    sessionKey: agentSessionKey,
    config: cfg
  });
  const agentCfg = cfg.agents?.defaults;
  const sessionCfg = cfg.session;
  const { defaultProvider, defaultModel, aliasIndex } = (0, _directiveHandling.resolveDefaultModel)({
    cfg,
    agentId
  });
  let provider = defaultProvider;
  let model = defaultModel;
  if (opts?.isHeartbeat) {
    const heartbeatRaw = agentCfg?.heartbeat?.model?.trim() ?? "";
    const heartbeatRef = heartbeatRaw ?
    (0, _modelSelection.resolveModelRefFromString)({
      raw: heartbeatRaw,
      defaultProvider,
      aliasIndex
    }) :
    null;
    if (heartbeatRef) {
      provider = heartbeatRef.ref.provider;
      model = heartbeatRef.ref.model;
    }
  }
  const workspaceDirRaw = (0, _agentScope.resolveAgentWorkspaceDir)(cfg, agentId) ?? _workspace.DEFAULT_AGENT_WORKSPACE_DIR;
  const workspace = await (0, _workspace.ensureAgentWorkspace)({
    dir: workspaceDirRaw,
    ensureBootstrapFiles: !agentCfg?.skipBootstrap && !isFastTestEnv
  });
  const workspaceDir = workspace.dir;
  const agentDir = (0, _agentScope.resolveAgentDir)(cfg, agentId);
  const timeoutMs = (0, _timeout.resolveAgentTimeoutMs)({ cfg });
  const configuredTypingSeconds = agentCfg?.typingIntervalSeconds ?? sessionCfg?.typingIntervalSeconds;
  const typingIntervalSeconds = typeof configuredTypingSeconds === "number" ? configuredTypingSeconds : 6;
  const typing = (0, _typing.createTypingController)({
    onReplyStart: opts?.onReplyStart,
    typingIntervalSeconds,
    silentToken: _tokens.SILENT_REPLY_TOKEN,
    log: _runtime.defaultRuntime.log
  });
  opts?.onTypingController?.(typing);
  const finalized = (0, _inboundContext.finalizeInboundContext)(ctx);
  if (!isFastTestEnv) {
    await (0, _apply2.applyMediaUnderstanding)({
      ctx: finalized,
      cfg,
      agentDir,
      activeModel: { provider, model }
    });
    await (0, _apply.applyLinkUnderstanding)({
      ctx: finalized,
      cfg
    });
  }
  const commandAuthorized = finalized.CommandAuthorized;
  (0, _commandAuth.resolveCommandAuthorization)({
    ctx: finalized,
    cfg,
    commandAuthorized
  });
  const sessionState = await (0, _session.initSessionState)({
    ctx: finalized,
    cfg,
    commandAuthorized
  });
  let { sessionCtx, sessionEntry, previousSessionEntry, sessionStore, sessionKey, sessionId, isNewSession, resetTriggered, systemSent, abortedLastRun, storePath, sessionScope, groupResolution, isGroup, triggerBodyNormalized, bodyStripped } = sessionState;
  await (0, _sessionResetModel.applyResetModelOverride)({
    cfg,
    resetTriggered,
    bodyStripped,
    sessionCtx,
    ctx: finalized,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    defaultProvider,
    defaultModel,
    aliasIndex
  });
  const directiveResult = await (0, _getReplyDirectives.resolveReplyDirectives)({
    ctx: finalized,
    cfg,
    agentId,
    agentDir,
    workspaceDir,
    agentCfg,
    sessionCtx,
    sessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    sessionScope,
    groupResolution,
    isGroup,
    triggerBodyNormalized,
    commandAuthorized,
    defaultProvider,
    defaultModel,
    aliasIndex,
    provider,
    model,
    typing,
    opts,
    skillFilter: opts?.skillFilter
  });
  if (directiveResult.kind === "reply") {
    return directiveResult.reply;
  }
  let { commandSource, command, allowTextCommands, skillCommands, directives, cleanedBody, elevatedEnabled, elevatedAllowed, elevatedFailures, defaultActivation, resolvedThinkLevel, resolvedVerboseLevel, resolvedReasoningLevel, resolvedElevatedLevel, execOverrides, blockStreamingEnabled, blockReplyChunking, resolvedBlockStreamingBreak, provider: resolvedProvider, model: resolvedModel, modelState, contextTokens, inlineStatusRequested, directiveAck, perMessageQueueMode, perMessageQueueOptions } = directiveResult.result;
  provider = resolvedProvider;
  model = resolvedModel;
  const inlineActionResult = await (0, _getReplyInlineActions.handleInlineActions)({
    ctx,
    sessionCtx,
    cfg,
    agentId,
    agentDir,
    sessionEntry,
    previousSessionEntry,
    sessionStore,
    sessionKey,
    storePath,
    sessionScope,
    workspaceDir,
    isGroup,
    opts,
    typing,
    allowTextCommands,
    inlineStatusRequested,
    command,
    skillCommands,
    directives,
    cleanedBody,
    elevatedEnabled,
    elevatedAllowed,
    elevatedFailures,
    defaultActivation: () => defaultActivation,
    resolvedThinkLevel,
    resolvedVerboseLevel,
    resolvedReasoningLevel,
    resolvedElevatedLevel,
    resolveDefaultThinkingLevel: modelState.resolveDefaultThinkingLevel,
    provider,
    model,
    contextTokens,
    directiveAck,
    abortedLastRun,
    skillFilter: opts?.skillFilter
  });
  if (inlineActionResult.kind === "reply") {
    return inlineActionResult.reply;
  }
  directives = inlineActionResult.directives;
  abortedLastRun = inlineActionResult.abortedLastRun ?? abortedLastRun;
  await (0, _stageSandboxMedia.stageSandboxMedia)({
    ctx,
    sessionCtx,
    cfg,
    sessionKey,
    workspaceDir
  });
  return (0, _getReplyRun.runPreparedReply)({
    ctx,
    sessionCtx,
    cfg,
    agentId,
    agentDir,
    agentCfg,
    sessionCfg,
    commandAuthorized,
    command,
    commandSource,
    allowTextCommands,
    directives,
    defaultActivation,
    resolvedThinkLevel,
    resolvedVerboseLevel,
    resolvedReasoningLevel,
    resolvedElevatedLevel,
    execOverrides,
    elevatedEnabled,
    elevatedAllowed,
    blockStreamingEnabled,
    blockReplyChunking,
    resolvedBlockStreamingBreak,
    modelState,
    provider,
    model,
    perMessageQueueMode,
    perMessageQueueOptions,
    typing,
    opts,
    defaultProvider,
    defaultModel,
    timeoutMs,
    isNewSession,
    resetTriggered,
    systemSent,
    sessionEntry,
    sessionStore,
    sessionKey,
    sessionId,
    storePath,
    workspaceDir,
    abortedLastRun
  });
} /* v9-24f43493cb97e3ac */
