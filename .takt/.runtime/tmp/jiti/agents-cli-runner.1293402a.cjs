"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.runClaudeCliAgent = runClaudeCliAgent;exports.runCliAgent = runCliAgent;var _heartbeat = require("../auto-reply/heartbeat.js");
var _globals = require("../globals.js");
var _env = require("../infra/env.js");
var _subsystem = require("../logging/subsystem.js");
var _exec = require("../process/exec.js");
var _utils = require("../utils.js");
var _agentScope = require("./agent-scope.js");
var _bootstrapFiles = require("./bootstrap-files.js");
var _cliBackends = require("./cli-backends.js");
var _helpers = require("./cli-runner/helpers.js");
var _docsPath = require("./docs-path.js");
var _failoverError = require("./failover-error.js");
var _piEmbeddedHelpers = require("./pi-embedded-helpers.js");
const log = (0, _subsystem.createSubsystemLogger)("agent/claude-cli");
async function runCliAgent(params) {
  const started = Date.now();
  const resolvedWorkspace = (0, _utils.resolveUserPath)(params.workspaceDir);
  const workspaceDir = resolvedWorkspace;
  const backendResolved = (0, _cliBackends.resolveCliBackendConfig)(params.provider, params.config);
  if (!backendResolved) {
    throw new Error(`Unknown CLI backend: ${params.provider}`);
  }
  const backend = backendResolved.config;
  const modelId = (params.model ?? "default").trim() || "default";
  const normalizedModel = (0, _helpers.normalizeCliModel)(modelId, backend);
  const modelDisplay = `${params.provider}/${modelId}`;
  const extraSystemPrompt = [
  params.extraSystemPrompt?.trim(),
  "Tools are disabled in this session. Do not call tools."].

  filter(Boolean).
  join("\n");
  const sessionLabel = params.sessionKey ?? params.sessionId;
  const { contextFiles } = await (0, _bootstrapFiles.resolveBootstrapContextForRun)({
    workspaceDir,
    config: params.config,
    sessionKey: params.sessionKey,
    sessionId: params.sessionId,
    warn: (0, _bootstrapFiles.makeBootstrapWarn)({ sessionLabel, warn: (message) => log.warn(message) })
  });
  const { defaultAgentId, sessionAgentId } = (0, _agentScope.resolveSessionAgentIds)({
    sessionKey: params.sessionKey,
    config: params.config
  });
  const heartbeatPrompt = sessionAgentId === defaultAgentId ?
  (0, _heartbeat.resolveHeartbeatPrompt)(params.config?.agents?.defaults?.heartbeat?.prompt) :
  undefined;
  const docsPath = await (0, _docsPath.resolveOpenClawDocsPath)({
    workspaceDir,
    argv1: process.argv[1],
    cwd: process.cwd(),
    moduleUrl: "file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/agents/cli-runner.js"
  });
  const systemPrompt = (0, _helpers.buildSystemPrompt)({
    workspaceDir,
    config: params.config,
    defaultThinkLevel: params.thinkLevel,
    extraSystemPrompt,
    ownerNumbers: params.ownerNumbers,
    heartbeatPrompt,
    docsPath: docsPath ?? undefined,
    tools: [],
    contextFiles,
    modelDisplay,
    agentId: sessionAgentId
  });
  const { sessionId: cliSessionIdToSend, isNew } = (0, _helpers.resolveSessionIdToSend)({
    backend,
    cliSessionId: params.cliSessionId
  });
  const useResume = Boolean(params.cliSessionId &&
  cliSessionIdToSend &&
  backend.resumeArgs &&
  backend.resumeArgs.length > 0);
  const sessionIdSent = cliSessionIdToSend ?
  useResume || Boolean(backend.sessionArg) || Boolean(backend.sessionArgs?.length) ?
  cliSessionIdToSend :
  undefined :
  undefined;
  const systemPromptArg = (0, _helpers.resolveSystemPromptUsage)({
    backend,
    isNewSession: isNew,
    systemPrompt
  });
  let imagePaths;
  let cleanupImages;
  let prompt = params.prompt;
  if (params.images && params.images.length > 0) {
    const imagePayload = await (0, _helpers.writeCliImages)(params.images);
    imagePaths = imagePayload.paths;
    cleanupImages = imagePayload.cleanup;
    if (!backend.imageArg) {
      prompt = (0, _helpers.appendImagePathsToPrompt)(prompt, imagePaths);
    }
  }
  const { argsPrompt, stdin } = (0, _helpers.resolvePromptInput)({
    backend,
    prompt
  });
  const stdinPayload = stdin ?? "";
  const baseArgs = useResume ? backend.resumeArgs ?? backend.args ?? [] : backend.args ?? [];
  const resolvedArgs = useResume ?
  baseArgs.map((entry) => entry.replaceAll("{sessionId}", cliSessionIdToSend ?? "")) :
  baseArgs;
  const args = (0, _helpers.buildCliArgs)({
    backend,
    baseArgs: resolvedArgs,
    modelId: normalizedModel,
    sessionId: cliSessionIdToSend,
    systemPrompt: systemPromptArg,
    imagePaths,
    promptArg: argsPrompt,
    useResume
  });
  const serialize = backend.serialize ?? true;
  const queueKey = serialize ? backendResolved.id : `${backendResolved.id}:${params.runId}`;
  try {
    const output = await (0, _helpers.enqueueCliRun)(queueKey, async () => {
      log.info(`cli exec: provider=${params.provider} model=${normalizedModel} promptChars=${params.prompt.length}`);
      const logOutputText = (0, _env.isTruthyEnvValue)(process.env.OPENCLAW_CLAUDE_CLI_LOG_OUTPUT);
      if (logOutputText) {
        const logArgs = [];
        for (let i = 0; i < args.length; i += 1) {
          const arg = args[i] ?? "";
          if (arg === backend.systemPromptArg) {
            const systemPromptValue = args[i + 1] ?? "";
            logArgs.push(arg, `<systemPrompt:${systemPromptValue.length} chars>`);
            i += 1;
            continue;
          }
          if (arg === backend.sessionArg) {
            logArgs.push(arg, args[i + 1] ?? "");
            i += 1;
            continue;
          }
          if (arg === backend.modelArg) {
            logArgs.push(arg, args[i + 1] ?? "");
            i += 1;
            continue;
          }
          if (arg === backend.imageArg) {
            logArgs.push(arg, "<image>");
            i += 1;
            continue;
          }
          logArgs.push(arg);
        }
        if (argsPrompt) {
          const promptIndex = logArgs.indexOf(argsPrompt);
          if (promptIndex >= 0) {
            logArgs[promptIndex] = `<prompt:${argsPrompt.length} chars>`;
          }
        }
        log.info(`cli argv: ${backend.command} ${logArgs.join(" ")}`);
      }
      const env = (() => {
        const next = { ...process.env, ...backend.env };
        for (const key of backend.clearEnv ?? []) {
          delete next[key];
        }
        return next;
      })();
      // Cleanup suspended processes that have accumulated (regardless of sessionId)
      await (0, _helpers.cleanupSuspendedCliProcesses)(backend);
      if (useResume && cliSessionIdToSend) {
        await (0, _helpers.cleanupResumeProcesses)(backend, cliSessionIdToSend);
      }
      const result = await (0, _exec.runCommandWithTimeout)([backend.command, ...args], {
        timeoutMs: params.timeoutMs,
        cwd: workspaceDir,
        env,
        input: stdinPayload
      });
      const stdout = result.stdout.trim();
      const stderr = result.stderr.trim();
      if (logOutputText) {
        if (stdout) {
          log.info(`cli stdout:\n${stdout}`);
        }
        if (stderr) {
          log.info(`cli stderr:\n${stderr}`);
        }
      }
      if ((0, _globals.shouldLogVerbose)()) {
        if (stdout) {
          log.debug(`cli stdout:\n${stdout}`);
        }
        if (stderr) {
          log.debug(`cli stderr:\n${stderr}`);
        }
      }
      if (result.code !== 0) {
        const err = stderr || stdout || "CLI failed.";
        const reason = (0, _piEmbeddedHelpers.classifyFailoverReason)(err) ?? "unknown";
        const status = (0, _failoverError.resolveFailoverStatus)(reason);
        throw new _failoverError.FailoverError(err, {
          reason,
          provider: params.provider,
          model: modelId,
          status
        });
      }
      const outputMode = useResume ? backend.resumeOutput ?? backend.output : backend.output;
      if (outputMode === "text") {
        return { text: stdout, sessionId: undefined };
      }
      if (outputMode === "jsonl") {
        const parsed = (0, _helpers.parseCliJsonl)(stdout, backend);
        return parsed ?? { text: stdout };
      }
      const parsed = (0, _helpers.parseCliJson)(stdout, backend);
      return parsed ?? { text: stdout };
    });
    const text = output.text?.trim();
    const payloads = text ? [{ text }] : undefined;
    return {
      payloads,
      meta: {
        durationMs: Date.now() - started,
        agentMeta: {
          sessionId: output.sessionId ?? sessionIdSent ?? params.sessionId ?? "",
          provider: params.provider,
          model: modelId,
          usage: output.usage
        }
      }
    };
  }
  catch (err) {
    if (err instanceof _failoverError.FailoverError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    if ((0, _piEmbeddedHelpers.isFailoverErrorMessage)(message)) {
      const reason = (0, _piEmbeddedHelpers.classifyFailoverReason)(message) ?? "unknown";
      const status = (0, _failoverError.resolveFailoverStatus)(reason);
      throw new _failoverError.FailoverError(message, {
        reason,
        provider: params.provider,
        model: modelId,
        status
      });
    }
    throw err;
  } finally
  {
    if (cleanupImages) {
      await cleanupImages();
    }
  }
}
async function runClaudeCliAgent(params) {
  return runCliAgent({
    sessionId: params.sessionId,
    sessionKey: params.sessionKey,
    sessionFile: params.sessionFile,
    workspaceDir: params.workspaceDir,
    config: params.config,
    prompt: params.prompt,
    provider: params.provider ?? "claude-cli",
    model: params.model ?? "opus",
    thinkLevel: params.thinkLevel,
    timeoutMs: params.timeoutMs,
    runId: params.runId,
    extraSystemPrompt: params.extraSystemPrompt,
    ownerNumbers: params.ownerNumbers,
    cliSessionId: params.claudeSessionId,
    images: params.images
  });
} /* v9-800fcef186e0d6fd */
