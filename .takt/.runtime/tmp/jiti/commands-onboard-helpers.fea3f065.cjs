"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DEFAULT_WORKSPACE = void 0;exports.applyWizardMetadata = applyWizardMetadata;exports.detectBinary = detectBinary;exports.detectBrowserOpenSupport = detectBrowserOpenSupport;exports.ensureWorkspaceAndSessions = ensureWorkspaceAndSessions;exports.formatControlUiSshHint = formatControlUiSshHint;exports.guardCancel = guardCancel;exports.handleReset = handleReset;exports.moveToTrash = moveToTrash;exports.normalizeGatewayTokenInput = normalizeGatewayTokenInput;exports.openUrl = openUrl;exports.openUrlInBackground = openUrlInBackground;exports.printWizardHeader = printWizardHeader;exports.probeGatewayReachable = probeGatewayReachable;exports.randomToken = randomToken;exports.resolveBrowserOpenCommand = resolveBrowserOpenCommand;exports.resolveControlUiLinks = resolveControlUiLinks;exports.resolveNodeManagerOptions = resolveNodeManagerOptions;exports.summarizeExistingConfig = summarizeExistingConfig;exports.waitForGatewayReachable = waitForGatewayReachable;var _prompts = require("@clack/prompts");
var _nodeCrypto = _interopRequireDefault(require("node:crypto"));
var _promises = _interopRequireDefault(require("node:fs/promises"));
var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUtil = require("node:util");
var _workspace = require("../agents/workspace.js");
var _config = require("../config/config.js");
var _sessions = require("../config/sessions.js");
var _call = require("../gateway/call.js");
var _controlUiShared = require("../gateway/control-ui-shared.js");
var _execSafety = require("../infra/exec-safety.js");
var _tailnet = require("../infra/tailnet.js");
var _wsl = require("../infra/wsl.js");
var _exec = require("../process/exec.js");
var _promptStyle = require("../terminal/prompt-style.js");
var _utils = require("../utils.js");
var _messageChannel = require("../utils/message-channel.js");
var _version = require("../version.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function guardCancel(value, runtime) {
  if ((0, _prompts.isCancel)(value)) {
    (0, _prompts.cancel)((0, _promptStyle.stylePromptTitle)("Setup cancelled.") ?? "Setup cancelled.");
    runtime.exit(0);
  }
  return value;
}
function summarizeExistingConfig(config) {
  const rows = [];
  const defaults = config.agents?.defaults;
  if (defaults?.workspace) {
    rows.push((0, _utils.shortenHomeInString)(`workspace: ${defaults.workspace}`));
  }
  if (defaults?.model) {
    const model = typeof defaults.model === "string" ? defaults.model : defaults.model.primary;
    if (model) {
      rows.push((0, _utils.shortenHomeInString)(`model: ${model}`));
    }
  }
  if (config.gateway?.mode) {
    rows.push((0, _utils.shortenHomeInString)(`gateway.mode: ${config.gateway.mode}`));
  }
  if (typeof config.gateway?.port === "number") {
    rows.push((0, _utils.shortenHomeInString)(`gateway.port: ${config.gateway.port}`));
  }
  if (config.gateway?.bind) {
    rows.push((0, _utils.shortenHomeInString)(`gateway.bind: ${config.gateway.bind}`));
  }
  if (config.gateway?.remote?.url) {
    rows.push((0, _utils.shortenHomeInString)(`gateway.remote.url: ${config.gateway.remote.url}`));
  }
  if (config.skills?.install?.nodeManager) {
    rows.push((0, _utils.shortenHomeInString)(`skills.nodeManager: ${config.skills.install.nodeManager}`));
  }
  return rows.length ? rows.join("\n") : "No key settings detected.";
}
function randomToken() {
  return _nodeCrypto.default.randomBytes(24).toString("hex");
}
function normalizeGatewayTokenInput(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}
function printWizardHeader(runtime) {
  const header = [
  "▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄",
  "██░▄▄▄░██░▄▄░██░▄▄▄██░▀██░██░▄▄▀██░████░▄▄▀██░███░██",
  "██░███░██░▀▀░██░▄▄▄██░█░█░██░█████░████░▀▀░██░█░█░██",
  "██░▀▀▀░██░█████░▀▀▀██░██▄░██░▀▀▄██░▀▀░█░██░██▄▀▄▀▄██",
  "▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀",
  "                  🦞 OPENCLAW 🦞                    ",
  " "].
  join("\n");
  runtime.log(header);
}
function applyWizardMetadata(cfg, params) {
  const commit = process.env.GIT_COMMIT?.trim() || process.env.GIT_SHA?.trim() || undefined;
  return {
    ...cfg,
    wizard: {
      ...cfg.wizard,
      lastRunAt: new Date().toISOString(),
      lastRunVersion: _version.VERSION,
      lastRunCommit: commit,
      lastRunCommand: params.command,
      lastRunMode: params.mode
    }
  };
}
async function resolveBrowserOpenCommand() {
  const platform = process.platform;
  const hasDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  const isSsh = Boolean(process.env.SSH_CLIENT) ||
  Boolean(process.env.SSH_TTY) ||
  Boolean(process.env.SSH_CONNECTION);
  if (isSsh && !hasDisplay && platform !== "win32") {
    return { argv: null, reason: "ssh-no-display" };
  }
  if (platform === "win32") {
    return {
      argv: ["cmd", "/c", "start", ""],
      command: "cmd",
      quoteUrl: true
    };
  }
  if (platform === "darwin") {
    const hasOpen = await detectBinary("open");
    return hasOpen ? { argv: ["open"], command: "open" } : { argv: null, reason: "missing-open" };
  }
  if (platform === "linux") {
    const wsl = await (0, _wsl.isWSL)();
    if (!hasDisplay && !wsl) {
      return { argv: null, reason: "no-display" };
    }
    if (wsl) {
      const hasWslview = await detectBinary("wslview");
      if (hasWslview) {
        return { argv: ["wslview"], command: "wslview" };
      }
      if (!hasDisplay) {
        return { argv: null, reason: "wsl-no-wslview" };
      }
    }
    const hasXdgOpen = await detectBinary("xdg-open");
    return hasXdgOpen ?
    { argv: ["xdg-open"], command: "xdg-open" } :
    { argv: null, reason: "missing-xdg-open" };
  }
  return { argv: null, reason: "unsupported-platform" };
}
async function detectBrowserOpenSupport() {
  const resolved = await resolveBrowserOpenCommand();
  if (!resolved.argv) {
    return { ok: false, reason: resolved.reason };
  }
  return { ok: true, command: resolved.command };
}
function formatControlUiSshHint(params) {
  const basePath = (0, _controlUiShared.normalizeControlUiBasePath)(params.basePath);
  const uiPath = basePath ? `${basePath}/` : "/";
  const localUrl = `http://localhost:${params.port}${uiPath}`;
  const tokenParam = params.token ? `?token=${encodeURIComponent(params.token)}` : "";
  const authedUrl = params.token ? `${localUrl}${tokenParam}` : undefined;
  const sshTarget = resolveSshTargetHint();
  return [
  "No GUI detected. Open from your computer:",
  `ssh -N -L ${params.port}:127.0.0.1:${params.port} ${sshTarget}`,
  "Then open:",
  localUrl,
  authedUrl,
  "Docs:",
  "https://docs.openclaw.ai/gateway/remote",
  "https://docs.openclaw.ai/web/control-ui"].

  filter(Boolean).
  join("\n");
}
function resolveSshTargetHint() {
  const user = process.env.USER || process.env.LOGNAME || "user";
  const conn = process.env.SSH_CONNECTION?.trim().split(/\s+/);
  const host = conn?.[2] ?? "<host>";
  return `${user}@${host}`;
}
async function openUrl(url) {
  if (shouldSkipBrowserOpenInTests()) {
    return false;
  }
  const resolved = await resolveBrowserOpenCommand();
  if (!resolved.argv) {
    return false;
  }
  const quoteUrl = resolved.quoteUrl === true;
  const command = [...resolved.argv];
  if (quoteUrl) {
    if (command.at(-1) === "") {
      // Preserve the empty title token for `start` when using verbatim args.
      command[command.length - 1] = '""';
    }
    command.push(`"${url}"`);
  } else
  {
    command.push(url);
  }
  try {
    await (0, _exec.runCommandWithTimeout)(command, {
      timeoutMs: 5_000,
      windowsVerbatimArguments: quoteUrl
    });
    return true;
  }
  catch {
    // ignore; we still print the URL for manual open
    return false;
  }
}
async function openUrlInBackground(url) {
  if (shouldSkipBrowserOpenInTests()) {
    return false;
  }
  if (process.platform !== "darwin") {
    return false;
  }
  const resolved = await resolveBrowserOpenCommand();
  if (!resolved.argv || resolved.command !== "open") {
    return false;
  }
  const command = ["open", "-g", url];
  try {
    await (0, _exec.runCommandWithTimeout)(command, { timeoutMs: 5_000 });
    return true;
  }
  catch {
    return false;
  }
}
async function ensureWorkspaceAndSessions(workspaceDir, runtime, options) {
  const ws = await (0, _workspace.ensureAgentWorkspace)({
    dir: workspaceDir,
    ensureBootstrapFiles: !options?.skipBootstrap
  });
  runtime.log(`Workspace OK: ${(0, _utils.shortenHomePath)(ws.dir)}`);
  const sessionsDir = (0, _sessions.resolveSessionTranscriptsDirForAgent)(options?.agentId);
  await _promises.default.mkdir(sessionsDir, { recursive: true });
  runtime.log(`Sessions OK: ${(0, _utils.shortenHomePath)(sessionsDir)}`);
}
function resolveNodeManagerOptions() {
  return [
  { value: "npm", label: "npm" },
  { value: "pnpm", label: "pnpm" },
  { value: "bun", label: "bun" }];

}
async function moveToTrash(pathname, runtime) {
  if (!pathname) {
    return;
  }
  try {
    await _promises.default.access(pathname);
  }
  catch {
    return;
  }
  try {
    await (0, _exec.runCommandWithTimeout)(["trash", pathname], { timeoutMs: 5000 });
    runtime.log(`Moved to Trash: ${(0, _utils.shortenHomePath)(pathname)}`);
  }
  catch {
    runtime.log(`Failed to move to Trash (manual delete): ${(0, _utils.shortenHomePath)(pathname)}`);
  }
}
async function handleReset(scope, workspaceDir, runtime) {
  await moveToTrash(_config.CONFIG_PATH, runtime);
  if (scope === "config") {
    return;
  }
  await moveToTrash(_nodePath.default.join(_utils.CONFIG_DIR, "credentials"), runtime);
  await moveToTrash((0, _sessions.resolveSessionTranscriptsDirForAgent)(), runtime);
  if (scope === "full") {
    await moveToTrash(workspaceDir, runtime);
  }
}
async function detectBinary(name) {
  if (!name?.trim()) {
    return false;
  }
  if (!(0, _execSafety.isSafeExecutableValue)(name)) {
    return false;
  }
  const resolved = name.startsWith("~") ? (0, _utils.resolveUserPath)(name) : name;
  if (_nodePath.default.isAbsolute(resolved) ||
  resolved.startsWith(".") ||
  resolved.includes("/") ||
  resolved.includes("\\")) {
    try {
      await _promises.default.access(resolved);
      return true;
    }
    catch {
      return false;
    }
  }
  const command = process.platform === "win32" ? ["where", name] : ["/usr/bin/env", "which", name];
  try {
    const result = await (0, _exec.runCommandWithTimeout)(command, { timeoutMs: 2000 });
    return result.code === 0 && result.stdout.trim().length > 0;
  }
  catch {
    return false;
  }
}
function shouldSkipBrowserOpenInTests() {
  if (process.env.VITEST) {
    return true;
  }
  return process.env.NODE_ENV === "test";
}
async function probeGatewayReachable(params) {
  const url = params.url.trim();
  const timeoutMs = params.timeoutMs ?? 1500;
  try {
    await (0, _call.callGateway)({
      url,
      token: params.token,
      password: params.password,
      method: "health",
      timeoutMs,
      clientName: _messageChannel.GATEWAY_CLIENT_NAMES.PROBE,
      mode: _messageChannel.GATEWAY_CLIENT_MODES.PROBE
    });
    return { ok: true };
  }
  catch (err) {
    return { ok: false, detail: summarizeError(err) };
  }
}
async function waitForGatewayReachable(params) {
  const deadlineMs = params.deadlineMs ?? 15_000;
  const pollMs = params.pollMs ?? 400;
  const probeTimeoutMs = params.probeTimeoutMs ?? 1500;
  const startedAt = Date.now();
  let lastDetail;
  while (Date.now() - startedAt < deadlineMs) {
    const probe = await probeGatewayReachable({
      url: params.url,
      token: params.token,
      password: params.password,
      timeoutMs: probeTimeoutMs
    });
    if (probe.ok) {
      return probe;
    }
    lastDetail = probe.detail;
    await (0, _utils.sleep)(pollMs);
  }
  return { ok: false, detail: lastDetail };
}
function summarizeError(err) {
  let raw = "unknown error";
  if (err instanceof Error) {
    raw = err.message || raw;
  } else
  if (typeof err === "string") {
    raw = err || raw;
  } else
  if (err !== undefined) {
    raw = (0, _nodeUtil.inspect)(err, { depth: 2 });
  }
  const line = raw.
  split("\n").
  map((s) => s.trim()).
  find(Boolean) ?? raw;
  return line.length > 120 ? `${line.slice(0, 119)}…` : line;
}
const DEFAULT_WORKSPACE = exports.DEFAULT_WORKSPACE = _workspace.DEFAULT_AGENT_WORKSPACE_DIR;
function resolveControlUiLinks(params) {
  const port = params.port;
  const bind = params.bind ?? "loopback";
  const customBindHost = params.customBindHost?.trim();
  const tailnetIPv4 = (0, _tailnet.pickPrimaryTailnetIPv4)();
  const host = (() => {
    if (bind === "custom" && customBindHost && isValidIPv4(customBindHost)) {
      return customBindHost;
    }
    if (bind === "tailnet" && tailnetIPv4) {
      return tailnetIPv4 ?? "127.0.0.1";
    }
    return "127.0.0.1";
  })();
  const basePath = (0, _controlUiShared.normalizeControlUiBasePath)(params.basePath);
  const uiPath = basePath ? `${basePath}/` : "/";
  const wsPath = basePath ? basePath : "";
  return {
    httpUrl: `http://${host}:${port}${uiPath}`,
    wsUrl: `ws://${host}:${port}${wsPath}`
  };
}
function isValidIPv4(host) {
  const parts = host.split(".");
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((part) => {
    const n = Number.parseInt(part, 10);
    return !Number.isNaN(n) && n >= 0 && n <= 255 && part === String(n);
  });
} /* v9-763d82b0910859ea */
