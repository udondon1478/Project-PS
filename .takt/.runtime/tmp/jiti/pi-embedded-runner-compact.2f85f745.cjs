"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.compactEmbeddedPiSession = compactEmbeddedPiSession;exports.compactEmbeddedPiSessionDirect = compactEmbeddedPiSessionDirect;var _piCodingAgent = require("@mariozechner/pi-coding-agent");
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _heartbeat = require("../../auto-reply/heartbeat.js");
var _channelCapabilities = require("../../config/channel-capabilities.js");
var _machineName = require("../../infra/machine-name.js");
var _commandQueue = require("../../process/command-queue.js");
var _sessionKey = require("../../routing/session-key.js");
var _reactionLevel = require("../../signal/reaction-level.js");
var _inlineButtons = require("../../telegram/inline-buttons.js");
var _reactionLevel2 = require("../../telegram/reaction-level.js");
var _tts = require("../../tts/tts.js");
var _utils = require("../../utils.js");
var _messageChannel = require("../../utils/message-channel.js");
var _providerUtils = require("../../utils/provider-utils.js");
var _agentPaths = require("../agent-paths.js");
var _agentScope = require("../agent-scope.js");
var _bootstrapFiles = require("../bootstrap-files.js");
var _channelTools = require("../channel-tools.js");
var _dateTime = require("../date-time.js");
var _defaults = require("../defaults.js");
var _docsPath = require("../docs-path.js");
var _modelAuth = require("../model-auth.js");
var _modelsConfig = require("../models-config.js");
var _piEmbeddedHelpers = require("../pi-embedded-helpers.js");
var _piSettings = require("../pi-settings.js");
var _piTools = require("../pi-tools.js");
var _sandbox = require("../sandbox.js");
var _sessionToolResultGuardWrapper = require("../session-tool-result-guard-wrapper.js");
var _sessionWriteLock = require("../session-write-lock.js");
var _skills = require("../skills.js");
var _transcriptPolicy = require("../transcript-policy.js");
var _extensions = require("./extensions.js");
var _google = require("./google.js");
var _history = require("./history.js");
var _lanes = require("./lanes.js");
var _logger = require("./logger.js");
var _model = require("./model.js");
var _sandboxInfo = require("./sandbox-info.js");
var _sessionManagerCache = require("./session-manager-cache.js");
var _systemPrompt = require("./system-prompt.js");
var _toolSplit = require("./tool-split.js");
var _utils2 = require("./utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
/**
 * Core compaction logic without lane queueing.
 * Use this when already inside a session/global lane to avoid deadlocks.
 */
async function compactEmbeddedPiSessionDirect(params) {
  const resolvedWorkspace = (0, _utils.resolveUserPath)(params.workspaceDir);
  const prevCwd = process.cwd();
  const provider = (params.provider ?? _defaults.DEFAULT_PROVIDER).trim() || _defaults.DEFAULT_PROVIDER;
  const modelId = (params.model ?? _defaults.DEFAULT_MODEL).trim() || _defaults.DEFAULT_MODEL;
  const agentDir = params.agentDir ?? (0, _agentPaths.resolveOpenClawAgentDir)();
  await (0, _modelsConfig.ensureOpenClawModelsJson)(params.config, agentDir);
  const { model, error, authStorage, modelRegistry } = (0, _model.resolveModel)(provider, modelId, agentDir, params.config);
  if (!model) {
    return {
      ok: false,
      compacted: false,
      reason: error ?? `Unknown model: ${provider}/${modelId}`
    };
  }
  try {
    const apiKeyInfo = await (0, _modelAuth.getApiKeyForModel)({
      model,
      cfg: params.config,
      profileId: params.authProfileId,
      agentDir
    });
    if (!apiKeyInfo.apiKey) {
      if (apiKeyInfo.mode !== "aws-sdk") {
        throw new Error(`No API key resolved for provider "${model.provider}" (auth mode: ${apiKeyInfo.mode}).`);
      }
    } else
    if (model.provider === "github-copilot") {
      const { resolveCopilotApiToken } = await Promise.resolve().then(() => jitiImport("../../providers/github-copilot-token.js").then((m) => _interopRequireWildcard(m)));
      const copilotToken = await resolveCopilotApiToken({
        githubToken: apiKeyInfo.apiKey
      });
      authStorage.setRuntimeApiKey(model.provider, copilotToken.token);
    } else
    {
      authStorage.setRuntimeApiKey(model.provider, apiKeyInfo.apiKey);
    }
  }
  catch (err) {
    return {
      ok: false,
      compacted: false,
      reason: (0, _utils2.describeUnknownError)(err)
    };
  }
  await _promises.default.mkdir(resolvedWorkspace, { recursive: true });
  const sandboxSessionKey = params.sessionKey?.trim() || params.sessionId;
  const sandbox = await (0, _sandbox.resolveSandboxContext)({
    config: params.config,
    sessionKey: sandboxSessionKey,
    workspaceDir: resolvedWorkspace
  });
  const effectiveWorkspace = sandbox?.enabled ?
  sandbox.workspaceAccess === "rw" ?
  resolvedWorkspace :
  sandbox.workspaceDir :
  resolvedWorkspace;
  await _promises.default.mkdir(effectiveWorkspace, { recursive: true });
  await (0, _piEmbeddedHelpers.ensureSessionHeader)({
    sessionFile: params.sessionFile,
    sessionId: params.sessionId,
    cwd: effectiveWorkspace
  });
  let restoreSkillEnv;
  process.chdir(effectiveWorkspace);
  try {
    const shouldLoadSkillEntries = !params.skillsSnapshot || !params.skillsSnapshot.resolvedSkills;
    const skillEntries = shouldLoadSkillEntries ?
    (0, _skills.loadWorkspaceSkillEntries)(effectiveWorkspace) :
    [];
    restoreSkillEnv = params.skillsSnapshot ?
    (0, _skills.applySkillEnvOverridesFromSnapshot)({
      snapshot: params.skillsSnapshot,
      config: params.config
    }) :
    (0, _skills.applySkillEnvOverrides)({
      skills: skillEntries ?? [],
      config: params.config
    });
    const skillsPrompt = (0, _skills.resolveSkillsPromptForRun)({
      skillsSnapshot: params.skillsSnapshot,
      entries: shouldLoadSkillEntries ? skillEntries : undefined,
      config: params.config,
      workspaceDir: effectiveWorkspace
    });
    const sessionLabel = params.sessionKey ?? params.sessionId;
    const { contextFiles } = await (0, _bootstrapFiles.resolveBootstrapContextForRun)({
      workspaceDir: effectiveWorkspace,
      config: params.config,
      sessionKey: params.sessionKey,
      sessionId: params.sessionId,
      warn: (0, _bootstrapFiles.makeBootstrapWarn)({ sessionLabel, warn: (message) => _logger.log.warn(message) })
    });
    const runAbortController = new AbortController();
    const toolsRaw = (0, _piTools.createOpenClawCodingTools)({
      exec: {
        ...(0, _utils2.resolveExecToolDefaults)(params.config),
        elevated: params.bashElevated
      },
      sandbox,
      messageProvider: params.messageChannel ?? params.messageProvider,
      agentAccountId: params.agentAccountId,
      sessionKey: params.sessionKey ?? params.sessionId,
      groupId: params.groupId,
      groupChannel: params.groupChannel,
      groupSpace: params.groupSpace,
      spawnedBy: params.spawnedBy,
      agentDir,
      workspaceDir: effectiveWorkspace,
      config: params.config,
      abortSignal: runAbortController.signal,
      modelProvider: model.provider,
      modelId,
      modelAuthMode: (0, _modelAuth.resolveModelAuthMode)(model.provider, params.config)
    });
    const tools = (0, _google.sanitizeToolsForGoogle)({ tools: toolsRaw, provider });
    (0, _google.logToolSchemasForGoogle)({ tools, provider });
    const machineName = await (0, _machineName.getMachineDisplayName)();
    const runtimeChannel = (0, _messageChannel.normalizeMessageChannel)(params.messageChannel ?? params.messageProvider);
    let runtimeCapabilities = runtimeChannel ?
    (0, _channelCapabilities.resolveChannelCapabilities)({
      cfg: params.config,
      channel: runtimeChannel,
      accountId: params.agentAccountId
    }) ?? [] :
    undefined;
    if (runtimeChannel === "telegram" && params.config) {
      const inlineButtonsScope = (0, _inlineButtons.resolveTelegramInlineButtonsScope)({
        cfg: params.config,
        accountId: params.agentAccountId ?? undefined
      });
      if (inlineButtonsScope !== "off") {
        if (!runtimeCapabilities) {
          runtimeCapabilities = [];
        }
        if (!runtimeCapabilities.some((cap) => String(cap).trim().toLowerCase() === "inlinebuttons")) {
          runtimeCapabilities.push("inlineButtons");
        }
      }
    }
    const reactionGuidance = runtimeChannel && params.config ?
    (() => {
      if (runtimeChannel === "telegram") {
        const resolved = (0, _reactionLevel2.resolveTelegramReactionLevel)({
          cfg: params.config,
          accountId: params.agentAccountId ?? undefined
        });
        const level = resolved.agentReactionGuidance;
        return level ? { level, channel: "Telegram" } : undefined;
      }
      if (runtimeChannel === "signal") {
        const resolved = (0, _reactionLevel.resolveSignalReactionLevel)({
          cfg: params.config,
          accountId: params.agentAccountId ?? undefined
        });
        const level = resolved.agentReactionGuidance;
        return level ? { level, channel: "Signal" } : undefined;
      }
      return undefined;
    })() :
    undefined;
    // Resolve channel-specific message actions for system prompt
    const channelActions = runtimeChannel ?
    (0, _channelTools.listChannelSupportedActions)({
      cfg: params.config,
      channel: runtimeChannel
    }) :
    undefined;
    const messageToolHints = runtimeChannel ?
    (0, _channelTools.resolveChannelMessageToolHints)({
      cfg: params.config,
      channel: runtimeChannel,
      accountId: params.agentAccountId
    }) :
    undefined;
    const runtimeInfo = {
      host: machineName,
      os: `${_nodeOs.default.type()} ${_nodeOs.default.release()}`,
      arch: _nodeOs.default.arch(),
      node: process.version,
      model: `${provider}/${modelId}`,
      channel: runtimeChannel,
      capabilities: runtimeCapabilities,
      channelActions
    };
    const sandboxInfo = (0, _sandboxInfo.buildEmbeddedSandboxInfo)(sandbox, params.bashElevated);
    const reasoningTagHint = (0, _providerUtils.isReasoningTagProvider)(provider);
    const userTimezone = (0, _dateTime.resolveUserTimezone)(params.config?.agents?.defaults?.userTimezone);
    const userTimeFormat = (0, _dateTime.resolveUserTimeFormat)(params.config?.agents?.defaults?.timeFormat);
    const userTime = (0, _dateTime.formatUserTime)(new Date(), userTimezone, userTimeFormat);
    const { defaultAgentId, sessionAgentId } = (0, _agentScope.resolveSessionAgentIds)({
      sessionKey: params.sessionKey,
      config: params.config
    });
    const isDefaultAgent = sessionAgentId === defaultAgentId;
    const promptMode = (0, _sessionKey.isSubagentSessionKey)(params.sessionKey) ? "minimal" : "full";
    const docsPath = await (0, _docsPath.resolveOpenClawDocsPath)({
      workspaceDir: effectiveWorkspace,
      argv1: process.argv[1],
      cwd: process.cwd(),
      moduleUrl: "file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/agents/pi-embedded-runner/compact.js"
    });
    const ttsHint = params.config ? (0, _tts.buildTtsSystemPromptHint)(params.config) : undefined;
    const appendPrompt = (0, _systemPrompt.buildEmbeddedSystemPrompt)({
      workspaceDir: effectiveWorkspace,
      defaultThinkLevel: params.thinkLevel,
      reasoningLevel: params.reasoningLevel ?? "off",
      extraSystemPrompt: params.extraSystemPrompt,
      ownerNumbers: params.ownerNumbers,
      reasoningTagHint,
      heartbeatPrompt: isDefaultAgent ?
      (0, _heartbeat.resolveHeartbeatPrompt)(params.config?.agents?.defaults?.heartbeat?.prompt) :
      undefined,
      skillsPrompt,
      docsPath: docsPath ?? undefined,
      ttsHint,
      promptMode,
      runtimeInfo,
      reactionGuidance,
      messageToolHints,
      sandboxInfo,
      tools,
      modelAliasLines: (0, _model.buildModelAliasLines)(params.config),
      userTimezone,
      userTime,
      userTimeFormat,
      contextFiles
    });
    const systemPromptOverride = (0, _systemPrompt.createSystemPromptOverride)(appendPrompt);
    const sessionLock = await (0, _sessionWriteLock.acquireSessionWriteLock)({
      sessionFile: params.sessionFile
    });
    try {
      await (0, _sessionManagerCache.prewarmSessionFile)(params.sessionFile);
      const transcriptPolicy = (0, _transcriptPolicy.resolveTranscriptPolicy)({
        modelApi: model.api,
        provider,
        modelId
      });
      const sessionManager = (0, _sessionToolResultGuardWrapper.guardSessionManager)(_piCodingAgent.SessionManager.open(params.sessionFile), {
        agentId: sessionAgentId,
        sessionKey: params.sessionKey,
        allowSyntheticToolResults: transcriptPolicy.allowSyntheticToolResults
      });
      (0, _sessionManagerCache.trackSessionManagerAccess)(params.sessionFile);
      const settingsManager = _piCodingAgent.SettingsManager.create(effectiveWorkspace, agentDir);
      (0, _piSettings.ensurePiCompactionReserveTokens)({
        settingsManager,
        minReserveTokens: (0, _piSettings.resolveCompactionReserveTokensFloor)(params.config)
      });
      // Call for side effects (sets compaction/pruning runtime state)
      (0, _extensions.buildEmbeddedExtensionPaths)({
        cfg: params.config,
        sessionManager,
        provider,
        modelId,
        model
      });
      const { builtInTools, customTools } = (0, _toolSplit.splitSdkTools)({
        tools,
        sandboxEnabled: !!sandbox?.enabled
      });
      const { session } = await (0, _piCodingAgent.createAgentSession)({
        cwd: resolvedWorkspace,
        agentDir,
        authStorage,
        modelRegistry,
        model,
        thinkingLevel: (0, _utils2.mapThinkingLevel)(params.thinkLevel),
        tools: builtInTools,
        customTools,
        sessionManager,
        settingsManager
      });
      (0, _systemPrompt.applySystemPromptOverrideToSession)(session, systemPromptOverride());
      try {
        const prior = await (0, _google.sanitizeSessionHistory)({
          messages: session.messages,
          modelApi: model.api,
          modelId,
          provider,
          sessionManager,
          sessionId: params.sessionId,
          policy: transcriptPolicy
        });
        const validatedGemini = transcriptPolicy.validateGeminiTurns ?
        (0, _piEmbeddedHelpers.validateGeminiTurns)(prior) :
        prior;
        const validated = transcriptPolicy.validateAnthropicTurns ?
        (0, _piEmbeddedHelpers.validateAnthropicTurns)(validatedGemini) :
        validatedGemini;
        const limited = (0, _history.limitHistoryTurns)(validated, (0, _history.getDmHistoryLimitFromSessionKey)(params.sessionKey, params.config));
        if (limited.length > 0) {
          session.agent.replaceMessages(limited);
        }
        const result = await session.compact(params.customInstructions);
        // Estimate tokens after compaction by summing token estimates for remaining messages
        let tokensAfter;
        try {
          tokensAfter = 0;
          for (const message of session.messages) {
            tokensAfter += (0, _piCodingAgent.estimateTokens)(message);
          }
          // Sanity check: tokensAfter should be less than tokensBefore
          if (tokensAfter > result.tokensBefore) {
            tokensAfter = undefined; // Don't trust the estimate
          }
        }
        catch {
          // If estimation fails, leave tokensAfter undefined
          tokensAfter = undefined;
        }
        return {
          ok: true,
          compacted: true,
          result: {
            summary: result.summary,
            firstKeptEntryId: result.firstKeptEntryId,
            tokensBefore: result.tokensBefore,
            tokensAfter,
            details: result.details
          }
        };
      } finally
      {
        sessionManager.flushPendingToolResults?.();
        session.dispose();
      }
    } finally
    {
      await sessionLock.release();
    }
  }
  catch (err) {
    return {
      ok: false,
      compacted: false,
      reason: (0, _utils2.describeUnknownError)(err)
    };
  } finally
  {
    restoreSkillEnv?.();
    process.chdir(prevCwd);
  }
}
/**
 * Compacts a session with lane queueing (session lane + global lane).
 * Use this from outside a lane context. If already inside a lane, use
 * `compactEmbeddedPiSessionDirect` to avoid deadlocks.
 */
async function compactEmbeddedPiSession(params) {
  const sessionLane = (0, _lanes.resolveSessionLane)(params.sessionKey?.trim() || params.sessionId);
  const globalLane = (0, _lanes.resolveGlobalLane)(params.lane);
  const enqueueGlobal = params.enqueue ?? ((task, opts) => (0, _commandQueue.enqueueCommandInLane)(globalLane, task, opts));
  return (0, _commandQueue.enqueueCommandInLane)(sessionLane, () => enqueueGlobal(async () => compactEmbeddedPiSessionDirect(params)));
} /* v9-0bca496bc28c8347 */
