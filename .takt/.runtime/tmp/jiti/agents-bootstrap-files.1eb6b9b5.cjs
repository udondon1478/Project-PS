"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.makeBootstrapWarn = makeBootstrapWarn;exports.resolveBootstrapContextForRun = resolveBootstrapContextForRun;exports.resolveBootstrapFilesForRun = resolveBootstrapFilesForRun;var _bootstrapHooks = require("./bootstrap-hooks.js");
var _piEmbeddedHelpers = require("./pi-embedded-helpers.js");
var _workspace = require("./workspace.js");
function makeBootstrapWarn(params) {
  if (!params.warn) {
    return undefined;
  }
  return (message) => params.warn?.(`${message} (sessionKey=${params.sessionLabel})`);
}
async function resolveBootstrapFilesForRun(params) {
  const sessionKey = params.sessionKey ?? params.sessionId;
  const bootstrapFiles = (0, _workspace.filterBootstrapFilesForSession)(await (0, _workspace.loadWorkspaceBootstrapFiles)(params.workspaceDir), sessionKey);
  return (0, _bootstrapHooks.applyBootstrapHookOverrides)({
    files: bootstrapFiles,
    workspaceDir: params.workspaceDir,
    config: params.config,
    sessionKey: params.sessionKey,
    sessionId: params.sessionId,
    agentId: params.agentId
  });
}
async function resolveBootstrapContextForRun(params) {
  const bootstrapFiles = await resolveBootstrapFilesForRun(params);
  const contextFiles = (0, _piEmbeddedHelpers.buildBootstrapContextFiles)(bootstrapFiles, {
    maxChars: (0, _piEmbeddedHelpers.resolveBootstrapMaxChars)(params.config),
    warn: params.warn
  });
  return { bootstrapFiles, contextFiles };
} /* v9-506f97e89a7f4e2a */
