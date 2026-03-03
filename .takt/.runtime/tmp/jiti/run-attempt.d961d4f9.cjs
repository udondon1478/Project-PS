"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.injectHistoryImagesIntoMessages = injectHistoryImagesIntoMessages;exports.runEmbeddedAttempt = runEmbeddedAttempt;var _piAi = require("@mariozechner/pi-ai");
var _piCodingAgent = require("@mariozechner/pi-coding-agent");
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodeOs = _interopRequireDefault(require("node:os"));
var _heartbeat = require("../../../auto-reply/heartbeat.js");
var _channelCapabilities = require("../../../config/channel-capabilities.js");
var _machineName = require("../../../infra/machine-name.js");
var _constants = require("../../../media/constants.js");
var _hookRunnerGlobal = require("../../../plugins/hook-runner-global.js");
var _sessionKey = require("../../../routing/session-key.js");
var _reactionLevel = require("../../../signal/reaction-level.js");
var _inlineButtons = require("../../../telegram/inline-buttons.js");
var _reactionLevel2 = require("../../../telegram/reaction-level.js");
var _tts = require("../../../tts/tts.js");
var _utils = require("../../../utils.js");
var _messageChannel = require("../../../utils/message-channel.js");
var _providerUtils = require("../../../utils/provider-utils.js");
var _agentPaths = require("../../agent-paths.js");
var _agentScope = require("../../agent-scope.js");
var _anthropicPayloadLog = require("../../anthropic-payload-log.js");
var _bootstrapFiles = require("../../bootstrap-files.js");
var _cacheTrace = require("../../cache-trace.js");
var _channelTools = require("../../channel-tools.js");
var _docsPath = require("../../docs-path.js");
var _failoverError = require("../../failover-error.js");
var _modelAuth = require("../../model-auth.js");
var _modelSelection = require("../../model-selection.js");
var _piEmbeddedHelpers = require("../../pi-embedded-helpers.js");
var _piEmbeddedSubscribe = require("../../pi-embedded-subscribe.js");
var _piSettings = require("../../pi-settings.js");
var _piToolDefinitionAdapter = require("../../pi-tool-definition-adapter.js");
var _piTools = require("../../pi-tools.js");
var _sandbox = require("../../sandbox.js");
var _runtimeStatus = require("../../sandbox/runtime-status.js");
var _sessionToolResultGuardWrapper = require("../../session-tool-result-guard-wrapper.js");
var _sessionWriteLock = require("../../session-write-lock.js");
var _skills = require("../../skills.js");
var _systemPromptParams = require("../../system-prompt-params.js");
var _systemPromptReport = require("../../system-prompt-report.js");
var _transcriptPolicy = require("../../transcript-policy.js");
var _workspace = require("../../workspace.js");
var _abort = require("../abort.js");
var _cacheTtl = require("../cache-ttl.js");
var _extensions = require("../extensions.js");
var _extraParams = require("../extra-params.js");
var _google = require("../google.js");
var _history = require("../history.js");
var _logger = require("../logger.js");
var _model = require("../model.js");
var _runs = require("../runs.js");
var _sandboxInfo = require("../sandbox-info.js");
var _sessionManagerCache = require("../session-manager-cache.js");
var _sessionManagerInit = require("../session-manager-init.js");
var _systemPrompt = require("../system-prompt.js");
var _toolSplit = require("../tool-split.js");
var _utils2 = require("../utils.js");
var _images = require("./images.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function injectHistoryImagesIntoMessages(messages, historyImagesByIndex) {
  if (historyImagesByIndex.size === 0) {
    return false;
  }
  let didMutate = false;
  for (const [msgIndex, images] of historyImagesByIndex) {
    // Bounds check: ensure index is valid before accessing
    if (msgIndex < 0 || msgIndex >= messages.length) {
      continue;
    }
    const msg = messages[msgIndex];
    if (msg && msg.role === "user") {
      // Convert string content to array format if needed
      if (typeof msg.content === "string") {
        msg.content = [{ type: "text", text: msg.content }];
        didMutate = true;
      }
      if (Array.isArray(msg.content)) {
        // Check for existing image content to avoid duplicates across turns
        const existingImageData = new Set(msg.content.
        filter((c) => c != null &&
        typeof c === "object" &&
        c.type === "image" &&
        typeof c.data === "string").
        map((c) => c.data));
        for (const img of images) {
          // Only add if this image isn't already in the message
          if (!existingImageData.has(img.data)) {
            msg.content.push(img);
            didMutate = true;
          }
        }
      }
    }
  }
  return didMutate;
}
async function runEmbeddedAttempt(params) {
  const resolvedWorkspace = (0, _utils.resolveUserPath)(params.workspaceDir);
  const prevCwd = process.cwd();
  const runAbortController = new AbortController();
  _logger.log.debug(`embedded run start: runId=${params.runId} sessionId=${params.sessionId} provider=${params.provider} model=${params.modelId} thinking=${params.thinkLevel} messageChannel=${params.messageChannel ?? params.messageProvider ?? "unknown"}`);
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
    const { bootstrapFiles: hookAdjustedBootstrapFiles, contextFiles } = await (0, _bootstrapFiles.resolveBootstrapContextForRun)({
      workspaceDir: effectiveWorkspace,
      config: params.config,
      sessionKey: params.sessionKey,
      sessionId: params.sessionId,
      warn: (0, _bootstrapFiles.makeBootstrapWarn)({ sessionLabel, warn: (message) => _logger.log.warn(message) })
    });
    const workspaceNotes = hookAdjustedBootstrapFiles.some((file) => file.name === _workspace.DEFAULT_BOOTSTRAP_FILENAME && !file.missing) ?
    ["Reminder: commit your changes in this workspace after edits."] :
    undefined;
    const agentDir = params.agentDir ?? (0, _agentPaths.resolveOpenClawAgentDir)();
    // Check if the model supports native image input
    const modelHasVision = params.model.input?.includes("image") ?? false;
    const toolsRaw = params.disableTools ?
    [] :
    (0, _piTools.createOpenClawCodingTools)({
      exec: {
        ...params.execOverrides,
        elevated: params.bashElevated
      },
      sandbox,
      messageProvider: params.messageChannel ?? params.messageProvider,
      agentAccountId: params.agentAccountId,
      messageTo: params.messageTo,
      messageThreadId: params.messageThreadId,
      groupId: params.groupId,
      groupChannel: params.groupChannel,
      groupSpace: params.groupSpace,
      spawnedBy: params.spawnedBy,
      senderId: params.senderId,
      senderName: params.senderName,
      senderUsername: params.senderUsername,
      senderE164: params.senderE164,
      sessionKey: params.sessionKey ?? params.sessionId,
      agentDir,
      workspaceDir: effectiveWorkspace,
      config: params.config,
      abortSignal: runAbortController.signal,
      modelProvider: params.model.provider,
      modelId: params.modelId,
      modelAuthMode: (0, _modelAuth.resolveModelAuthMode)(params.model.provider, params.config),
      currentChannelId: params.currentChannelId,
      currentThreadTs: params.currentThreadTs,
      replyToMode: params.replyToMode,
      hasRepliedRef: params.hasRepliedRef,
      modelHasVision
    });
    const tools = (0, _google.sanitizeToolsForGoogle)({ tools: toolsRaw, provider: params.provider });
    (0, _google.logToolSchemasForGoogle)({ tools, provider: params.provider });
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
    const { defaultAgentId, sessionAgentId } = (0, _agentScope.resolveSessionAgentIds)({
      sessionKey: params.sessionKey,
      config: params.config
    });
    const sandboxInfo = (0, _sandboxInfo.buildEmbeddedSandboxInfo)(sandbox, params.bashElevated);
    const reasoningTagHint = (0, _providerUtils.isReasoningTagProvider)(params.provider);
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
    const defaultModelRef = (0, _modelSelection.resolveDefaultModelForAgent)({
      cfg: params.config ?? {},
      agentId: sessionAgentId
    });
    const defaultModelLabel = `${defaultModelRef.provider}/${defaultModelRef.model}`;
    const { runtimeInfo, userTimezone, userTime, userTimeFormat } = (0, _systemPromptParams.buildSystemPromptParams)({
      config: params.config,
      agentId: sessionAgentId,
      workspaceDir: effectiveWorkspace,
      cwd: process.cwd(),
      runtime: {
        host: machineName,
        os: `${_nodeOs.default.type()} ${_nodeOs.default.release()}`,
        arch: _nodeOs.default.arch(),
        node: process.version,
        model: `${params.provider}/${params.modelId}`,
        defaultModel: defaultModelLabel,
        channel: runtimeChannel,
        capabilities: runtimeCapabilities,
        channelActions
      }
    });
    const isDefaultAgent = sessionAgentId === defaultAgentId;
    const promptMode = (0, _sessionKey.isSubagentSessionKey)(params.sessionKey) ? "minimal" : "full";
    const docsPath = await (0, _docsPath.resolveOpenClawDocsPath)({
      workspaceDir: effectiveWorkspace,
      argv1: process.argv[1],
      cwd: process.cwd(),
      moduleUrl: "file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/agents/pi-embedded-runner/run/attempt.js"
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
      workspaceNotes,
      reactionGuidance,
      promptMode,
      runtimeInfo,
      messageToolHints,
      sandboxInfo,
      tools,
      modelAliasLines: (0, _model.buildModelAliasLines)(params.config),
      userTimezone,
      userTime,
      userTimeFormat,
      contextFiles
    });
    const systemPromptReport = (0, _systemPromptReport.buildSystemPromptReport)({
      source: "run",
      generatedAt: Date.now(),
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
      provider: params.provider,
      model: params.modelId,
      workspaceDir: effectiveWorkspace,
      bootstrapMaxChars: (0, _piEmbeddedHelpers.resolveBootstrapMaxChars)(params.config),
      sandbox: (() => {
        const runtime = (0, _runtimeStatus.resolveSandboxRuntimeStatus)({
          cfg: params.config,
          sessionKey: params.sessionKey ?? params.sessionId
        });
        return { mode: runtime.mode, sandboxed: runtime.sandboxed };
      })(),
      systemPrompt: appendPrompt,
      bootstrapFiles: hookAdjustedBootstrapFiles,
      injectedFiles: contextFiles,
      skillsPrompt,
      tools
    });
    const systemPromptOverride = (0, _systemPrompt.createSystemPromptOverride)(appendPrompt);
    const systemPromptText = systemPromptOverride();
    const sessionLock = await (0, _sessionWriteLock.acquireSessionWriteLock)({
      sessionFile: params.sessionFile
    });
    let sessionManager;
    let session;
    try {
      const hadSessionFile = await _promises.default.
      stat(params.sessionFile).
      then(() => true).
      catch(() => false);
      const transcriptPolicy = (0, _transcriptPolicy.resolveTranscriptPolicy)({
        modelApi: params.model?.api,
        provider: params.provider,
        modelId: params.modelId
      });
      await (0, _sessionManagerCache.prewarmSessionFile)(params.sessionFile);
      sessionManager = (0, _sessionToolResultGuardWrapper.guardSessionManager)(_piCodingAgent.SessionManager.open(params.sessionFile), {
        agentId: sessionAgentId,
        sessionKey: params.sessionKey,
        allowSyntheticToolResults: transcriptPolicy.allowSyntheticToolResults
      });
      (0, _sessionManagerCache.trackSessionManagerAccess)(params.sessionFile);
      await (0, _sessionManagerInit.prepareSessionManagerForRun)({
        sessionManager,
        sessionFile: params.sessionFile,
        hadSessionFile,
        sessionId: params.sessionId,
        cwd: effectiveWorkspace
      });
      const settingsManager = _piCodingAgent.SettingsManager.create(effectiveWorkspace, agentDir);
      (0, _piSettings.ensurePiCompactionReserveTokens)({
        settingsManager,
        minReserveTokens: (0, _piSettings.resolveCompactionReserveTokensFloor)(params.config)
      });
      // Call for side effects (sets compaction/pruning runtime state)
      (0, _extensions.buildEmbeddedExtensionPaths)({
        cfg: params.config,
        sessionManager,
        provider: params.provider,
        modelId: params.modelId,
        model: params.model
      });
      const { builtInTools, customTools } = (0, _toolSplit.splitSdkTools)({
        tools,
        sandboxEnabled: !!sandbox?.enabled
      });
      // Add client tools (OpenResponses hosted tools) to customTools
      let clientToolCallDetected = null;
      const clientToolDefs = params.clientTools ?
      (0, _piToolDefinitionAdapter.toClientToolDefinitions)(params.clientTools, (toolName, toolParams) => {
        clientToolCallDetected = { name: toolName, params: toolParams };
      }, {
        agentId: sessionAgentId,
        sessionKey: params.sessionKey
      }) :
      [];
      const allCustomTools = [...customTools, ...clientToolDefs];
      ({ session } = await (0, _piCodingAgent.createAgentSession)({
        cwd: resolvedWorkspace,
        agentDir,
        authStorage: params.authStorage,
        modelRegistry: params.modelRegistry,
        model: params.model,
        thinkingLevel: (0, _utils2.mapThinkingLevel)(params.thinkLevel),
        tools: builtInTools,
        customTools: allCustomTools,
        sessionManager,
        settingsManager
      }));
      (0, _systemPrompt.applySystemPromptOverrideToSession)(session, systemPromptText);
      if (!session) {
        throw new Error("Embedded agent session missing");
      }
      const activeSession = session;
      const cacheTrace = (0, _cacheTrace.createCacheTrace)({
        cfg: params.config,
        env: process.env,
        runId: params.runId,
        sessionId: activeSession.sessionId,
        sessionKey: params.sessionKey,
        provider: params.provider,
        modelId: params.modelId,
        modelApi: params.model.api,
        workspaceDir: params.workspaceDir
      });
      const anthropicPayloadLogger = (0, _anthropicPayloadLog.createAnthropicPayloadLogger)({
        env: process.env,
        runId: params.runId,
        sessionId: activeSession.sessionId,
        sessionKey: params.sessionKey,
        provider: params.provider,
        modelId: params.modelId,
        modelApi: params.model.api,
        workspaceDir: params.workspaceDir
      });
      // Force a stable streamFn reference so vitest can reliably mock @mariozechner/pi-ai.
      activeSession.agent.streamFn = _piAi.streamSimple;
      (0, _extraParams.applyExtraParamsToAgent)(activeSession.agent, params.config, params.provider, params.modelId, params.streamParams);
      if (cacheTrace) {
        cacheTrace.recordStage("session:loaded", {
          messages: activeSession.messages,
          system: systemPromptText,
          note: "after session create"
        });
        activeSession.agent.streamFn = cacheTrace.wrapStreamFn(activeSession.agent.streamFn);
      }
      if (anthropicPayloadLogger) {
        activeSession.agent.streamFn = anthropicPayloadLogger.wrapStreamFn(activeSession.agent.streamFn);
      }
      try {
        const prior = await (0, _google.sanitizeSessionHistory)({
          messages: activeSession.messages,
          modelApi: params.model.api,
          modelId: params.modelId,
          provider: params.provider,
          sessionManager,
          sessionId: params.sessionId,
          policy: transcriptPolicy
        });
        cacheTrace?.recordStage("session:sanitized", { messages: prior });
        const validatedGemini = transcriptPolicy.validateGeminiTurns ?
        (0, _piEmbeddedHelpers.validateGeminiTurns)(prior) :
        prior;
        const validated = transcriptPolicy.validateAnthropicTurns ?
        (0, _piEmbeddedHelpers.validateAnthropicTurns)(validatedGemini) :
        validatedGemini;
        const limited = (0, _history.limitHistoryTurns)(validated, (0, _history.getDmHistoryLimitFromSessionKey)(params.sessionKey, params.config));
        cacheTrace?.recordStage("session:limited", { messages: limited });
        if (limited.length > 0) {
          activeSession.agent.replaceMessages(limited);
        }
      }
      catch (err) {
        sessionManager.flushPendingToolResults?.();
        activeSession.dispose();
        throw err;
      }
      let aborted = Boolean(params.abortSignal?.aborted);
      let timedOut = false;
      const getAbortReason = (signal) => "reason" in signal ? signal.reason : undefined;
      const makeTimeoutAbortReason = () => {
        const err = new Error("request timed out");
        err.name = "TimeoutError";
        return err;
      };
      const makeAbortError = (signal) => {
        const reason = getAbortReason(signal);
        const err = reason ? new Error("aborted", { cause: reason }) : new Error("aborted");
        err.name = "AbortError";
        return err;
      };
      const abortRun = (isTimeout = false, reason) => {
        aborted = true;
        if (isTimeout) {
          timedOut = true;
        }
        if (isTimeout) {
          runAbortController.abort(reason ?? makeTimeoutAbortReason());
        } else
        {
          runAbortController.abort(reason);
        }
        void activeSession.abort();
      };
      const abortable = (promise) => {
        const signal = runAbortController.signal;
        if (signal.aborted) {
          return Promise.reject(makeAbortError(signal));
        }
        return new Promise((resolve, reject) => {
          const onAbort = () => {
            signal.removeEventListener("abort", onAbort);
            reject(makeAbortError(signal));
          };
          signal.addEventListener("abort", onAbort, { once: true });
          promise.then((value) => {
            signal.removeEventListener("abort", onAbort);
            resolve(value);
          }, (err) => {
            signal.removeEventListener("abort", onAbort);
            reject(err);
          });
        });
      };
      const subscription = (0, _piEmbeddedSubscribe.subscribeEmbeddedPiSession)({
        session: activeSession,
        runId: params.runId,
        verboseLevel: params.verboseLevel,
        reasoningMode: params.reasoningLevel ?? "off",
        toolResultFormat: params.toolResultFormat,
        shouldEmitToolResult: params.shouldEmitToolResult,
        shouldEmitToolOutput: params.shouldEmitToolOutput,
        onToolResult: params.onToolResult,
        onReasoningStream: params.onReasoningStream,
        onBlockReply: params.onBlockReply,
        onBlockReplyFlush: params.onBlockReplyFlush,
        blockReplyBreak: params.blockReplyBreak,
        blockReplyChunking: params.blockReplyChunking,
        onPartialReply: params.onPartialReply,
        onAssistantMessageStart: params.onAssistantMessageStart,
        onAgentEvent: params.onAgentEvent,
        enforceFinalTag: params.enforceFinalTag
      });
      const { assistantTexts, toolMetas, unsubscribe, waitForCompactionRetry, getMessagingToolSentTexts, getMessagingToolSentTargets, didSendViaMessagingTool, getLastToolError } = subscription;
      const queueHandle = {
        queueMessage: async (text) => {
          await activeSession.steer(text);
        },
        isStreaming: () => activeSession.isStreaming,
        isCompacting: () => subscription.isCompacting(),
        abort: abortRun
      };
      (0, _runs.setActiveEmbeddedRun)(params.sessionId, queueHandle);
      let abortWarnTimer;
      const isProbeSession = params.sessionId?.startsWith("probe-") ?? false;
      const abortTimer = setTimeout(() => {
        if (!isProbeSession) {
          _logger.log.warn(`embedded run timeout: runId=${params.runId} sessionId=${params.sessionId} timeoutMs=${params.timeoutMs}`);
        }
        abortRun(true);
        if (!abortWarnTimer) {
          abortWarnTimer = setTimeout(() => {
            if (!activeSession.isStreaming) {
              return;
            }
            if (!isProbeSession) {
              _logger.log.warn(`embedded run abort still streaming: runId=${params.runId} sessionId=${params.sessionId}`);
            }
          }, 10_000);
        }
      }, Math.max(1, params.timeoutMs));
      let messagesSnapshot = [];
      let sessionIdUsed = activeSession.sessionId;
      const onAbort = () => {
        const reason = params.abortSignal ? getAbortReason(params.abortSignal) : undefined;
        const timeout = reason ? (0, _failoverError.isTimeoutError)(reason) : false;
        abortRun(timeout, reason);
      };
      if (params.abortSignal) {
        if (params.abortSignal.aborted) {
          onAbort();
        } else
        {
          params.abortSignal.addEventListener("abort", onAbort, {
            once: true
          });
        }
      }
      // Get hook runner once for both before_agent_start and agent_end hooks
      const hookRunner = (0, _hookRunnerGlobal.getGlobalHookRunner)();
      let promptError = null;
      try {
        const promptStartedAt = Date.now();
        // Run before_agent_start hooks to allow plugins to inject context
        let effectivePrompt = params.prompt;
        if (hookRunner?.hasHooks("before_agent_start")) {
          try {
            const hookResult = await hookRunner.runBeforeAgentStart({
              prompt: params.prompt,
              messages: activeSession.messages
            }, {
              agentId: params.sessionKey?.split(":")[0] ?? "main",
              sessionKey: params.sessionKey,
              workspaceDir: params.workspaceDir,
              messageProvider: params.messageProvider ?? undefined
            });
            if (hookResult?.prependContext) {
              effectivePrompt = `${hookResult.prependContext}\n\n${params.prompt}`;
              _logger.log.debug(`hooks: prepended context to prompt (${hookResult.prependContext.length} chars)`);
            }
          }
          catch (hookErr) {
            _logger.log.warn(`before_agent_start hook failed: ${String(hookErr)}`);
          }
        }
        _logger.log.debug(`embedded run prompt start: runId=${params.runId} sessionId=${params.sessionId}`);
        cacheTrace?.recordStage("prompt:before", {
          prompt: effectivePrompt,
          messages: activeSession.messages
        });
        // Repair orphaned trailing user messages so new prompts don't violate role ordering.
        const leafEntry = sessionManager.getLeafEntry();
        if (leafEntry?.type === "message" && leafEntry.message.role === "user") {
          if (leafEntry.parentId) {
            sessionManager.branch(leafEntry.parentId);
          } else
          {
            sessionManager.resetLeaf();
          }
          const sessionContext = sessionManager.buildSessionContext();
          activeSession.agent.replaceMessages(sessionContext.messages);
          _logger.log.warn(`Removed orphaned user message to prevent consecutive user turns. ` +
          `runId=${params.runId} sessionId=${params.sessionId}`);
        }
        try {
          // Detect and load images referenced in the prompt for vision-capable models.
          // This eliminates the need for an explicit "view" tool call by injecting
          // images directly into the prompt when the model supports it.
          // Also scans conversation history to enable follow-up questions about earlier images.
          const imageResult = await (0, _images.detectAndLoadPromptImages)({
            prompt: effectivePrompt,
            workspaceDir: effectiveWorkspace,
            model: params.model,
            existingImages: params.images,
            historyMessages: activeSession.messages,
            maxBytes: _constants.MAX_IMAGE_BYTES,
            // Enforce sandbox path restrictions when sandbox is enabled
            sandboxRoot: sandbox?.enabled ? sandbox.workspaceDir : undefined
          });
          // Inject history images into their original message positions.
          // This ensures the model sees images in context (e.g., "compare to the first image").
          const didMutate = injectHistoryImagesIntoMessages(activeSession.messages, imageResult.historyImagesByIndex);
          if (didMutate) {
            // Persist message mutations (e.g., injected history images) so we don't re-scan/reload.
            activeSession.agent.replaceMessages(activeSession.messages);
          }
          cacheTrace?.recordStage("prompt:images", {
            prompt: effectivePrompt,
            messages: activeSession.messages,
            note: `images: prompt=${imageResult.images.length} history=${imageResult.historyImagesByIndex.size}`
          });
          const shouldTrackCacheTtl = params.config?.agents?.defaults?.contextPruning?.mode === "cache-ttl" &&
          (0, _cacheTtl.isCacheTtlEligibleProvider)(params.provider, params.modelId);
          if (shouldTrackCacheTtl) {
            (0, _cacheTtl.appendCacheTtlTimestamp)(sessionManager, {
              timestamp: Date.now(),
              provider: params.provider,
              modelId: params.modelId
            });
          }
          // Only pass images option if there are actually images to pass
          // This avoids potential issues with models that don't expect the images parameter
          if (imageResult.images.length > 0) {
            await abortable(activeSession.prompt(effectivePrompt, { images: imageResult.images }));
          } else
          {
            await abortable(activeSession.prompt(effectivePrompt));
          }
        }
        catch (err) {
          promptError = err;
        } finally
        {
          _logger.log.debug(`embedded run prompt end: runId=${params.runId} sessionId=${params.sessionId} durationMs=${Date.now() - promptStartedAt}`);
        }
        try {
          await waitForCompactionRetry();
        }
        catch (err) {
          if ((0, _abort.isAbortError)(err)) {
            if (!promptError) {
              promptError = err;
            }
          } else
          {
            throw err;
          }
        }
        messagesSnapshot = activeSession.messages.slice();
        sessionIdUsed = activeSession.sessionId;
        cacheTrace?.recordStage("session:after", {
          messages: messagesSnapshot,
          note: promptError ? "prompt error" : undefined
        });
        anthropicPayloadLogger?.recordUsage(messagesSnapshot, promptError);
        // Run agent_end hooks to allow plugins to analyze the conversation
        // This is fire-and-forget, so we don't await
        if (hookRunner?.hasHooks("agent_end")) {
          hookRunner.
          runAgentEnd({
            messages: messagesSnapshot,
            success: !aborted && !promptError,
            error: promptError ? (0, _utils2.describeUnknownError)(promptError) : undefined,
            durationMs: Date.now() - promptStartedAt
          }, {
            agentId: params.sessionKey?.split(":")[0] ?? "main",
            sessionKey: params.sessionKey,
            workspaceDir: params.workspaceDir,
            messageProvider: params.messageProvider ?? undefined
          }).
          catch((err) => {
            _logger.log.warn(`agent_end hook failed: ${err}`);
          });
        }
      } finally
      {
        clearTimeout(abortTimer);
        if (abortWarnTimer) {
          clearTimeout(abortWarnTimer);
        }
        unsubscribe();
        (0, _runs.clearActiveEmbeddedRun)(params.sessionId, queueHandle);
        params.abortSignal?.removeEventListener?.("abort", onAbort);
      }
      const lastAssistant = messagesSnapshot.
      slice().
      toReversed().
      find((m) => m.role === "assistant");
      const toolMetasNormalized = toolMetas.
      filter((entry) => typeof entry.toolName === "string" && entry.toolName.trim().length > 0).
      map((entry) => ({ toolName: entry.toolName, meta: entry.meta }));
      return {
        aborted,
        timedOut,
        promptError,
        sessionIdUsed,
        systemPromptReport,
        messagesSnapshot,
        assistantTexts,
        toolMetas: toolMetasNormalized,
        lastAssistant,
        lastToolError: getLastToolError?.(),
        didSendViaMessagingTool: didSendViaMessagingTool(),
        messagingToolSentTexts: getMessagingToolSentTexts(),
        messagingToolSentTargets: getMessagingToolSentTargets(),
        cloudCodeAssistFormatError: Boolean(lastAssistant?.errorMessage && (0, _piEmbeddedHelpers.isCloudCodeAssistFormatError)(lastAssistant.errorMessage)),
        // Client tool call detected (OpenResponses hosted tools)
        clientToolCall: clientToolCallDetected ?? undefined
      };
    } finally
    {
      // Always tear down the session (and release the lock) before we leave this attempt.
      sessionManager?.flushPendingToolResults?.();
      session?.dispose();
      await sessionLock.release();
    }
  } finally
  {
    restoreSkillEnv?.();
    process.chdir(prevCwd);
  }
} /* v9-28182bd4d1a9fdcf */
