"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createOpenClawTools = createOpenClawTools;var _tools = require("../plugins/tools.js");
var _agentScope = require("./agent-scope.js");
var _agentsListTool = require("./tools/agents-list-tool.js");
var _browserTool = require("./tools/browser-tool.js");
var _canvasTool = require("./tools/canvas-tool.js");
var _cronTool = require("./tools/cron-tool.js");
var _gatewayTool = require("./tools/gateway-tool.js");
var _imageTool = require("./tools/image-tool.js");
var _messageTool = require("./tools/message-tool.js");
var _nodesTool = require("./tools/nodes-tool.js");
var _sessionStatusTool = require("./tools/session-status-tool.js");
var _sessionsHistoryTool = require("./tools/sessions-history-tool.js");
var _sessionsListTool = require("./tools/sessions-list-tool.js");
var _sessionsSendTool = require("./tools/sessions-send-tool.js");
var _sessionsSpawnTool = require("./tools/sessions-spawn-tool.js");
var _ttsTool = require("./tools/tts-tool.js");
var _webTools = require("./tools/web-tools.js");
function createOpenClawTools(options) {
  const imageTool = options?.agentDir?.trim() ?
  (0, _imageTool.createImageTool)({
    config: options?.config,
    agentDir: options.agentDir,
    sandboxRoot: options?.sandboxRoot,
    modelHasVision: options?.modelHasVision
  }) :
  null;
  const webSearchTool = (0, _webTools.createWebSearchTool)({
    config: options?.config,
    sandboxed: options?.sandboxed
  });
  const webFetchTool = (0, _webTools.createWebFetchTool)({
    config: options?.config,
    sandboxed: options?.sandboxed
  });
  const tools = [
  (0, _browserTool.createBrowserTool)({
    sandboxBridgeUrl: options?.sandboxBrowserBridgeUrl,
    allowHostControl: options?.allowHostBrowserControl
  }),
  (0, _canvasTool.createCanvasTool)(),
  (0, _nodesTool.createNodesTool)({
    agentSessionKey: options?.agentSessionKey,
    config: options?.config
  }),
  (0, _cronTool.createCronTool)({
    agentSessionKey: options?.agentSessionKey
  }),
  (0, _messageTool.createMessageTool)({
    agentAccountId: options?.agentAccountId,
    agentSessionKey: options?.agentSessionKey,
    config: options?.config,
    currentChannelId: options?.currentChannelId,
    currentChannelProvider: options?.agentChannel,
    currentThreadTs: options?.currentThreadTs,
    replyToMode: options?.replyToMode,
    hasRepliedRef: options?.hasRepliedRef,
    sandboxRoot: options?.sandboxRoot
  }),
  (0, _ttsTool.createTtsTool)({
    agentChannel: options?.agentChannel,
    config: options?.config
  }),
  (0, _gatewayTool.createGatewayTool)({
    agentSessionKey: options?.agentSessionKey,
    config: options?.config
  }),
  (0, _agentsListTool.createAgentsListTool)({
    agentSessionKey: options?.agentSessionKey,
    requesterAgentIdOverride: options?.requesterAgentIdOverride
  }),
  (0, _sessionsListTool.createSessionsListTool)({
    agentSessionKey: options?.agentSessionKey,
    sandboxed: options?.sandboxed
  }),
  (0, _sessionsHistoryTool.createSessionsHistoryTool)({
    agentSessionKey: options?.agentSessionKey,
    sandboxed: options?.sandboxed
  }),
  (0, _sessionsSendTool.createSessionsSendTool)({
    agentSessionKey: options?.agentSessionKey,
    agentChannel: options?.agentChannel,
    sandboxed: options?.sandboxed
  }),
  (0, _sessionsSpawnTool.createSessionsSpawnTool)({
    agentSessionKey: options?.agentSessionKey,
    agentChannel: options?.agentChannel,
    agentAccountId: options?.agentAccountId,
    agentTo: options?.agentTo,
    agentThreadId: options?.agentThreadId,
    agentGroupId: options?.agentGroupId,
    agentGroupChannel: options?.agentGroupChannel,
    agentGroupSpace: options?.agentGroupSpace,
    sandboxed: options?.sandboxed,
    requesterAgentIdOverride: options?.requesterAgentIdOverride
  }),
  (0, _sessionStatusTool.createSessionStatusTool)({
    agentSessionKey: options?.agentSessionKey,
    config: options?.config
  }),
  ...(webSearchTool ? [webSearchTool] : []),
  ...(webFetchTool ? [webFetchTool] : []),
  ...(imageTool ? [imageTool] : [])];

  const pluginTools = (0, _tools.resolvePluginTools)({
    context: {
      config: options?.config,
      workspaceDir: options?.workspaceDir,
      agentDir: options?.agentDir,
      agentId: (0, _agentScope.resolveSessionAgentId)({
        sessionKey: options?.agentSessionKey,
        config: options?.config
      }),
      sessionKey: options?.agentSessionKey,
      messageChannel: options?.agentChannel,
      agentAccountId: options?.agentAccountId,
      sandboxed: options?.sandboxed
    },
    existingToolNames: new Set(tools.map((tool) => tool.name)),
    toolAllowlist: options?.pluginToolAllowlist
  });
  return [...tools, ...pluginTools];
} /* v9-342c62f6d05615b4 */
