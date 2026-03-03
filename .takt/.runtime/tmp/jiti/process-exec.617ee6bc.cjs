"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.runCommandWithTimeout = runCommandWithTimeout;exports.runExec = runExec;var _nodeChild_process = require("node:child_process");
var _nodePath = _interopRequireDefault(require("node:path"));
var _nodeUtil = require("node:util");
var _globals = require("../globals.js");
var _logger = require("../logger.js");
var _spawnUtils = require("./spawn-utils.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const execFileAsync = (0, _nodeUtil.promisify)(_nodeChild_process.execFile);
/**
 * Resolves a command for Windows compatibility.
 * On Windows, non-.exe commands (like npm, pnpm) require their .cmd extension.
 */
function resolveCommand(command) {
  if (process.platform !== "win32") {
    return command;
  }
  const basename = _nodePath.default.basename(command).toLowerCase();
  // Skip if already has an extension (.cmd, .exe, .bat, etc.)
  const ext = _nodePath.default.extname(basename);
  if (ext) {
    return command;
  }
  // Common npm-related commands that need .cmd extension on Windows
  const cmdCommands = ["npm", "pnpm", "yarn", "npx"];
  if (cmdCommands.includes(basename)) {
    return `${command}.cmd`;
  }
  return command;
}
// Simple promise-wrapped execFile with optional verbosity logging.
async function runExec(command, args, opts = 10_000) {
  const options = typeof opts === "number" ?
  { timeout: opts, encoding: "utf8" } :
  {
    timeout: opts.timeoutMs,
    maxBuffer: opts.maxBuffer,
    encoding: "utf8"
  };
  try {
    const { stdout, stderr } = await execFileAsync(resolveCommand(command), args, options);
    if ((0, _globals.shouldLogVerbose)()) {
      if (stdout.trim()) {
        (0, _logger.logDebug)(stdout.trim());
      }
      if (stderr.trim()) {
        (0, _logger.logError)(stderr.trim());
      }
    }
    return { stdout, stderr };
  }
  catch (err) {
    if ((0, _globals.shouldLogVerbose)()) {
      (0, _logger.logError)((0, _globals.danger)(`Command failed: ${command} ${args.join(" ")}`));
    }
    throw err;
  }
}
async function runCommandWithTimeout(argv, optionsOrTimeout) {
  const options = typeof optionsOrTimeout === "number" ? { timeoutMs: optionsOrTimeout } : optionsOrTimeout;
  const { timeoutMs, cwd, input, env } = options;
  const { windowsVerbatimArguments } = options;
  const hasInput = input !== undefined;
  const shouldSuppressNpmFund = (() => {
    const cmd = _nodePath.default.basename(argv[0] ?? "");
    if (cmd === "npm" || cmd === "npm.cmd" || cmd === "npm.exe") {
      return true;
    }
    if (cmd === "node" || cmd === "node.exe") {
      const script = argv[1] ?? "";
      return script.includes("npm-cli.js");
    }
    return false;
  })();
  const resolvedEnv = env ? { ...process.env, ...env } : { ...process.env };
  if (shouldSuppressNpmFund) {
    if (resolvedEnv.NPM_CONFIG_FUND == null) {
      resolvedEnv.NPM_CONFIG_FUND = "false";
    }
    if (resolvedEnv.npm_config_fund == null) {
      resolvedEnv.npm_config_fund = "false";
    }
  }
  const stdio = (0, _spawnUtils.resolveCommandStdio)({ hasInput, preferInherit: true });
  const child = (0, _nodeChild_process.spawn)(resolveCommand(argv[0]), argv.slice(1), {
    stdio,
    cwd,
    env: resolvedEnv,
    windowsVerbatimArguments
  });
  // Spawn with inherited stdin (TTY) so tools like `pi` stay interactive when needed.
  return await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (typeof child.kill === "function") {
        child.kill("SIGKILL");
      }
    }, timeoutMs);
    if (hasInput && child.stdin) {
      child.stdin.write(input ?? "");
      child.stdin.end();
    }
    child.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, code, signal, killed: child.killed });
    });
  });
} /* v9-8036557522ecf390 */
