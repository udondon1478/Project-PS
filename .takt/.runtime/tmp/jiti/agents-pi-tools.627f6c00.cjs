"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.__testing = void 0;exports.createOpenClawCodingTools = createOpenClawCodingTools;var _piCodingAgent = require("@mariozechner/pi-coding-agent");
var _logger = require("../logger.js");
var _tools = require("../plugins/tools.js");
var _sessionKey = require("../routing/session-key.js");
var _messageChannel = require("../utils/message-channel.js");
var _applyPatch = require("./apply-patch.js");
var _bashTools = require("./bash-tools.js");
var _channelTools = require("./channel-tools.js");
var _openclawTools = require("./openclaw-tools.js");
var _piToolsAbort = require("./pi-tools.abort.js");
var _piToolsBeforeToolCall = require("./pi-tools.before-tool-call.js");
var _piToolsPolicy = require("./pi-tools.policy.js");
var _piToolsRead = require("./pi-tools.read.js");
var _piToolsSchema = require("./pi-tools.schema.js");
var _toolPolicy = require("./tool-policy.js");
function isOpenAIProvider(provider) {
  const normalized = provider?.trim().toLowerCase();
  return normalized === "openai" || normalized === "openai-codex";
}
function isApplyPatchAllowedForModel(params) {
  const allowModels = Array.isArray(params.allowModels) ? params.allowModels : [];
  if (allowModels.length === 0) {
    return true;
  }
  const modelId = params.modelId?.trim();
  if (!modelId) {
    return false;
  }
  const normalizedModelId = modelId.toLowerCase();
  const provider = params.modelProvider?.trim().toLowerCase();
  const normalizedFull = provider && !normalizedModelId.includes("/") ?
  `${provider}/${normalizedModelId}` :
  normalizedModelId;
  return allowModels.some((entry) => {
    const normalized = entry.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    return normalized === normalizedModelId || normalized === normalizedFull;
  });
}
function resolveExecConfig(cfg) {
  const globalExec = cfg?.tools?.exec;
  return {
    host: globalExec?.host,
    security: globalExec?.security,
    ask: globalExec?.ask,
    node: globalExec?.node,
    pathPrepend: globalExec?.pathPrepend,
    safeBins: globalExec?.safeBins,
    backgroundMs: globalExec?.backgroundMs,
    timeoutSec: globalExec?.timeoutSec,
    approvalRunningNoticeMs: globalExec?.approvalRunningNoticeMs,
    cleanupMs: globalExec?.cleanupMs,
    notifyOnExit: globalExec?.notifyOnExit,
    applyPatch: globalExec?.applyPatch
  };
}
const __testing = exports.__testing = {
  cleanToolSchemaForGemini: _piToolsSchema.cleanToolSchemaForGemini,
  normalizeToolParams: _piToolsRead.normalizeToolParams,
  patchToolSchemaForClaudeCompatibility: _piToolsRead.patchToolSchemaForClaudeCompatibility,
  wrapToolParamNormalization: _piToolsRead.wrapToolParamNormalization,
  assertRequiredParams: _piToolsRead.assertRequiredParams
};
function createOpenClawCodingTools(options) {
  const execToolName = "exec";
  const sandbox = options?.sandbox?.enabled ? options.sandbox : undefined;
  const { agentId, globalPolicy, globalProviderPolicy, agentPolicy, agentProviderPolicy, profile, providerProfile, profileAlsoAllow, providerProfileAlsoAllow } = (0, _piToolsPolicy.resolveEffectiveToolPolicy)({
    config: options?.config,
    sessionKey: options?.sessionKey,
    modelProvider: options?.modelProvider,
    modelId: options?.modelId
  });
  const groupPolicy = (0, _piToolsPolicy.resolveGroupToolPolicy)({
    config: options?.config,
    sessionKey: options?.sessionKey,
    spawnedBy: options?.spawnedBy,
    messageProvider: options?.messageProvider,
    groupId: options?.groupId,
    groupChannel: options?.groupChannel,
    groupSpace: options?.groupSpace,
    accountId: options?.agentAccountId,
    senderId: options?.senderId,
    senderName: options?.senderName,
    senderUsername: options?.senderUsername,
    senderE164: options?.senderE164
  });
  const profilePolicy = (0, _toolPolicy.resolveToolProfilePolicy)(profile);
  const providerProfilePolicy = (0, _toolPolicy.resolveToolProfilePolicy)(providerProfile);
  const mergeAlsoAllow = (policy, alsoAllow) => {
    if (!policy?.allow || !Array.isArray(alsoAllow) || alsoAllow.length === 0) {
      return policy;
    }
    return { ...policy, allow: Array.from(new Set([...policy.allow, ...alsoAllow])) };
  };
  const profilePolicyWithAlsoAllow = mergeAlsoAllow(profilePolicy, profileAlsoAllow);
  const providerProfilePolicyWithAlsoAllow = mergeAlsoAllow(providerProfilePolicy, providerProfileAlsoAllow);
  const scopeKey = options?.exec?.scopeKey ?? (agentId ? `agent:${agentId}` : undefined);
  const subagentPolicy = (0, _sessionKey.isSubagentSessionKey)(options?.sessionKey) && options?.sessionKey ?
  (0, _piToolsPolicy.resolveSubagentToolPolicy)(options.config) :
  undefined;
  const allowBackground = (0, _piToolsPolicy.isToolAllowedByPolicies)("process", [
  profilePolicyWithAlsoAllow,
  providerProfilePolicyWithAlsoAllow,
  globalPolicy,
  globalProviderPolicy,
  agentPolicy,
  agentProviderPolicy,
  groupPolicy,
  sandbox?.tools,
  subagentPolicy]
  );
  const execConfig = resolveExecConfig(options?.config);
  const sandboxRoot = sandbox?.workspaceDir;
  const allowWorkspaceWrites = sandbox?.workspaceAccess !== "ro";
  const workspaceRoot = options?.workspaceDir ?? process.cwd();
  const applyPatchConfig = options?.config?.tools?.exec?.applyPatch;
  const applyPatchEnabled = !!applyPatchConfig?.enabled &&
  isOpenAIProvider(options?.modelProvider) &&
  isApplyPatchAllowedForModel({
    modelProvider: options?.modelProvider,
    modelId: options?.modelId,
    allowModels: applyPatchConfig?.allowModels
  });
  const base = _piCodingAgent.codingTools.flatMap((tool) => {
    if (tool.name === _piCodingAgent.readTool.name) {
      if (sandboxRoot) {
        return [(0, _piToolsRead.createSandboxedReadTool)(sandboxRoot)];
      }
      const freshReadTool = (0, _piCodingAgent.createReadTool)(workspaceRoot);
      return [(0, _piToolsRead.createOpenClawReadTool)(freshReadTool)];
    }
    if (tool.name === "bash" || tool.name === execToolName) {
      return [];
    }
    if (tool.name === "write") {
      if (sandboxRoot) {
        return [];
      }
      // Wrap with param normalization for Claude Code compatibility
      return [
      (0, _piToolsRead.wrapToolParamNormalization)((0, _piCodingAgent.createWriteTool)(workspaceRoot), _piToolsRead.CLAUDE_PARAM_GROUPS.write)];

    }
    if (tool.name === "edit") {
      if (sandboxRoot) {
        return [];
      }
      // Wrap with param normalization for Claude Code compatibility
      return [(0, _piToolsRead.wrapToolParamNormalization)((0, _piCodingAgent.createEditTool)(workspaceRoot), _piToolsRead.CLAUDE_PARAM_GROUPS.edit)];
    }
    return [tool];
  });
  const { cleanupMs: cleanupMsOverride, ...execDefaults } = options?.exec ?? {};
  const execTool = (0, _bashTools.createExecTool)({
    ...execDefaults,
    host: options?.exec?.host ?? execConfig.host,
    security: options?.exec?.security ?? execConfig.security,
    ask: options?.exec?.ask ?? execConfig.ask,
    node: options?.exec?.node ?? execConfig.node,
    pathPrepend: options?.exec?.pathPrepend ?? execConfig.pathPrepend,
    safeBins: options?.exec?.safeBins ?? execConfig.safeBins,
    agentId,
    cwd: options?.workspaceDir,
    allowBackground,
    scopeKey,
    sessionKey: options?.sessionKey,
    messageProvider: options?.messageProvider,
    backgroundMs: options?.exec?.backgroundMs ?? execConfig.backgroundMs,
    timeoutSec: options?.exec?.timeoutSec ?? execConfig.timeoutSec,
    approvalRunningNoticeMs: options?.exec?.approvalRunningNoticeMs ?? execConfig.approvalRunningNoticeMs,
    notifyOnExit: options?.exec?.notifyOnExit ?? execConfig.notifyOnExit,
    sandbox: sandbox ?
    {
      containerName: sandbox.containerName,
      workspaceDir: sandbox.workspaceDir,
      containerWorkdir: sandbox.containerWorkdir,
      env: sandbox.docker.env
    } :
    undefined
  });
  const processTool = (0, _bashTools.createProcessTool)({
    cleanupMs: cleanupMsOverride ?? execConfig.cleanupMs,
    scopeKey
  });
  const applyPatchTool = !applyPatchEnabled || sandboxRoot && !allowWorkspaceWrites ?
  null :
  (0, _applyPatch.createApplyPatchTool)({
    cwd: sandboxRoot ?? workspaceRoot,
    sandboxRoot: sandboxRoot && allowWorkspaceWrites ? sandboxRoot : undefined
  });
  const tools = [
  ...base,
  ...(sandboxRoot ?
  allowWorkspaceWrites ?
  [(0, _piToolsRead.createSandboxedEditTool)(sandboxRoot), (0, _piToolsRead.createSandboxedWriteTool)(sandboxRoot)] :
  [] :
  []),
  ...(applyPatchTool ? [applyPatchTool] : []),
  execTool,
  processTool,
  // Channel docking: include channel-defined agent tools (login, etc.).
  ...(0, _channelTools.listChannelAgentTools)({ cfg: options?.config }),
  ...(0, _openclawTools.createOpenClawTools)({
    sandboxBrowserBridgeUrl: sandbox?.browser?.bridgeUrl,
    allowHostBrowserControl: sandbox ? sandbox.browserAllowHostControl : true,
    agentSessionKey: options?.sessionKey,
    agentChannel: (0, _messageChannel.resolveGatewayMessageChannel)(options?.messageProvider),
    agentAccountId: options?.agentAccountId,
    agentTo: options?.messageTo,
    agentThreadId: options?.messageThreadId,
    agentGroupId: options?.groupId ?? null,
    agentGroupChannel: options?.groupChannel ?? null,
    agentGroupSpace: options?.groupSpace ?? null,
    agentDir: options?.agentDir,
    sandboxRoot,
    workspaceDir: options?.workspaceDir,
    sandboxed: !!sandbox,
    config: options?.config,
    pluginToolAllowlist: (0, _toolPolicy.collectExplicitAllowlist)([
    profilePolicy,
    providerProfilePolicy,
    globalPolicy,
    globalProviderPolicy,
    agentPolicy,
    agentProviderPolicy,
    groupPolicy,
    sandbox?.tools,
    subagentPolicy]
    ),
    currentChannelId: options?.currentChannelId,
    currentThreadTs: options?.currentThreadTs,
    replyToMode: options?.replyToMode,
    hasRepliedRef: options?.hasRepliedRef,
    modelHasVision: options?.modelHasVision,
    requesterAgentIdOverride: agentId
  })];

  const coreToolNames = new Set(tools.
  filter((tool) => !(0, _tools.getPluginToolMeta)(tool)).
  map((tool) => (0, _toolPolicy.normalizeToolName)(tool.name)).
  filter(Boolean));
  const pluginGroups = (0, _toolPolicy.buildPluginToolGroups)({
    tools,
    toolMeta: (tool) => (0, _tools.getPluginToolMeta)(tool)
  });
  const resolvePolicy = (policy, label) => {
    const resolved = (0, _toolPolicy.stripPluginOnlyAllowlist)(policy, pluginGroups, coreToolNames);
    if (resolved.unknownAllowlist.length > 0) {
      const entries = resolved.unknownAllowlist.join(", ");
      const suffix = resolved.strippedAllowlist ?
      "Ignoring allowlist so core tools remain available. Use tools.alsoAllow for additive plugin tool enablement." :
      "These entries won't match any tool unless the plugin is enabled.";
      (0, _logger.logWarn)(`tools: ${label} allowlist contains unknown entries (${entries}). ${suffix}`);
    }
    return (0, _toolPolicy.expandPolicyWithPluginGroups)(resolved.policy, pluginGroups);
  };
  const profilePolicyExpanded = resolvePolicy(profilePolicyWithAlsoAllow, profile ? `tools.profile (${profile})` : "tools.profile");
  const providerProfileExpanded = resolvePolicy(providerProfilePolicyWithAlsoAllow, providerProfile ? `tools.byProvider.profile (${providerProfile})` : "tools.byProvider.profile");
  const globalPolicyExpanded = resolvePolicy(globalPolicy, "tools.allow");
  const globalProviderExpanded = resolvePolicy(globalProviderPolicy, "tools.byProvider.allow");
  const agentPolicyExpanded = resolvePolicy(agentPolicy, agentId ? `agents.${agentId}.tools.allow` : "agent tools.allow");
  const agentProviderExpanded = resolvePolicy(agentProviderPolicy, agentId ? `agents.${agentId}.tools.byProvider.allow` : "agent tools.byProvider.allow");
  const groupPolicyExpanded = resolvePolicy(groupPolicy, "group tools.allow");
  const sandboxPolicyExpanded = (0, _toolPolicy.expandPolicyWithPluginGroups)(sandbox?.tools, pluginGroups);
  const subagentPolicyExpanded = (0, _toolPolicy.expandPolicyWithPluginGroups)(subagentPolicy, pluginGroups);
  const toolsFiltered = profilePolicyExpanded ?
  (0, _piToolsPolicy.filterToolsByPolicy)(tools, profilePolicyExpanded) :
  tools;
  const providerProfileFiltered = providerProfileExpanded ?
  (0, _piToolsPolicy.filterToolsByPolicy)(toolsFiltered, providerProfileExpanded) :
  toolsFiltered;
  const globalFiltered = globalPolicyExpanded ?
  (0, _piToolsPolicy.filterToolsByPolicy)(providerProfileFiltered, globalPolicyExpanded) :
  providerProfileFiltered;
  const globalProviderFiltered = globalProviderExpanded ?
  (0, _piToolsPolicy.filterToolsByPolicy)(globalFiltered, globalProviderExpanded) :
  globalFiltered;
  const agentFiltered = agentPolicyExpanded ?
  (0, _piToolsPolicy.filterToolsByPolicy)(globalProviderFiltered, agentPolicyExpanded) :
  globalProviderFiltered;
  const agentProviderFiltered = agentProviderExpanded ?
  (0, _piToolsPolicy.filterToolsByPolicy)(agentFiltered, agentProviderExpanded) :
  agentFiltered;
  const groupFiltered = groupPolicyExpanded ?
  (0, _piToolsPolicy.filterToolsByPolicy)(agentProviderFiltered, groupPolicyExpanded) :
  agentProviderFiltered;
  const sandboxed = sandboxPolicyExpanded ?
  (0, _piToolsPolicy.filterToolsByPolicy)(groupFiltered, sandboxPolicyExpanded) :
  groupFiltered;
  const subagentFiltered = subagentPolicyExpanded ?
  (0, _piToolsPolicy.filterToolsByPolicy)(sandboxed, subagentPolicyExpanded) :
  sandboxed;
  // Always normalize tool JSON Schemas before handing them to pi-agent/pi-ai.
  // Without this, some providers (notably OpenAI) will reject root-level union schemas.
  const normalized = subagentFiltered.map(_piToolsSchema.normalizeToolParameters);
  const withHooks = normalized.map((tool) => (0, _piToolsBeforeToolCall.wrapToolWithBeforeToolCallHook)(tool, {
    agentId,
    sessionKey: options?.sessionKey
  }));
  const withAbort = options?.abortSignal ?
  withHooks.map((tool) => (0, _piToolsAbort.wrapToolWithAbortSignal)(tool, options.abortSignal)) :
  withHooks;
  // NOTE: Keep canonical (lowercase) tool names here.
  // pi-ai's Anthropic OAuth transport remaps tool names to Claude Code-style names
  // on the wire and maps them back for tool dispatch.
  return withAbort;
} /* v9-e77c208d3010823f */
