"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createExecTool = createExecTool;exports.execTool = void 0;var _typebox = require("@sinclair/typebox");
var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _execApprovals = require("../infra/exec-approvals.js");
var _heartbeatWake = require("../infra/heartbeat-wake.js");
var _nodeShell = require("../infra/node-shell.js");
var _shellEnv = require("../infra/shell-env.js");
var _systemEvents = require("../infra/system-events.js");
var _logger = require("../logger.js");
var _spawnUtils = require("../process/spawn-utils.js");
var _sessionKey = require("../routing/session-key.js");
var _bashProcessRegistry = require("./bash-process-registry.js");
var _bashToolsShared = require("./bash-tools.shared.js");
var _ptyDsr = require("./pty-dsr.js");
var _shellUtils = require("./shell-utils.js");
var _gateway = require("./tools/gateway.js");
var _nodesUtils = require("./tools/nodes-utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
// Security: Blocklist of environment variables that could alter execution flow
// or inject code when running on non-sandboxed hosts (Gateway/Node).
const DANGEROUS_HOST_ENV_VARS = new Set([
"LD_PRELOAD",
"LD_LIBRARY_PATH",
"LD_AUDIT",
"DYLD_INSERT_LIBRARIES",
"DYLD_LIBRARY_PATH",
"NODE_OPTIONS",
"NODE_PATH",
"PYTHONPATH",
"PYTHONHOME",
"RUBYLIB",
"PERL5LIB",
"BASH_ENV",
"ENV",
"GCONV_PATH",
"IFS",
"SSLKEYLOGFILE"]
);
const DANGEROUS_HOST_ENV_PREFIXES = ["DYLD_", "LD_"];
// Centralized sanitization helper.
// Throws an error if dangerous variables or PATH modifications are detected on the host.
function validateHostEnv(env) {
  for (const key of Object.keys(env)) {
    const upperKey = key.toUpperCase();
    // 1. Block known dangerous variables (Fail Closed)
    if (DANGEROUS_HOST_ENV_PREFIXES.some((prefix) => upperKey.startsWith(prefix))) {
      throw new Error(`Security Violation: Environment variable '${key}' is forbidden during host execution.`);
    }
    if (DANGEROUS_HOST_ENV_VARS.has(upperKey)) {
      throw new Error(`Security Violation: Environment variable '${key}' is forbidden during host execution.`);
    }
    // 2. Strictly block PATH modification on host
    // Allowing custom PATH on the gateway/node can lead to binary hijacking.
    if (upperKey === "PATH") {
      throw new Error("Security Violation: Custom 'PATH' variable is forbidden during host execution.");
    }
  }
}
const DEFAULT_MAX_OUTPUT = (0, _bashToolsShared.clampNumber)((0, _bashToolsShared.readEnvInt)("PI_BASH_MAX_OUTPUT_CHARS"), 200_000, 1_000, 200_000);
const DEFAULT_PENDING_MAX_OUTPUT = (0, _bashToolsShared.clampNumber)((0, _bashToolsShared.readEnvInt)("OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS"), 200_000, 1_000, 200_000);
const DEFAULT_PATH = process.env.PATH ?? "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
const DEFAULT_NOTIFY_TAIL_CHARS = 400;
const DEFAULT_APPROVAL_TIMEOUT_MS = 120_000;
const DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS = 130_000;
const DEFAULT_APPROVAL_RUNNING_NOTICE_MS = 10_000;
const APPROVAL_SLUG_LENGTH = 8;
const execSchema = _typebox.Type.Object({
  command: _typebox.Type.String({ description: "Shell command to execute" }),
  workdir: _typebox.Type.Optional(_typebox.Type.String({ description: "Working directory (defaults to cwd)" })),
  env: _typebox.Type.Optional(_typebox.Type.Record(_typebox.Type.String(), _typebox.Type.String())),
  yieldMs: _typebox.Type.Optional(_typebox.Type.Number({
    description: "Milliseconds to wait before backgrounding (default 10000)"
  })),
  background: _typebox.Type.Optional(_typebox.Type.Boolean({ description: "Run in background immediately" })),
  timeout: _typebox.Type.Optional(_typebox.Type.Number({
    description: "Timeout in seconds (optional, kills process on expiry)"
  })),
  pty: _typebox.Type.Optional(_typebox.Type.Boolean({
    description: "Run in a pseudo-terminal (PTY) when available (TTY-required CLIs, coding agents)"
  })),
  elevated: _typebox.Type.Optional(_typebox.Type.Boolean({
    description: "Run on the host with elevated permissions (if allowed)"
  })),
  host: _typebox.Type.Optional(_typebox.Type.String({
    description: "Exec host (sandbox|gateway|node)."
  })),
  security: _typebox.Type.Optional(_typebox.Type.String({
    description: "Exec security mode (deny|allowlist|full)."
  })),
  ask: _typebox.Type.Optional(_typebox.Type.String({
    description: "Exec ask mode (off|on-miss|always)."
  })),
  node: _typebox.Type.Optional(_typebox.Type.String({
    description: "Node id/name for host=node."
  }))
});
function normalizeExecHost(value) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "sandbox" || normalized === "gateway" || normalized === "node") {
    return normalized;
  }
  return null;
}
function normalizeExecSecurity(value) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "deny" || normalized === "allowlist" || normalized === "full") {
    return normalized;
  }
  return null;
}
function normalizeExecAsk(value) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "off" || normalized === "on-miss" || normalized === "always") {
    return normalized;
  }
  return null;
}
function renderExecHostLabel(host) {
  return host === "sandbox" ? "sandbox" : host === "gateway" ? "gateway" : "node";
}
function normalizeNotifyOutput(value) {
  return value.replace(/\s+/g, " ").trim();
}
function normalizePathPrepend(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  const seen = new Set();
  const normalized = [];
  for (const entry of entries) {
    if (typeof entry !== "string") {
      continue;
    }
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
}
function mergePathPrepend(existing, prepend) {
  if (prepend.length === 0) {
    return existing;
  }
  const partsExisting = (existing ?? "").
  split(_nodePath.default.delimiter).
  map((part) => part.trim()).
  filter(Boolean);
  const merged = [];
  const seen = new Set();
  for (const part of [...prepend, ...partsExisting]) {
    if (seen.has(part)) {
      continue;
    }
    seen.add(part);
    merged.push(part);
  }
  return merged.join(_nodePath.default.delimiter);
}
function applyPathPrepend(env, prepend, options) {
  if (prepend.length === 0) {
    return;
  }
  if (options?.requireExisting && !env.PATH) {
    return;
  }
  const merged = mergePathPrepend(env.PATH, prepend);
  if (merged) {
    env.PATH = merged;
  }
}
function applyShellPath(env, shellPath) {
  if (!shellPath) {
    return;
  }
  const entries = shellPath.
  split(_nodePath.default.delimiter).
  map((part) => part.trim()).
  filter(Boolean);
  if (entries.length === 0) {
    return;
  }
  const merged = mergePathPrepend(env.PATH, entries);
  if (merged) {
    env.PATH = merged;
  }
}
function maybeNotifyOnExit(session, status) {
  if (!session.backgrounded || !session.notifyOnExit || session.exitNotified) {
    return;
  }
  const sessionKey = session.sessionKey?.trim();
  if (!sessionKey) {
    return;
  }
  session.exitNotified = true;
  const exitLabel = session.exitSignal ?
  `signal ${session.exitSignal}` :
  `code ${session.exitCode ?? 0}`;
  const output = normalizeNotifyOutput((0, _bashProcessRegistry.tail)(session.tail || session.aggregated || "", DEFAULT_NOTIFY_TAIL_CHARS));
  const summary = output ?
  `Exec ${status} (${session.id.slice(0, 8)}, ${exitLabel}) :: ${output}` :
  `Exec ${status} (${session.id.slice(0, 8)}, ${exitLabel})`;
  (0, _systemEvents.enqueueSystemEvent)(summary, { sessionKey });
  (0, _heartbeatWake.requestHeartbeatNow)({ reason: `exec:${session.id}:exit` });
}
function createApprovalSlug(id) {
  return id.slice(0, APPROVAL_SLUG_LENGTH);
}
function resolveApprovalRunningNoticeMs(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_APPROVAL_RUNNING_NOTICE_MS;
  }
  if (value <= 0) {
    return 0;
  }
  return Math.floor(value);
}
function emitExecSystemEvent(text, opts) {
  const sessionKey = opts.sessionKey?.trim();
  if (!sessionKey) {
    return;
  }
  (0, _systemEvents.enqueueSystemEvent)(text, { sessionKey, contextKey: opts.contextKey });
  (0, _heartbeatWake.requestHeartbeatNow)({ reason: "exec-event" });
}
async function runExecProcess(opts) {
  const startedAt = Date.now();
  const sessionId = (0, _bashProcessRegistry.createSessionSlug)();
  let child = null;
  let pty = null;
  let stdin;
  if (opts.sandbox) {
    const { child: spawned } = await (0, _spawnUtils.spawnWithFallback)({
      argv: [
      "docker",
      ...(0, _bashToolsShared.buildDockerExecArgs)({
        containerName: opts.sandbox.containerName,
        command: opts.command,
        workdir: opts.containerWorkdir ?? opts.sandbox.containerWorkdir,
        env: opts.env,
        tty: opts.usePty
      })],

      options: {
        cwd: opts.workdir,
        env: process.env,
        detached: process.platform !== "win32",
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true
      },
      fallbacks: [
      {
        label: "no-detach",
        options: { detached: false }
      }],

      onFallback: (err, fallback) => {
        const errText = (0, _spawnUtils.formatSpawnError)(err);
        const warning = `Warning: spawn failed (${errText}); retrying with ${fallback.label}.`;
        (0, _logger.logWarn)(`exec: spawn failed (${errText}); retrying with ${fallback.label}.`);
        opts.warnings.push(warning);
      }
    });
    child = spawned;
    stdin = child.stdin;
  } else
  if (opts.usePty) {
    const { shell, args: shellArgs } = (0, _shellUtils.getShellConfig)();
    try {
      const ptyModule = await Promise.resolve().then(() => jitiImport("@lydell/node-pty").then((m) => _interopRequireWildcard(m)));
      const spawnPty = ptyModule.spawn ?? ptyModule.default?.spawn;
      if (!spawnPty) {
        throw new Error("PTY support is unavailable (node-pty spawn not found).");
      }
      pty = spawnPty(shell, [...shellArgs, opts.command], {
        cwd: opts.workdir,
        env: opts.env,
        name: process.env.TERM ?? "xterm-256color",
        cols: 120,
        rows: 30
      });
      stdin = {
        destroyed: false,
        write: (data, cb) => {
          try {
            pty?.write(data);
            cb?.(null);
          }
          catch (err) {
            cb?.(err);
          }
        },
        end: () => {
          try {
            const eof = process.platform === "win32" ? "\x1a" : "\x04";
            pty?.write(eof);
          }
          catch {

            // ignore EOF errors
          }}
      };
    }
    catch (err) {
      const errText = String(err);
      const warning = `Warning: PTY spawn failed (${errText}); retrying without PTY for \`${opts.command}\`.`;
      (0, _logger.logWarn)(`exec: PTY spawn failed (${errText}); retrying without PTY for "${opts.command}".`);
      opts.warnings.push(warning);
      const { child: spawned } = await (0, _spawnUtils.spawnWithFallback)({
        argv: [shell, ...shellArgs, opts.command],
        options: {
          cwd: opts.workdir,
          env: opts.env,
          detached: process.platform !== "win32",
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true
        },
        fallbacks: [
        {
          label: "no-detach",
          options: { detached: false }
        }],

        onFallback: (fallbackErr, fallback) => {
          const fallbackText = (0, _spawnUtils.formatSpawnError)(fallbackErr);
          const fallbackWarning = `Warning: spawn failed (${fallbackText}); retrying with ${fallback.label}.`;
          (0, _logger.logWarn)(`exec: spawn failed (${fallbackText}); retrying with ${fallback.label}.`);
          opts.warnings.push(fallbackWarning);
        }
      });
      child = spawned;
      stdin = child.stdin;
    }
  } else
  {
    const { shell, args: shellArgs } = (0, _shellUtils.getShellConfig)();
    const { child: spawned } = await (0, _spawnUtils.spawnWithFallback)({
      argv: [shell, ...shellArgs, opts.command],
      options: {
        cwd: opts.workdir,
        env: opts.env,
        detached: process.platform !== "win32",
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true
      },
      fallbacks: [
      {
        label: "no-detach",
        options: { detached: false }
      }],

      onFallback: (err, fallback) => {
        const errText = (0, _spawnUtils.formatSpawnError)(err);
        const warning = `Warning: spawn failed (${errText}); retrying with ${fallback.label}.`;
        (0, _logger.logWarn)(`exec: spawn failed (${errText}); retrying with ${fallback.label}.`);
        opts.warnings.push(warning);
      }
    });
    child = spawned;
    stdin = child.stdin;
  }
  const session = {
    id: sessionId,
    command: opts.command,
    scopeKey: opts.scopeKey,
    sessionKey: opts.sessionKey,
    notifyOnExit: opts.notifyOnExit,
    exitNotified: false,
    child: child ?? undefined,
    stdin,
    pid: child?.pid ?? pty?.pid,
    startedAt,
    cwd: opts.workdir,
    maxOutputChars: opts.maxOutput,
    pendingMaxOutputChars: opts.pendingMaxOutput,
    totalOutputChars: 0,
    pendingStdout: [],
    pendingStderr: [],
    pendingStdoutChars: 0,
    pendingStderrChars: 0,
    aggregated: "",
    tail: "",
    exited: false,
    exitCode: undefined,
    exitSignal: undefined,
    truncated: false,
    backgrounded: false
  };
  (0, _bashProcessRegistry.addSession)(session);
  let settled = false;
  let timeoutTimer = null;
  let timeoutFinalizeTimer = null;
  let timedOut = false;
  const timeoutFinalizeMs = 1000;
  let resolveFn = null;
  const settle = (outcome) => {
    if (settled) {
      return;
    }
    settled = true;
    resolveFn?.(outcome);
  };
  const finalizeTimeout = () => {
    if (session.exited) {
      return;
    }
    (0, _bashProcessRegistry.markExited)(session, null, "SIGKILL", "failed");
    maybeNotifyOnExit(session, "failed");
    const aggregated = session.aggregated.trim();
    const reason = `Command timed out after ${opts.timeoutSec} seconds`;
    settle({
      status: "failed",
      exitCode: null,
      exitSignal: "SIGKILL",
      durationMs: Date.now() - startedAt,
      aggregated,
      timedOut: true,
      reason: aggregated ? `${aggregated}\n\n${reason}` : reason
    });
  };
  const onTimeout = () => {
    timedOut = true;
    (0, _bashToolsShared.killSession)(session);
    if (!timeoutFinalizeTimer) {
      timeoutFinalizeTimer = setTimeout(() => {
        finalizeTimeout();
      }, timeoutFinalizeMs);
    }
  };
  if (opts.timeoutSec > 0) {
    timeoutTimer = setTimeout(() => {
      onTimeout();
    }, opts.timeoutSec * 1000);
  }
  const emitUpdate = () => {
    if (!opts.onUpdate) {
      return;
    }
    const tailText = session.tail || session.aggregated;
    const warningText = opts.warnings.length ? `${opts.warnings.join("\n")}\n\n` : "";
    opts.onUpdate({
      content: [{ type: "text", text: warningText + (tailText || "") }],
      details: {
        status: "running",
        sessionId,
        pid: session.pid ?? undefined,
        startedAt,
        cwd: session.cwd,
        tail: session.tail
      }
    });
  };
  const handleStdout = (data) => {
    const str = (0, _shellUtils.sanitizeBinaryOutput)(data.toString());
    for (const chunk of (0, _bashToolsShared.chunkString)(str)) {
      (0, _bashProcessRegistry.appendOutput)(session, "stdout", chunk);
      emitUpdate();
    }
  };
  const handleStderr = (data) => {
    const str = (0, _shellUtils.sanitizeBinaryOutput)(data.toString());
    for (const chunk of (0, _bashToolsShared.chunkString)(str)) {
      (0, _bashProcessRegistry.appendOutput)(session, "stderr", chunk);
      emitUpdate();
    }
  };
  if (pty) {
    const cursorResponse = (0, _ptyDsr.buildCursorPositionResponse)();
    pty.onData((data) => {
      const raw = data.toString();
      const { cleaned, requests } = (0, _ptyDsr.stripDsrRequests)(raw);
      if (requests > 0) {
        for (let i = 0; i < requests; i += 1) {
          pty.write(cursorResponse);
        }
      }
      handleStdout(cleaned);
    });
  } else
  if (child) {
    child.stdout.on("data", handleStdout);
    child.stderr.on("data", handleStderr);
  }
  const promise = new Promise((resolve) => {
    resolveFn = resolve;
    const handleExit = (code, exitSignal) => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      if (timeoutFinalizeTimer) {
        clearTimeout(timeoutFinalizeTimer);
      }
      const durationMs = Date.now() - startedAt;
      const wasSignal = exitSignal != null;
      const isSuccess = code === 0 && !wasSignal && !timedOut;
      const status = isSuccess ? "completed" : "failed";
      (0, _bashProcessRegistry.markExited)(session, code, exitSignal, status);
      maybeNotifyOnExit(session, status);
      if (!session.child && session.stdin) {
        session.stdin.destroyed = true;
      }
      if (settled) {
        return;
      }
      const aggregated = session.aggregated.trim();
      if (!isSuccess) {
        const reason = timedOut ?
        `Command timed out after ${opts.timeoutSec} seconds` :
        wasSignal && exitSignal ?
        `Command aborted by signal ${exitSignal}` :
        code === null ?
        "Command aborted before exit code was captured" :
        `Command exited with code ${code}`;
        const message = aggregated ? `${aggregated}\n\n${reason}` : reason;
        settle({
          status: "failed",
          exitCode: code ?? null,
          exitSignal: exitSignal ?? null,
          durationMs,
          aggregated,
          timedOut,
          reason: message
        });
        return;
      }
      settle({
        status: "completed",
        exitCode: code ?? 0,
        exitSignal: exitSignal ?? null,
        durationMs,
        aggregated,
        timedOut: false
      });
    };
    if (pty) {
      pty.onExit((event) => {
        const rawSignal = event.signal ?? null;
        const normalizedSignal = rawSignal === 0 ? null : rawSignal;
        handleExit(event.exitCode ?? null, normalizedSignal);
      });
    } else
    if (child) {
      child.once("close", (code, exitSignal) => {
        handleExit(code, exitSignal);
      });
      child.once("error", (err) => {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
        }
        if (timeoutFinalizeTimer) {
          clearTimeout(timeoutFinalizeTimer);
        }
        (0, _bashProcessRegistry.markExited)(session, null, null, "failed");
        maybeNotifyOnExit(session, "failed");
        const aggregated = session.aggregated.trim();
        const message = aggregated ? `${aggregated}\n\n${String(err)}` : String(err);
        settle({
          status: "failed",
          exitCode: null,
          exitSignal: null,
          durationMs: Date.now() - startedAt,
          aggregated,
          timedOut,
          reason: message
        });
      });
    }
  });
  return {
    session,
    startedAt,
    pid: session.pid ?? undefined,
    promise,
    kill: () => (0, _bashToolsShared.killSession)(session)
  };
}
function createExecTool(defaults) {
  const defaultBackgroundMs = (0, _bashToolsShared.clampNumber)(defaults?.backgroundMs ?? (0, _bashToolsShared.readEnvInt)("PI_BASH_YIELD_MS"), 10_000, 10, 120_000);
  const allowBackground = defaults?.allowBackground ?? true;
  const defaultTimeoutSec = typeof defaults?.timeoutSec === "number" && defaults.timeoutSec > 0 ?
  defaults.timeoutSec :
  1800;
  const defaultPathPrepend = normalizePathPrepend(defaults?.pathPrepend);
  const safeBins = (0, _execApprovals.resolveSafeBins)(defaults?.safeBins);
  const notifyOnExit = defaults?.notifyOnExit !== false;
  const notifySessionKey = defaults?.sessionKey?.trim() || undefined;
  const approvalRunningNoticeMs = resolveApprovalRunningNoticeMs(defaults?.approvalRunningNoticeMs);
  // Derive agentId only when sessionKey is an agent session key.
  const parsedAgentSession = (0, _sessionKey.parseAgentSessionKey)(defaults?.sessionKey);
  const agentId = defaults?.agentId ?? (
  parsedAgentSession ? (0, _sessionKey.resolveAgentIdFromSessionKey)(defaults?.sessionKey) : undefined);
  return {
    name: "exec",
    label: "exec",
    description: "Execute shell commands with background continuation. Use yieldMs/background to continue later via process tool. Use pty=true for TTY-required commands (terminal UIs, coding agents).",
    parameters: execSchema,
    execute: async (_toolCallId, args, signal, onUpdate) => {
      const params = args;
      if (!params.command) {
        throw new Error("Provide a command to start.");
      }
      const maxOutput = DEFAULT_MAX_OUTPUT;
      const pendingMaxOutput = DEFAULT_PENDING_MAX_OUTPUT;
      const warnings = [];
      const backgroundRequested = params.background === true;
      const yieldRequested = typeof params.yieldMs === "number";
      if (!allowBackground && (backgroundRequested || yieldRequested)) {
        warnings.push("Warning: background execution is disabled; running synchronously.");
      }
      const yieldWindow = allowBackground ?
      backgroundRequested ?
      0 :
      (0, _bashToolsShared.clampNumber)(params.yieldMs ?? defaultBackgroundMs, defaultBackgroundMs, 10, 120_000) :
      null;
      const elevatedDefaults = defaults?.elevated;
      const elevatedAllowed = Boolean(elevatedDefaults?.enabled && elevatedDefaults.allowed);
      const elevatedDefaultMode = elevatedDefaults?.defaultLevel === "full" ?
      "full" :
      elevatedDefaults?.defaultLevel === "ask" ?
      "ask" :
      elevatedDefaults?.defaultLevel === "on" ?
      "ask" :
      "off";
      const effectiveDefaultMode = elevatedAllowed ? elevatedDefaultMode : "off";
      const elevatedMode = typeof params.elevated === "boolean" ?
      params.elevated ?
      elevatedDefaultMode === "full" ?
      "full" :
      "ask" :
      "off" :
      effectiveDefaultMode;
      const elevatedRequested = elevatedMode !== "off";
      if (elevatedRequested) {
        if (!elevatedDefaults?.enabled || !elevatedDefaults.allowed) {
          const runtime = defaults?.sandbox ? "sandboxed" : "direct";
          const gates = [];
          const contextParts = [];
          const provider = defaults?.messageProvider?.trim();
          const sessionKey = defaults?.sessionKey?.trim();
          if (provider) {
            contextParts.push(`provider=${provider}`);
          }
          if (sessionKey) {
            contextParts.push(`session=${sessionKey}`);
          }
          if (!elevatedDefaults?.enabled) {
            gates.push("enabled (tools.elevated.enabled / agents.list[].tools.elevated.enabled)");
          } else
          {
            gates.push("allowFrom (tools.elevated.allowFrom.<provider> / agents.list[].tools.elevated.allowFrom.<provider>)");
          }
          throw new Error([
          `elevated is not available right now (runtime=${runtime}).`,
          `Failing gates: ${gates.join(", ")}`,
          contextParts.length > 0 ? `Context: ${contextParts.join(" ")}` : undefined,
          "Fix-it keys:",
          "- tools.elevated.enabled",
          "- tools.elevated.allowFrom.<provider>",
          "- agents.list[].tools.elevated.enabled",
          "- agents.list[].tools.elevated.allowFrom.<provider>"].

          filter(Boolean).
          join("\n"));
        }
      }
      if (elevatedRequested) {
        (0, _logger.logInfo)(`exec: elevated command ${(0, _bashToolsShared.truncateMiddle)(params.command, 120)}`);
      }
      const configuredHost = defaults?.host ?? "sandbox";
      const requestedHost = normalizeExecHost(params.host) ?? null;
      let host = requestedHost ?? configuredHost;
      if (!elevatedRequested && requestedHost && requestedHost !== configuredHost) {
        throw new Error(`exec host not allowed (requested ${renderExecHostLabel(requestedHost)}; ` +
        `configure tools.exec.host=${renderExecHostLabel(configuredHost)} to allow).`);
      }
      if (elevatedRequested) {
        host = "gateway";
      }
      const configuredSecurity = defaults?.security ?? (host === "sandbox" ? "deny" : "allowlist");
      const requestedSecurity = normalizeExecSecurity(params.security);
      let security = (0, _execApprovals.minSecurity)(configuredSecurity, requestedSecurity ?? configuredSecurity);
      if (elevatedRequested && elevatedMode === "full") {
        security = "full";
      }
      const configuredAsk = defaults?.ask ?? "on-miss";
      const requestedAsk = normalizeExecAsk(params.ask);
      let ask = (0, _execApprovals.maxAsk)(configuredAsk, requestedAsk ?? configuredAsk);
      const bypassApprovals = elevatedRequested && elevatedMode === "full";
      if (bypassApprovals) {
        ask = "off";
      }
      const sandbox = host === "sandbox" ? defaults?.sandbox : undefined;
      const rawWorkdir = params.workdir?.trim() || defaults?.cwd || process.cwd();
      let workdir = rawWorkdir;
      let containerWorkdir = sandbox?.containerWorkdir;
      if (sandbox) {
        const resolved = await (0, _bashToolsShared.resolveSandboxWorkdir)({
          workdir: rawWorkdir,
          sandbox,
          warnings
        });
        workdir = resolved.hostWorkdir;
        containerWorkdir = resolved.containerWorkdir;
      } else
      {
        workdir = (0, _bashToolsShared.resolveWorkdir)(rawWorkdir, warnings);
      }
      const baseEnv = (0, _bashToolsShared.coerceEnv)(process.env);
      // Logic: Sandbox gets raw env. Host (gateway/node) must pass validation.
      // We validate BEFORE merging to prevent any dangerous vars from entering the stream.
      if (host !== "sandbox" && params.env) {
        validateHostEnv(params.env);
      }
      const mergedEnv = params.env ? { ...baseEnv, ...params.env } : baseEnv;
      const env = sandbox ?
      (0, _bashToolsShared.buildSandboxEnv)({
        defaultPath: DEFAULT_PATH,
        paramsEnv: params.env,
        sandboxEnv: sandbox.env,
        containerWorkdir: containerWorkdir ?? sandbox.containerWorkdir
      }) :
      mergedEnv;
      if (!sandbox && host === "gateway" && !params.env?.PATH) {
        const shellPath = (0, _shellEnv.getShellPathFromLoginShell)({
          env: process.env,
          timeoutMs: (0, _shellEnv.resolveShellEnvFallbackTimeoutMs)(process.env)
        });
        applyShellPath(env, shellPath);
      }
      applyPathPrepend(env, defaultPathPrepend);
      if (host === "node") {
        const approvals = (0, _execApprovals.resolveExecApprovals)(agentId, { security, ask });
        const hostSecurity = (0, _execApprovals.minSecurity)(security, approvals.agent.security);
        const hostAsk = (0, _execApprovals.maxAsk)(ask, approvals.agent.ask);
        const askFallback = approvals.agent.askFallback;
        if (hostSecurity === "deny") {
          throw new Error("exec denied: host=node security=deny");
        }
        const boundNode = defaults?.node?.trim();
        const requestedNode = params.node?.trim();
        if (boundNode && requestedNode && boundNode !== requestedNode) {
          throw new Error(`exec node not allowed (bound to ${boundNode})`);
        }
        const nodeQuery = boundNode || requestedNode;
        const nodes = await (0, _nodesUtils.listNodes)({});
        if (nodes.length === 0) {
          throw new Error("exec host=node requires a paired node (none available). This requires a companion app or node host.");
        }
        let nodeId;
        try {
          nodeId = (0, _nodesUtils.resolveNodeIdFromList)(nodes, nodeQuery, !nodeQuery);
        }
        catch (err) {
          if (!nodeQuery && String(err).includes("node required")) {
            throw new Error("exec host=node requires a node id when multiple nodes are available (set tools.exec.node or exec.node).", { cause: err });
          }
          throw err;
        }
        const nodeInfo = nodes.find((entry) => entry.nodeId === nodeId);
        const supportsSystemRun = Array.isArray(nodeInfo?.commands) ?
        nodeInfo?.commands?.includes("system.run") :
        false;
        if (!supportsSystemRun) {
          throw new Error("exec host=node requires a node that supports system.run (companion app or node host).");
        }
        const argv = (0, _nodeShell.buildNodeShellCommand)(params.command, nodeInfo?.platform);
        const nodeEnv = params.env ? { ...params.env } : undefined;
        if (nodeEnv) {
          applyPathPrepend(nodeEnv, defaultPathPrepend, { requireExisting: true });
        }
        const baseAllowlistEval = (0, _execApprovals.evaluateShellAllowlist)({
          command: params.command,
          allowlist: [],
          safeBins: new Set(),
          cwd: workdir,
          env
        });
        let analysisOk = baseAllowlistEval.analysisOk;
        let allowlistSatisfied = false;
        if (hostAsk === "on-miss" && hostSecurity === "allowlist" && analysisOk) {
          try {
            const approvalsSnapshot = await (0, _gateway.callGatewayTool)("exec.approvals.node.get", { timeoutMs: 10_000 }, { nodeId });
            const approvalsFile = approvalsSnapshot && typeof approvalsSnapshot === "object" ?
            approvalsSnapshot.file :
            undefined;
            if (approvalsFile && typeof approvalsFile === "object") {
              const resolved = (0, _execApprovals.resolveExecApprovalsFromFile)({
                file: approvalsFile,
                agentId,
                overrides: { security: "allowlist" }
              });
              // Allowlist-only precheck; safe bins are node-local and may diverge.
              const allowlistEval = (0, _execApprovals.evaluateShellAllowlist)({
                command: params.command,
                allowlist: resolved.allowlist,
                safeBins: new Set(),
                cwd: workdir,
                env
              });
              allowlistSatisfied = allowlistEval.allowlistSatisfied;
              analysisOk = allowlistEval.analysisOk;
            }
          }
          catch {

            // Fall back to requiring approval if node approvals cannot be fetched.
          }}
        const requiresAsk = (0, _execApprovals.requiresExecApproval)({
          ask: hostAsk,
          security: hostSecurity,
          analysisOk,
          allowlistSatisfied
        });
        const commandText = params.command;
        const invokeTimeoutMs = Math.max(10_000, (typeof params.timeout === "number" ? params.timeout : defaultTimeoutSec) * 1000 + 5_000);
        const buildInvokeParams = (approvedByAsk, approvalDecision, runId) => ({
          nodeId,
          command: "system.run",
          params: {
            command: argv,
            rawCommand: params.command,
            cwd: workdir,
            env: nodeEnv,
            timeoutMs: typeof params.timeout === "number" ? params.timeout * 1000 : undefined,
            agentId,
            sessionKey: defaults?.sessionKey,
            approved: approvedByAsk,
            approvalDecision: approvalDecision ?? undefined,
            runId: runId ?? undefined
          },
          idempotencyKey: _nodeCrypto.default.randomUUID()
        });
        if (requiresAsk) {
          const approvalId = _nodeCrypto.default.randomUUID();
          const approvalSlug = createApprovalSlug(approvalId);
          const expiresAtMs = Date.now() + DEFAULT_APPROVAL_TIMEOUT_MS;
          const contextKey = `exec:${approvalId}`;
          const noticeSeconds = Math.max(1, Math.round(approvalRunningNoticeMs / 1000));
          const warningText = warnings.length ? `${warnings.join("\n")}\n\n` : "";
          void (async () => {
            let decision = null;
            try {
              const decisionResult = await (0, _gateway.callGatewayTool)("exec.approval.request", { timeoutMs: DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS }, {
                id: approvalId,
                command: commandText,
                cwd: workdir,
                host: "node",
                security: hostSecurity,
                ask: hostAsk,
                agentId,
                resolvedPath: undefined,
                sessionKey: defaults?.sessionKey,
                timeoutMs: DEFAULT_APPROVAL_TIMEOUT_MS
              });
              const decisionValue = decisionResult && typeof decisionResult === "object" ?
              decisionResult.decision :
              undefined;
              decision = typeof decisionValue === "string" ? decisionValue : null;
            }
            catch {
              emitExecSystemEvent(`Exec denied (node=${nodeId} id=${approvalId}, approval-request-failed): ${commandText}`, { sessionKey: notifySessionKey, contextKey });
              return;
            }
            let approvedByAsk = false;
            let approvalDecision = null;
            let deniedReason = null;
            if (decision === "deny") {
              deniedReason = "user-denied";
            } else
            if (!decision) {
              if (askFallback === "full") {
                approvedByAsk = true;
                approvalDecision = "allow-once";
              } else
              if (askFallback === "allowlist") {

                // Defer allowlist enforcement to the node host.
              } else {
                deniedReason = "approval-timeout";
              }
            } else
            if (decision === "allow-once") {
              approvedByAsk = true;
              approvalDecision = "allow-once";
            } else
            if (decision === "allow-always") {
              approvedByAsk = true;
              approvalDecision = "allow-always";
            }
            if (deniedReason) {
              emitExecSystemEvent(`Exec denied (node=${nodeId} id=${approvalId}, ${deniedReason}): ${commandText}`, { sessionKey: notifySessionKey, contextKey });
              return;
            }
            let runningTimer = null;
            if (approvalRunningNoticeMs > 0) {
              runningTimer = setTimeout(() => {
                emitExecSystemEvent(`Exec running (node=${nodeId} id=${approvalId}, >${noticeSeconds}s): ${commandText}`, { sessionKey: notifySessionKey, contextKey });
              }, approvalRunningNoticeMs);
            }
            try {
              await (0, _gateway.callGatewayTool)("node.invoke", { timeoutMs: invokeTimeoutMs }, buildInvokeParams(approvedByAsk, approvalDecision, approvalId));
            }
            catch {
              emitExecSystemEvent(`Exec denied (node=${nodeId} id=${approvalId}, invoke-failed): ${commandText}`, { sessionKey: notifySessionKey, contextKey });
            } finally
            {
              if (runningTimer) {
                clearTimeout(runningTimer);
              }
            }
          })();
          return {
            content: [
            {
              type: "text",
              text: `${warningText}Approval required (id ${approvalSlug}). ` +
              "Approve to run; updates will arrive after completion."
            }],

            details: {
              status: "approval-pending",
              approvalId,
              approvalSlug,
              expiresAtMs,
              host: "node",
              command: commandText,
              cwd: workdir,
              nodeId
            }
          };
        }
        const startedAt = Date.now();
        const raw = await (0, _gateway.callGatewayTool)("node.invoke", { timeoutMs: invokeTimeoutMs }, buildInvokeParams(false, null));
        const payload = raw && typeof raw === "object" ? raw.payload : undefined;
        const payloadObj = payload && typeof payload === "object" ? payload : {};
        const stdout = typeof payloadObj.stdout === "string" ? payloadObj.stdout : "";
        const stderr = typeof payloadObj.stderr === "string" ? payloadObj.stderr : "";
        const errorText = typeof payloadObj.error === "string" ? payloadObj.error : "";
        const success = typeof payloadObj.success === "boolean" ? payloadObj.success : false;
        const exitCode = typeof payloadObj.exitCode === "number" ? payloadObj.exitCode : null;
        return {
          content: [
          {
            type: "text",
            text: stdout || stderr || errorText || ""
          }],

          details: {
            status: success ? "completed" : "failed",
            exitCode,
            durationMs: Date.now() - startedAt,
            aggregated: [stdout, stderr, errorText].filter(Boolean).join("\n"),
            cwd: workdir
          }
        };
      }
      if (host === "gateway" && !bypassApprovals) {
        const approvals = (0, _execApprovals.resolveExecApprovals)(agentId, { security, ask });
        const hostSecurity = (0, _execApprovals.minSecurity)(security, approvals.agent.security);
        const hostAsk = (0, _execApprovals.maxAsk)(ask, approvals.agent.ask);
        const askFallback = approvals.agent.askFallback;
        if (hostSecurity === "deny") {
          throw new Error("exec denied: host=gateway security=deny");
        }
        const allowlistEval = (0, _execApprovals.evaluateShellAllowlist)({
          command: params.command,
          allowlist: approvals.allowlist,
          safeBins,
          cwd: workdir,
          env
        });
        const allowlistMatches = allowlistEval.allowlistMatches;
        const analysisOk = allowlistEval.analysisOk;
        const allowlistSatisfied = hostSecurity === "allowlist" && analysisOk ? allowlistEval.allowlistSatisfied : false;
        const requiresAsk = (0, _execApprovals.requiresExecApproval)({
          ask: hostAsk,
          security: hostSecurity,
          analysisOk,
          allowlistSatisfied
        });
        if (requiresAsk) {
          const approvalId = _nodeCrypto.default.randomUUID();
          const approvalSlug = createApprovalSlug(approvalId);
          const expiresAtMs = Date.now() + DEFAULT_APPROVAL_TIMEOUT_MS;
          const contextKey = `exec:${approvalId}`;
          const resolvedPath = allowlistEval.segments[0]?.resolution?.resolvedPath;
          const noticeSeconds = Math.max(1, Math.round(approvalRunningNoticeMs / 1000));
          const commandText = params.command;
          const effectiveTimeout = typeof params.timeout === "number" ? params.timeout : defaultTimeoutSec;
          const warningText = warnings.length ? `${warnings.join("\n")}\n\n` : "";
          void (async () => {
            let decision = null;
            try {
              const decisionResult = await (0, _gateway.callGatewayTool)("exec.approval.request", { timeoutMs: DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS }, {
                id: approvalId,
                command: commandText,
                cwd: workdir,
                host: "gateway",
                security: hostSecurity,
                ask: hostAsk,
                agentId,
                resolvedPath,
                sessionKey: defaults?.sessionKey,
                timeoutMs: DEFAULT_APPROVAL_TIMEOUT_MS
              });
              const decisionValue = decisionResult && typeof decisionResult === "object" ?
              decisionResult.decision :
              undefined;
              decision = typeof decisionValue === "string" ? decisionValue : null;
            }
            catch {
              emitExecSystemEvent(`Exec denied (gateway id=${approvalId}, approval-request-failed): ${commandText}`, { sessionKey: notifySessionKey, contextKey });
              return;
            }
            let approvedByAsk = false;
            let deniedReason = null;
            if (decision === "deny") {
              deniedReason = "user-denied";
            } else
            if (!decision) {
              if (askFallback === "full") {
                approvedByAsk = true;
              } else
              if (askFallback === "allowlist") {
                if (!analysisOk || !allowlistSatisfied) {
                  deniedReason = "approval-timeout (allowlist-miss)";
                } else
                {
                  approvedByAsk = true;
                }
              } else
              {
                deniedReason = "approval-timeout";
              }
            } else
            if (decision === "allow-once") {
              approvedByAsk = true;
            } else
            if (decision === "allow-always") {
              approvedByAsk = true;
              if (hostSecurity === "allowlist") {
                for (const segment of allowlistEval.segments) {
                  const pattern = segment.resolution?.resolvedPath ?? "";
                  if (pattern) {
                    (0, _execApprovals.addAllowlistEntry)(approvals.file, agentId, pattern);
                  }
                }
              }
            }
            if (hostSecurity === "allowlist" && (
            !analysisOk || !allowlistSatisfied) &&
            !approvedByAsk) {
              deniedReason = deniedReason ?? "allowlist-miss";
            }
            if (deniedReason) {
              emitExecSystemEvent(`Exec denied (gateway id=${approvalId}, ${deniedReason}): ${commandText}`, { sessionKey: notifySessionKey, contextKey });
              return;
            }
            if (allowlistMatches.length > 0) {
              const seen = new Set();
              for (const match of allowlistMatches) {
                if (seen.has(match.pattern)) {
                  continue;
                }
                seen.add(match.pattern);
                (0, _execApprovals.recordAllowlistUse)(approvals.file, agentId, match, commandText, resolvedPath ?? undefined);
              }
            }
            let run = null;
            try {
              run = await runExecProcess({
                command: commandText,
                workdir,
                env,
                sandbox: undefined,
                containerWorkdir: null,
                usePty: params.pty === true && !sandbox,
                warnings,
                maxOutput,
                pendingMaxOutput,
                notifyOnExit: false,
                scopeKey: defaults?.scopeKey,
                sessionKey: notifySessionKey,
                timeoutSec: effectiveTimeout
              });
            }
            catch {
              emitExecSystemEvent(`Exec denied (gateway id=${approvalId}, spawn-failed): ${commandText}`, { sessionKey: notifySessionKey, contextKey });
              return;
            }
            (0, _bashProcessRegistry.markBackgrounded)(run.session);
            let runningTimer = null;
            if (approvalRunningNoticeMs > 0) {
              runningTimer = setTimeout(() => {
                emitExecSystemEvent(`Exec running (gateway id=${approvalId}, session=${run?.session.id}, >${noticeSeconds}s): ${commandText}`, { sessionKey: notifySessionKey, contextKey });
              }, approvalRunningNoticeMs);
            }
            const outcome = await run.promise;
            if (runningTimer) {
              clearTimeout(runningTimer);
            }
            const output = normalizeNotifyOutput((0, _bashProcessRegistry.tail)(outcome.aggregated || "", DEFAULT_NOTIFY_TAIL_CHARS));
            const exitLabel = outcome.timedOut ? "timeout" : `code ${outcome.exitCode ?? "?"}`;
            const summary = output ?
            `Exec finished (gateway id=${approvalId}, session=${run.session.id}, ${exitLabel})\n${output}` :
            `Exec finished (gateway id=${approvalId}, session=${run.session.id}, ${exitLabel})`;
            emitExecSystemEvent(summary, { sessionKey: notifySessionKey, contextKey });
          })();
          return {
            content: [
            {
              type: "text",
              text: `${warningText}Approval required (id ${approvalSlug}). ` +
              "Approve to run; updates will arrive after completion."
            }],

            details: {
              status: "approval-pending",
              approvalId,
              approvalSlug,
              expiresAtMs,
              host: "gateway",
              command: params.command,
              cwd: workdir
            }
          };
        }
        if (hostSecurity === "allowlist" && (!analysisOk || !allowlistSatisfied)) {
          throw new Error("exec denied: allowlist miss");
        }
        if (allowlistMatches.length > 0) {
          const seen = new Set();
          for (const match of allowlistMatches) {
            if (seen.has(match.pattern)) {
              continue;
            }
            seen.add(match.pattern);
            (0, _execApprovals.recordAllowlistUse)(approvals.file, agentId, match, params.command, allowlistEval.segments[0]?.resolution?.resolvedPath);
          }
        }
      }
      const effectiveTimeout = typeof params.timeout === "number" ? params.timeout : defaultTimeoutSec;
      const getWarningText = () => warnings.length ? `${warnings.join("\n")}\n\n` : "";
      const usePty = params.pty === true && !sandbox;
      const run = await runExecProcess({
        command: params.command,
        workdir,
        env,
        sandbox,
        containerWorkdir,
        usePty,
        warnings,
        maxOutput,
        pendingMaxOutput,
        notifyOnExit,
        scopeKey: defaults?.scopeKey,
        sessionKey: notifySessionKey,
        timeoutSec: effectiveTimeout,
        onUpdate
      });
      let yielded = false;
      let yieldTimer = null;
      // Tool-call abort should not kill backgrounded sessions; timeouts still must.
      const onAbortSignal = () => {
        if (yielded || run.session.backgrounded) {
          return;
        }
        run.kill();
      };
      if (signal?.aborted) {
        onAbortSignal();
      } else
      if (signal) {
        signal.addEventListener("abort", onAbortSignal, { once: true });
      }
      return new Promise((resolve, reject) => {
        const resolveRunning = () => resolve({
          content: [
          {
            type: "text",
            text: `${getWarningText()}Command still running (session ${run.session.id}, pid ${run.session.pid ?? "n/a"}). Use process (list/poll/log/write/kill/clear/remove) for follow-up.`
          }],

          details: {
            status: "running",
            sessionId: run.session.id,
            pid: run.session.pid ?? undefined,
            startedAt: run.startedAt,
            cwd: run.session.cwd,
            tail: run.session.tail
          }
        });
        const onYieldNow = () => {
          if (yieldTimer) {
            clearTimeout(yieldTimer);
          }
          if (yielded) {
            return;
          }
          yielded = true;
          (0, _bashProcessRegistry.markBackgrounded)(run.session);
          resolveRunning();
        };
        if (allowBackground && yieldWindow !== null) {
          if (yieldWindow === 0) {
            onYieldNow();
          } else
          {
            yieldTimer = setTimeout(() => {
              if (yielded) {
                return;
              }
              yielded = true;
              (0, _bashProcessRegistry.markBackgrounded)(run.session);
              resolveRunning();
            }, yieldWindow);
          }
        }
        run.promise.
        then((outcome) => {
          if (yieldTimer) {
            clearTimeout(yieldTimer);
          }
          if (yielded || run.session.backgrounded) {
            return;
          }
          if (outcome.status === "failed") {
            reject(new Error(outcome.reason ?? "Command failed."));
            return;
          }
          resolve({
            content: [
            {
              type: "text",
              text: `${getWarningText()}${outcome.aggregated || "(no output)"}`
            }],

            details: {
              status: "completed",
              exitCode: outcome.exitCode ?? 0,
              durationMs: outcome.durationMs,
              aggregated: outcome.aggregated,
              cwd: run.session.cwd
            }
          });
        }).
        catch((err) => {
          if (yieldTimer) {
            clearTimeout(yieldTimer);
          }
          if (yielded || run.session.backgrounded) {
            return;
          }
          reject(err);
        });
      });
    }
  };
}
const execTool = exports.execTool = createExecTool(); /* v9-86a19b65df51d58b */
