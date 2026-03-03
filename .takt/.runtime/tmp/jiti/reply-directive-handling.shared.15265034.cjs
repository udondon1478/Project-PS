"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatElevatedRuntimeHint = exports.formatElevatedEvent = exports.formatDirectiveAck = exports.SYSTEM_MARK = void 0;exports.formatElevatedUnavailableText = formatElevatedUnavailableText;exports.withOptions = exports.formatReasoningEvent = exports.formatOptionsLine = void 0;var _commandFormat = require("../../cli/command-format.js");
const SYSTEM_MARK = exports.SYSTEM_MARK = "⚙️";
const formatDirectiveAck = (text) => {
  if (!text) {
    return text;
  }
  if (text.startsWith(SYSTEM_MARK)) {
    return text;
  }
  return `${SYSTEM_MARK} ${text}`;
};exports.formatDirectiveAck = formatDirectiveAck;
const formatOptionsLine = (options) => `Options: ${options}.`;exports.formatOptionsLine = formatOptionsLine;
const withOptions = (line, options) => `${line}\n${formatOptionsLine(options)}`;exports.withOptions = withOptions;
const formatElevatedRuntimeHint = () => `${SYSTEM_MARK} Runtime is direct; sandboxing does not apply.`;exports.formatElevatedRuntimeHint = formatElevatedRuntimeHint;
const formatElevatedEvent = (level) => {
  if (level === "full") {
    return "Elevated FULL — exec runs on host with auto-approval.";
  }
  if (level === "ask" || level === "on") {
    return "Elevated ASK — exec runs on host; approvals may still apply.";
  }
  return "Elevated OFF — exec stays in sandbox.";
};exports.formatElevatedEvent = formatElevatedEvent;
const formatReasoningEvent = (level) => {
  if (level === "stream") {
    return "Reasoning STREAM — emit live <think>.";
  }
  if (level === "on") {
    return "Reasoning ON — include <think>.";
  }
  return "Reasoning OFF — hide <think>.";
};exports.formatReasoningEvent = formatReasoningEvent;
function formatElevatedUnavailableText(params) {
  const lines = [];
  lines.push(`elevated is not available right now (runtime=${params.runtimeSandboxed ? "sandboxed" : "direct"}).`);
  const failures = params.failures ?? [];
  if (failures.length > 0) {
    lines.push(`Failing gates: ${failures.map((f) => `${f.gate} (${f.key})`).join(", ")}`);
  } else
  {
    lines.push("Fix-it keys: tools.elevated.enabled, tools.elevated.allowFrom.<provider>, agents.list[].tools.elevated.*");
  }
  if (params.sessionKey) {
    lines.push(`See: ${(0, _commandFormat.formatCliCommand)(`openclaw sandbox explain --session ${params.sessionKey}`)}`);
  }
  return lines.join("\n");
} /* v9-dfbf4fe8fe1c94ac */
