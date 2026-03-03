"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.runEmbeddedPiAgent = runEmbeddedPiAgent;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _commandQueue = require("../../process/command-queue.js");
var _utils = require("../../utils.js");
var _messageChannel = require("../../utils/message-channel.js");
var _agentPaths = require("../agent-paths.js");
var _authProfiles = require("../auth-profiles.js");
var _contextWindowGuard = require("../context-window-guard.js");
var _defaults = require("../defaults.js");
var _failoverError = require("../failover-error.js");
var _modelAuth = require("../model-auth.js");
var _modelSelection = require("../model-selection.js");
var _modelsConfig = require("../models-config.js");
var _piEmbeddedHelpers = require("../pi-embedded-helpers.js");
var _usage = require("../usage.js");
var _compact = require("./compact.js");
var _lanes = require("./lanes.js");
var _logger = require("./logger.js");
var _model = require("./model.js");
var _attempt = require("./run/attempt.js");
var _payloads = require("./run/payloads.js");
var _utils2 = require("./utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
// Avoid Anthropic's refusal test token poisoning session transcripts.
const ANTHROPIC_MAGIC_STRING_TRIGGER_REFUSAL = "ANTHROPIC_MAGIC_STRING_TRIGGER_REFUSAL";
const ANTHROPIC_MAGIC_STRING_REPLACEMENT = "ANTHROPIC MAGIC STRING TRIGGER REFUSAL (redacted)";
function scrubAnthropicRefusalMagic(prompt) {
  if (!prompt.includes(ANTHROPIC_MAGIC_STRING_TRIGGER_REFUSAL)) {
    return prompt;
  }
  return prompt.replaceAll(ANTHROPIC_MAGIC_STRING_TRIGGER_REFUSAL, ANTHROPIC_MAGIC_STRING_REPLACEMENT);
}
async function runEmbeddedPiAgent(params) {
  const sessionLane = (0, _lanes.resolveSessionLane)(params.sessionKey?.trim() || params.sessionId);
  const globalLane = (0, _lanes.resolveGlobalLane)(params.lane);
  const enqueueGlobal = params.enqueue ?? ((task, opts) => (0, _commandQueue.enqueueCommandInLane)(globalLane, task, opts));
  const enqueueSession = params.enqueue ?? ((task, opts) => (0, _commandQueue.enqueueCommandInLane)(sessionLane, task, opts));
  const channelHint = params.messageChannel ?? params.messageProvider;
  const resolvedToolResultFormat = params.toolResultFormat ?? (
  channelHint ?
  (0, _messageChannel.isMarkdownCapableMessageChannel)(channelHint) ?
  "markdown" :
  "plain" :
  "markdown");
  const isProbeSession = params.sessionId?.startsWith("probe-") ?? false;
  return enqueueSession(() => enqueueGlobal(async () => {
    const started = Date.now();
    const resolvedWorkspace = (0, _utils.resolveUserPath)(params.workspaceDir);
    const prevCwd = process.cwd();
    const provider = (params.provider ?? _defaults.DEFAULT_PROVIDER).trim() || _defaults.DEFAULT_PROVIDER;
    const modelId = (params.model ?? _defaults.DEFAULT_MODEL).trim() || _defaults.DEFAULT_MODEL;
    const agentDir = params.agentDir ?? (0, _agentPaths.resolveOpenClawAgentDir)();
    const fallbackConfigured = (params.config?.agents?.defaults?.model?.fallbacks?.length ?? 0) > 0;
    await (0, _modelsConfig.ensureOpenClawModelsJson)(params.config, agentDir);
    const { model, error, authStorage, modelRegistry } = (0, _model.resolveModel)(provider, modelId, agentDir, params.config);
    if (!model) {
      throw new Error(error ?? `Unknown model: ${provider}/${modelId}`);
    }
    const ctxInfo = (0, _contextWindowGuard.resolveContextWindowInfo)({
      cfg: params.config,
      provider,
      modelId,
      modelContextWindow: model.contextWindow,
      defaultTokens: _defaults.DEFAULT_CONTEXT_TOKENS
    });
    const ctxGuard = (0, _contextWindowGuard.evaluateContextWindowGuard)({
      info: ctxInfo,
      warnBelowTokens: _contextWindowGuard.CONTEXT_WINDOW_WARN_BELOW_TOKENS,
      hardMinTokens: _contextWindowGuard.CONTEXT_WINDOW_HARD_MIN_TOKENS
    });
    if (ctxGuard.shouldWarn) {
      _logger.log.warn(`low context window: ${provider}/${modelId} ctx=${ctxGuard.tokens} (warn<${_contextWindowGuard.CONTEXT_WINDOW_WARN_BELOW_TOKENS}) source=${ctxGuard.source}`);
    }
    if (ctxGuard.shouldBlock) {
      _logger.log.error(`blocked model (context window too small): ${provider}/${modelId} ctx=${ctxGuard.tokens} (min=${_contextWindowGuard.CONTEXT_WINDOW_HARD_MIN_TOKENS}) source=${ctxGuard.source}`);
      throw new _failoverError.FailoverError(`Model context window too small (${ctxGuard.tokens} tokens). Minimum is ${_contextWindowGuard.CONTEXT_WINDOW_HARD_MIN_TOKENS}.`, { reason: "unknown", provider, model: modelId });
    }
    const authStore = (0, _modelAuth.ensureAuthProfileStore)(agentDir, { allowKeychainPrompt: false });
    const preferredProfileId = params.authProfileId?.trim();
    let lockedProfileId = params.authProfileIdSource === "user" ? preferredProfileId : undefined;
    if (lockedProfileId) {
      const lockedProfile = authStore.profiles[lockedProfileId];
      if (!lockedProfile ||
      (0, _modelSelection.normalizeProviderId)(lockedProfile.provider) !== (0, _modelSelection.normalizeProviderId)(provider)) {
        lockedProfileId = undefined;
      }
    }
    const profileOrder = (0, _modelAuth.resolveAuthProfileOrder)({
      cfg: params.config,
      store: authStore,
      provider,
      preferredProfile: preferredProfileId
    });
    if (lockedProfileId && !profileOrder.includes(lockedProfileId)) {
      throw new Error(`Auth profile "${lockedProfileId}" is not configured for ${provider}.`);
    }
    const profileCandidates = lockedProfileId ?
    [lockedProfileId] :
    profileOrder.length > 0 ?
    profileOrder :
    [undefined];
    let profileIndex = 0;
    const initialThinkLevel = params.thinkLevel ?? "off";
    let thinkLevel = initialThinkLevel;
    const attemptedThinking = new Set();
    let apiKeyInfo = null;
    let lastProfileId;
    const resolveAuthProfileFailoverReason = (params) => {
      if (params.allInCooldown) {
        return "rate_limit";
      }
      const classified = (0, _piEmbeddedHelpers.classifyFailoverReason)(params.message);
      return classified ?? "auth";
    };
    const throwAuthProfileFailover = (params) => {
      const fallbackMessage = `No available auth profile for ${provider} (all in cooldown or unavailable).`;
      const message = params.message?.trim() || (
      params.error ? (0, _utils2.describeUnknownError)(params.error).trim() : "") ||
      fallbackMessage;
      const reason = resolveAuthProfileFailoverReason({
        allInCooldown: params.allInCooldown,
        message
      });
      if (fallbackConfigured) {
        throw new _failoverError.FailoverError(message, {
          reason,
          provider,
          model: modelId,
          status: (0, _failoverError.resolveFailoverStatus)(reason),
          cause: params.error
        });
      }
      if (params.error instanceof Error) {
        throw params.error;
      }
      throw new Error(message);
    };
    const resolveApiKeyForCandidate = async (candidate) => {
      return (0, _modelAuth.getApiKeyForModel)({
        model,
        cfg: params.config,
        profileId: candidate,
        store: authStore,
        agentDir
      });
    };
    const applyApiKeyInfo = async (candidate) => {
      apiKeyInfo = await resolveApiKeyForCandidate(candidate);
      const resolvedProfileId = apiKeyInfo.profileId ?? candidate;
      if (!apiKeyInfo.apiKey) {
        if (apiKeyInfo.mode !== "aws-sdk") {
          throw new Error(`No API key resolved for provider "${model.provider}" (auth mode: ${apiKeyInfo.mode}).`);
        }
        lastProfileId = resolvedProfileId;
        return;
      }
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
      lastProfileId = apiKeyInfo.profileId;
    };
    const advanceAuthProfile = async () => {
      if (lockedProfileId) {
        return false;
      }
      let nextIndex = profileIndex + 1;
      while (nextIndex < profileCandidates.length) {
        const candidate = profileCandidates[nextIndex];
        if (candidate && (0, _authProfiles.isProfileInCooldown)(authStore, candidate)) {
          nextIndex += 1;
          continue;
        }
        try {
          await applyApiKeyInfo(candidate);
          profileIndex = nextIndex;
          thinkLevel = initialThinkLevel;
          attemptedThinking.clear();
          return true;
        }
        catch (err) {
          if (candidate && candidate === lockedProfileId) {
            throw err;
          }
          nextIndex += 1;
        }
      }
      return false;
    };
    try {
      while (profileIndex < profileCandidates.length) {
        const candidate = profileCandidates[profileIndex];
        if (candidate &&
        candidate !== lockedProfileId &&
        (0, _authProfiles.isProfileInCooldown)(authStore, candidate)) {
          profileIndex += 1;
          continue;
        }
        await applyApiKeyInfo(profileCandidates[profileIndex]);
        break;
      }
      if (profileIndex >= profileCandidates.length) {
        throwAuthProfileFailover({ allInCooldown: true });
      }
    }
    catch (err) {
      if (err instanceof _failoverError.FailoverError) {
        throw err;
      }
      if (profileCandidates[profileIndex] === lockedProfileId) {
        throwAuthProfileFailover({ allInCooldown: false, error: err });
      }
      const advanced = await advanceAuthProfile();
      if (!advanced) {
        throwAuthProfileFailover({ allInCooldown: false, error: err });
      }
    }
    let overflowCompactionAttempted = false;
    try {
      while (true) {
        attemptedThinking.add(thinkLevel);
        await _promises.default.mkdir(resolvedWorkspace, { recursive: true });
        const prompt = provider === "anthropic" ? scrubAnthropicRefusalMagic(params.prompt) : params.prompt;
        const attempt = await (0, _attempt.runEmbeddedAttempt)({
          sessionId: params.sessionId,
          sessionKey: params.sessionKey,
          messageChannel: params.messageChannel,
          messageProvider: params.messageProvider,
          agentAccountId: params.agentAccountId,
          messageTo: params.messageTo,
          messageThreadId: params.messageThreadId,
          groupId: params.groupId,
          groupChannel: params.groupChannel,
          groupSpace: params.groupSpace,
          spawnedBy: params.spawnedBy,
          currentChannelId: params.currentChannelId,
          currentThreadTs: params.currentThreadTs,
          replyToMode: params.replyToMode,
          hasRepliedRef: params.hasRepliedRef,
          sessionFile: params.sessionFile,
          workspaceDir: params.workspaceDir,
          agentDir,
          config: params.config,
          skillsSnapshot: params.skillsSnapshot,
          prompt,
          images: params.images,
          disableTools: params.disableTools,
          provider,
          modelId,
          model,
          authStorage,
          modelRegistry,
          thinkLevel,
          verboseLevel: params.verboseLevel,
          reasoningLevel: params.reasoningLevel,
          toolResultFormat: resolvedToolResultFormat,
          execOverrides: params.execOverrides,
          bashElevated: params.bashElevated,
          timeoutMs: params.timeoutMs,
          runId: params.runId,
          abortSignal: params.abortSignal,
          shouldEmitToolResult: params.shouldEmitToolResult,
          shouldEmitToolOutput: params.shouldEmitToolOutput,
          onPartialReply: params.onPartialReply,
          onAssistantMessageStart: params.onAssistantMessageStart,
          onBlockReply: params.onBlockReply,
          onBlockReplyFlush: params.onBlockReplyFlush,
          blockReplyBreak: params.blockReplyBreak,
          blockReplyChunking: params.blockReplyChunking,
          onReasoningStream: params.onReasoningStream,
          onToolResult: params.onToolResult,
          onAgentEvent: params.onAgentEvent,
          extraSystemPrompt: params.extraSystemPrompt,
          streamParams: params.streamParams,
          ownerNumbers: params.ownerNumbers,
          enforceFinalTag: params.enforceFinalTag
        });
        const { aborted, promptError, timedOut, sessionIdUsed, lastAssistant } = attempt;
        if (promptError && !aborted) {
          const errorText = (0, _utils2.describeUnknownError)(promptError);
          if ((0, _piEmbeddedHelpers.isContextOverflowError)(errorText)) {
            const isCompactionFailure = (0, _piEmbeddedHelpers.isCompactionFailureError)(errorText);
            // Attempt auto-compaction on context overflow (not compaction_failure)
            if (!isCompactionFailure && !overflowCompactionAttempted) {
              _logger.log.warn(`context overflow detected; attempting auto-compaction for ${provider}/${modelId}`);
              overflowCompactionAttempted = true;
              const compactResult = await (0, _compact.compactEmbeddedPiSessionDirect)({
                sessionId: params.sessionId,
                sessionKey: params.sessionKey,
                messageChannel: params.messageChannel,
                messageProvider: params.messageProvider,
                agentAccountId: params.agentAccountId,
                authProfileId: lastProfileId,
                sessionFile: params.sessionFile,
                workspaceDir: params.workspaceDir,
                agentDir,
                config: params.config,
                skillsSnapshot: params.skillsSnapshot,
                provider,
                model: modelId,
                thinkLevel,
                reasoningLevel: params.reasoningLevel,
                bashElevated: params.bashElevated,
                extraSystemPrompt: params.extraSystemPrompt,
                ownerNumbers: params.ownerNumbers
              });
              if (compactResult.compacted) {
                _logger.log.info(`auto-compaction succeeded for ${provider}/${modelId}; retrying prompt`);
                continue;
              }
              _logger.log.warn(`auto-compaction failed for ${provider}/${modelId}: ${compactResult.reason ?? "nothing to compact"}`);
            }
            const kind = isCompactionFailure ? "compaction_failure" : "context_overflow";
            return {
              payloads: [
              {
                text: "Context overflow: prompt too large for the model. " +
                "Try again with less input or a larger-context model.",
                isError: true
              }],

              meta: {
                durationMs: Date.now() - started,
                agentMeta: {
                  sessionId: sessionIdUsed,
                  provider,
                  model: model.id
                },
                systemPromptReport: attempt.systemPromptReport,
                error: { kind, message: errorText }
              }
            };
          }
          // Handle role ordering errors with a user-friendly message
          if (/incorrect role information|roles must alternate/i.test(errorText)) {
            return {
              payloads: [
              {
                text: "Message ordering conflict - please try again. " +
                "If this persists, use /new to start a fresh session.",
                isError: true
              }],

              meta: {
                durationMs: Date.now() - started,
                agentMeta: {
                  sessionId: sessionIdUsed,
                  provider,
                  model: model.id
                },
                systemPromptReport: attempt.systemPromptReport,
                error: { kind: "role_ordering", message: errorText }
              }
            };
          }
          // Handle image size errors with a user-friendly message (no retry needed)
          const imageSizeError = (0, _piEmbeddedHelpers.parseImageSizeError)(errorText);
          if (imageSizeError) {
            const maxMb = imageSizeError.maxMb;
            const maxMbLabel = typeof maxMb === "number" && Number.isFinite(maxMb) ? `${maxMb}` : null;
            const maxBytesHint = maxMbLabel ? ` (max ${maxMbLabel}MB)` : "";
            return {
              payloads: [
              {
                text: `Image too large for the model${maxBytesHint}. ` +
                "Please compress or resize the image and try again.",
                isError: true
              }],

              meta: {
                durationMs: Date.now() - started,
                agentMeta: {
                  sessionId: sessionIdUsed,
                  provider,
                  model: model.id
                },
                systemPromptReport: attempt.systemPromptReport,
                error: { kind: "image_size", message: errorText }
              }
            };
          }
          const promptFailoverReason = (0, _piEmbeddedHelpers.classifyFailoverReason)(errorText);
          if (promptFailoverReason && promptFailoverReason !== "timeout" && lastProfileId) {
            await (0, _authProfiles.markAuthProfileFailure)({
              store: authStore,
              profileId: lastProfileId,
              reason: promptFailoverReason,
              cfg: params.config,
              agentDir: params.agentDir
            });
          }
          if ((0, _piEmbeddedHelpers.isFailoverErrorMessage)(errorText) &&
          promptFailoverReason !== "timeout" && (
          await advanceAuthProfile())) {
            continue;
          }
          const fallbackThinking = (0, _piEmbeddedHelpers.pickFallbackThinkingLevel)({
            message: errorText,
            attempted: attemptedThinking
          });
          if (fallbackThinking) {
            _logger.log.warn(`unsupported thinking level for ${provider}/${modelId}; retrying with ${fallbackThinking}`);
            thinkLevel = fallbackThinking;
            continue;
          }
          // FIX: Throw FailoverError for prompt errors when fallbacks configured
          // This enables model fallback for quota/rate limit errors during prompt submission
          if (fallbackConfigured && (0, _piEmbeddedHelpers.isFailoverErrorMessage)(errorText)) {
            throw new _failoverError.FailoverError(errorText, {
              reason: promptFailoverReason ?? "unknown",
              provider,
              model: modelId,
              profileId: lastProfileId,
              status: (0, _failoverError.resolveFailoverStatus)(promptFailoverReason ?? "unknown")
            });
          }
          throw promptError;
        }
        const fallbackThinking = (0, _piEmbeddedHelpers.pickFallbackThinkingLevel)({
          message: lastAssistant?.errorMessage,
          attempted: attemptedThinking
        });
        if (fallbackThinking && !aborted) {
          _logger.log.warn(`unsupported thinking level for ${provider}/${modelId}; retrying with ${fallbackThinking}`);
          thinkLevel = fallbackThinking;
          continue;
        }
        const authFailure = (0, _piEmbeddedHelpers.isAuthAssistantError)(lastAssistant);
        const rateLimitFailure = (0, _piEmbeddedHelpers.isRateLimitAssistantError)(lastAssistant);
        const failoverFailure = (0, _piEmbeddedHelpers.isFailoverAssistantError)(lastAssistant);
        const assistantFailoverReason = (0, _piEmbeddedHelpers.classifyFailoverReason)(lastAssistant?.errorMessage ?? "");
        const cloudCodeAssistFormatError = attempt.cloudCodeAssistFormatError;
        const imageDimensionError = (0, _piEmbeddedHelpers.parseImageDimensionError)(lastAssistant?.errorMessage ?? "");
        if (imageDimensionError && lastProfileId) {
          const details = [
          imageDimensionError.messageIndex !== undefined ?
          `message=${imageDimensionError.messageIndex}` :
          null,
          imageDimensionError.contentIndex !== undefined ?
          `content=${imageDimensionError.contentIndex}` :
          null,
          imageDimensionError.maxDimensionPx !== undefined ?
          `limit=${imageDimensionError.maxDimensionPx}px` :
          null].

          filter(Boolean).
          join(" ");
          _logger.log.warn(`Profile ${lastProfileId} rejected image payload${details ? ` (${details})` : ""}.`);
        }
        // Treat timeout as potential rate limit (Antigravity hangs on rate limit)
        const shouldRotate = !aborted && failoverFailure || timedOut;
        if (shouldRotate) {
          if (lastProfileId) {
            const reason = timedOut || assistantFailoverReason === "timeout" ?
            "timeout" :
            assistantFailoverReason ?? "unknown";
            await (0, _authProfiles.markAuthProfileFailure)({
              store: authStore,
              profileId: lastProfileId,
              reason,
              cfg: params.config,
              agentDir: params.agentDir
            });
            if (timedOut && !isProbeSession) {
              _logger.log.warn(`Profile ${lastProfileId} timed out (possible rate limit). Trying next account...`);
            }
            if (cloudCodeAssistFormatError) {
              _logger.log.warn(`Profile ${lastProfileId} hit Cloud Code Assist format error. Tool calls will be sanitized on retry.`);
            }
          }
          const rotated = await advanceAuthProfile();
          if (rotated) {
            continue;
          }
          if (fallbackConfigured) {
            // Prefer formatted error message (user-friendly) over raw errorMessage
            const message = (lastAssistant ?
            (0, _piEmbeddedHelpers.formatAssistantErrorText)(lastAssistant, {
              cfg: params.config,
              sessionKey: params.sessionKey ?? params.sessionId
            }) :
            undefined) ||
            lastAssistant?.errorMessage?.trim() || (
            timedOut ?
            "LLM request timed out." :
            rateLimitFailure ?
            "LLM request rate limited." :
            authFailure ?
            "LLM request unauthorized." :
            "LLM request failed.");
            const status = (0, _failoverError.resolveFailoverStatus)(assistantFailoverReason ?? "unknown") ?? (
            (0, _piEmbeddedHelpers.isTimeoutErrorMessage)(message) ? 408 : undefined);
            throw new _failoverError.FailoverError(message, {
              reason: assistantFailoverReason ?? "unknown",
              provider,
              model: modelId,
              profileId: lastProfileId,
              status
            });
          }
        }
        const usage = (0, _usage.normalizeUsage)(lastAssistant?.usage);
        const agentMeta = {
          sessionId: sessionIdUsed,
          provider: lastAssistant?.provider ?? provider,
          model: lastAssistant?.model ?? model.id,
          usage
        };
        const payloads = (0, _payloads.buildEmbeddedRunPayloads)({
          assistantTexts: attempt.assistantTexts,
          toolMetas: attempt.toolMetas,
          lastAssistant: attempt.lastAssistant,
          lastToolError: attempt.lastToolError,
          config: params.config,
          sessionKey: params.sessionKey ?? params.sessionId,
          verboseLevel: params.verboseLevel,
          reasoningLevel: params.reasoningLevel,
          toolResultFormat: resolvedToolResultFormat,
          inlineToolResultsAllowed: false
        });
        _logger.log.debug(`embedded run done: runId=${params.runId} sessionId=${params.sessionId} durationMs=${Date.now() - started} aborted=${aborted}`);
        if (lastProfileId) {
          await (0, _authProfiles.markAuthProfileGood)({
            store: authStore,
            provider,
            profileId: lastProfileId,
            agentDir: params.agentDir
          });
          await (0, _authProfiles.markAuthProfileUsed)({
            store: authStore,
            profileId: lastProfileId,
            agentDir: params.agentDir
          });
        }
        return {
          payloads: payloads.length ? payloads : undefined,
          meta: {
            durationMs: Date.now() - started,
            agentMeta,
            aborted,
            systemPromptReport: attempt.systemPromptReport,
            // Handle client tool calls (OpenResponses hosted tools)
            stopReason: attempt.clientToolCall ? "tool_calls" : undefined,
            pendingToolCalls: attempt.clientToolCall ?
            [
            {
              id: `call_${Date.now()}`,
              name: attempt.clientToolCall.name,
              arguments: JSON.stringify(attempt.clientToolCall.params)
            }] :

            undefined
          },
          didSendViaMessagingTool: attempt.didSendViaMessagingTool,
          messagingToolSentTexts: attempt.messagingToolSentTexts,
          messagingToolSentTargets: attempt.messagingToolSentTargets
        };
      }
    } finally
    {
      process.chdir(prevCwd);
    }
  }));
} /* v9-ea245d5624f3f22a */
