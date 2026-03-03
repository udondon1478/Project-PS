"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.describeUnknownError = describeUnknownError;exports.mapThinkingLevel = mapThinkingLevel;exports.resolveExecToolDefaults = resolveExecToolDefaults;function mapThinkingLevel(level) {
  // pi-agent-core supports "xhigh"; OpenClaw enables it for specific models.
  if (!level) {
    return "off";
  }
  return level;
}
function resolveExecToolDefaults(config) {
  const tools = config?.tools;
  if (!tools?.exec) {
    return undefined;
  }
  return tools.exec;
}
function describeUnknownError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    const serialized = JSON.stringify(error);
    return serialized ?? "Unknown error";
  }
  catch {
    return "Unknown error";
  }
} /* v9-ebb5bd6d4ac40561 */
