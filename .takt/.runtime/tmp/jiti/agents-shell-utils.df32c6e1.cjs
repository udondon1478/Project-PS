"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getShellConfig = getShellConfig;exports.killProcessTree = killProcessTree;exports.sanitizeBinaryOutput = sanitizeBinaryOutput;var _nodeChild_process = require("node:child_process");
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function resolvePowerShellPath() {
  const systemRoot = process.env.SystemRoot || process.env.WINDIR;
  if (systemRoot) {
    const candidate = _nodePath.default.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    if (_nodeFs.default.existsSync(candidate)) {
      return candidate;
    }
  }
  return "powershell.exe";
}
function getShellConfig() {
  if (process.platform === "win32") {
    // Use PowerShell instead of cmd.exe on Windows.
    // Problem: Many Windows system utilities (ipconfig, systeminfo, etc.) write
    // directly to the console via WriteConsole API, bypassing stdout pipes.
    // When Node.js spawns cmd.exe with piped stdio, these utilities produce no output.
    // PowerShell properly captures and redirects their output to stdout.
    return {
      shell: resolvePowerShellPath(),
      args: ["-NoProfile", "-NonInteractive", "-Command"]
    };
  }
  const envShell = process.env.SHELL?.trim();
  const shellName = envShell ? _nodePath.default.basename(envShell) : "";
  // Fish rejects common bashisms used by tools, so prefer bash when detected.
  if (shellName === "fish") {
    const bash = resolveShellFromPath("bash");
    if (bash) {
      return { shell: bash, args: ["-c"] };
    }
    const sh = resolveShellFromPath("sh");
    if (sh) {
      return { shell: sh, args: ["-c"] };
    }
  }
  const shell = envShell && envShell.length > 0 ? envShell : "sh";
  return { shell, args: ["-c"] };
}
function resolveShellFromPath(name) {
  const envPath = process.env.PATH ?? "";
  if (!envPath) {
    return undefined;
  }
  const entries = envPath.split(_nodePath.default.delimiter).filter(Boolean);
  for (const entry of entries) {
    const candidate = _nodePath.default.join(entry, name);
    try {
      _nodeFs.default.accessSync(candidate, _nodeFs.default.constants.X_OK);
      return candidate;
    }
    catch {

      // ignore missing or non-executable entries
    }}
  return undefined;
}
function sanitizeBinaryOutput(text) {
  const scrubbed = text.replace(/[\p{Format}\p{Surrogate}]/gu, "");
  if (!scrubbed) {
    return scrubbed;
  }
  const chunks = [];
  for (const char of scrubbed) {
    const code = char.codePointAt(0);
    if (code == null) {
      continue;
    }
    if (code === 0x09 || code === 0x0a || code === 0x0d) {
      chunks.push(char);
      continue;
    }
    if (code < 0x20) {
      continue;
    }
    chunks.push(char);
  }
  return chunks.join("");
}
function killProcessTree(pid) {
  if (process.platform === "win32") {
    try {
      (0, _nodeChild_process.spawn)("taskkill", ["/F", "/T", "/PID", String(pid)], {
        stdio: "ignore",
        detached: true
      });
    }
    catch {

      // ignore errors if taskkill fails
    }return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  }
  catch {
    try {
      process.kill(pid, "SIGKILL");
    }
    catch {

      // process already dead
    }}
} /* v9-69a4f56605827521 */
