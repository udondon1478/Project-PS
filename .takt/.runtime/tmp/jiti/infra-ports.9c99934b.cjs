"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.PortInUseError = void 0;Object.defineProperty(exports, "buildPortHints", { enumerable: true, get: function () {return _portsFormat.buildPortHints;} });Object.defineProperty(exports, "classifyPortListener", { enumerable: true, get: function () {return _portsFormat.classifyPortListener;} });exports.describePortOwner = describePortOwner;exports.ensurePortAvailable = ensurePortAvailable;Object.defineProperty(exports, "formatPortDiagnostics", { enumerable: true, get: function () {return _portsFormat.formatPortDiagnostics;} });exports.handlePortError = handlePortError;Object.defineProperty(exports, "inspectPortUsage", { enumerable: true, get: function () {return _portsInspect.inspectPortUsage;} });var _nodeNet = _interopRequireDefault(require("node:net"));
var _globals = require("../globals.js");
var _logger = require("../logger.js");
var _runtime = require("../runtime.js");
var _portsFormat = require("./ports-format.js");
var _portsInspect = require("./ports-inspect.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
class PortInUseError extends Error {
  port;
  details;
  constructor(port, details) {
    super(`Port ${port} is already in use.`);
    this.name = "PortInUseError";
    this.port = port;
    this.details = details;
  }
}exports.PortInUseError = PortInUseError;
function isErrno(err) {
  return Boolean(err && typeof err === "object" && "code" in err);
}
async function describePortOwner(port) {
  const diagnostics = await (0, _portsInspect.inspectPortUsage)(port);
  if (diagnostics.listeners.length === 0) {
    return undefined;
  }
  return (0, _portsFormat.formatPortDiagnostics)(diagnostics).join("\n");
}
async function ensurePortAvailable(port) {
  // Detect EADDRINUSE early with a friendly message.
  try {
    await new Promise((resolve, reject) => {
      const tester = _nodeNet.default.
      createServer().
      once("error", (err) => reject(err)).
      once("listening", () => {
        tester.close(() => resolve());
      }).
      listen(port);
    });
  }
  catch (err) {
    if (isErrno(err) && err.code === "EADDRINUSE") {
      const details = await describePortOwner(port);
      throw new PortInUseError(port, details);
    }
    throw err;
  }
}
async function handlePortError(err, port, context, runtime = _runtime.defaultRuntime) {
  // Uniform messaging for EADDRINUSE with optional owner details.
  if (err instanceof PortInUseError || isErrno(err) && err.code === "EADDRINUSE") {
    const details = err instanceof PortInUseError ? err.details : await describePortOwner(port);
    runtime.error((0, _globals.danger)(`${context} failed: port ${port} is already in use.`));
    if (details) {
      runtime.error((0, _globals.info)("Port listener details:"));
      runtime.error(details);
      if (/openclaw|src\/index\.ts|dist\/index\.js/.test(details)) {
        runtime.error((0, _globals.warn)("It looks like another OpenClaw instance is already running. Stop it or pick a different port."));
      }
    }
    runtime.error((0, _globals.info)("Resolve by stopping the process using the port or passing --port <free-port>."));
    runtime.exit(1);
  }
  runtime.error((0, _globals.danger)(`${context} failed: ${String(err)}`));
  if ((0, _globals.shouldLogVerbose)()) {
    const stdout = err?.stdout;
    const stderr = err?.stderr;
    if (stdout?.trim()) {
      (0, _logger.logDebug)(`stdout: ${stdout.trim()}`);
    }
    if (stderr?.trim()) {
      (0, _logger.logDebug)(`stderr: ${stderr.trim()}`);
    }
  }
  return runtime.exit(1);
} /* v9-9dd0f92374ebf262 */
