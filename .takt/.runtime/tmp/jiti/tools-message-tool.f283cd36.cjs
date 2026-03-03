"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createMessageTool = createMessageTool;var _typebox = require("@sinclair/typebox");
var _bluebubblesActions = require("../../channels/plugins/bluebubbles-actions.js");
var _messageActions = require("../../channels/plugins/message-actions.js");
var _types = require("../../channels/plugins/types.js");
var _config = require("../../config/config.js");
var _clientInfo = require("../../gateway/protocol/client-info.js");
var _messageActionRunner = require("../../infra/outbound/message-action-runner.js");
var _targetNormalization = require("../../infra/outbound/target-normalization.js");
var _sessionKey = require("../../routing/session-key.js");
var _messageChannel = require("../../utils/message-channel.js");
var _agentScope = require("../agent-scope.js");
var _channelTools = require("../channel-tools.js");
var _sandboxPaths = require("../sandbox-paths.js");
var _typebox2 = require("../schema/typebox.js");
var _common = require("./common.js");
const AllMessageActions = _types.CHANNEL_MESSAGE_ACTION_NAMES;
function buildRoutingSchema() {
  return {
    channel: _typebox.Type.Optional(_typebox.Type.String()),
    target: _typebox.Type.Optional((0, _typebox2.channelTargetSchema)({ description: "Target channel/user id or name." })),
    targets: _typebox.Type.Optional((0, _typebox2.channelTargetsSchema)()),
    accountId: _typebox.Type.Optional(_typebox.Type.String()),
    dryRun: _typebox.Type.Optional(_typebox.Type.Boolean())
  };
}
function buildSendSchema(options) {
  const props = {
    message: _typebox.Type.Optional(_typebox.Type.String()),
    effectId: _typebox.Type.Optional(_typebox.Type.String({
      description: "Message effect name/id for sendWithEffect (e.g., invisible ink)."
    })),
    effect: _typebox.Type.Optional(_typebox.Type.String({ description: "Alias for effectId (e.g., invisible-ink, balloons)." })),
    media: _typebox.Type.Optional(_typebox.Type.String()),
    filename: _typebox.Type.Optional(_typebox.Type.String()),
    buffer: _typebox.Type.Optional(_typebox.Type.String({
      description: "Base64 payload for attachments (optionally a data: URL)."
    })),
    contentType: _typebox.Type.Optional(_typebox.Type.String()),
    mimeType: _typebox.Type.Optional(_typebox.Type.String()),
    caption: _typebox.Type.Optional(_typebox.Type.String()),
    path: _typebox.Type.Optional(_typebox.Type.String()),
    filePath: _typebox.Type.Optional(_typebox.Type.String()),
    replyTo: _typebox.Type.Optional(_typebox.Type.String()),
    threadId: _typebox.Type.Optional(_typebox.Type.String()),
    asVoice: _typebox.Type.Optional(_typebox.Type.Boolean()),
    silent: _typebox.Type.Optional(_typebox.Type.Boolean()),
    quoteText: _typebox.Type.Optional(_typebox.Type.String({ description: "Quote text for Telegram reply_parameters" })),
    bestEffort: _typebox.Type.Optional(_typebox.Type.Boolean()),
    gifPlayback: _typebox.Type.Optional(_typebox.Type.Boolean()),
    buttons: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.Array(_typebox.Type.Object({
      text: _typebox.Type.String(),
      callback_data: _typebox.Type.String()
    })), {
      description: "Telegram inline keyboard buttons (array of button rows)"
    })),
    card: _typebox.Type.Optional(_typebox.Type.Object({}, {
      additionalProperties: true,
      description: "Adaptive Card JSON object (when supported by the channel)"
    }))
  };
  if (!options.includeButtons) {
    delete props.buttons;
  }
  if (!options.includeCards) {
    delete props.card;
  }
  return props;
}
function buildReactionSchema() {
  return {
    messageId: _typebox.Type.Optional(_typebox.Type.String()),
    emoji: _typebox.Type.Optional(_typebox.Type.String()),
    remove: _typebox.Type.Optional(_typebox.Type.Boolean()),
    targetAuthor: _typebox.Type.Optional(_typebox.Type.String()),
    targetAuthorUuid: _typebox.Type.Optional(_typebox.Type.String()),
    groupId: _typebox.Type.Optional(_typebox.Type.String())
  };
}
function buildFetchSchema() {
  return {
    limit: _typebox.Type.Optional(_typebox.Type.Number()),
    before: _typebox.Type.Optional(_typebox.Type.String()),
    after: _typebox.Type.Optional(_typebox.Type.String()),
    around: _typebox.Type.Optional(_typebox.Type.String()),
    fromMe: _typebox.Type.Optional(_typebox.Type.Boolean()),
    includeArchived: _typebox.Type.Optional(_typebox.Type.Boolean())
  };
}
function buildPollSchema() {
  return {
    pollQuestion: _typebox.Type.Optional(_typebox.Type.String()),
    pollOption: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String())),
    pollDurationHours: _typebox.Type.Optional(_typebox.Type.Number()),
    pollMulti: _typebox.Type.Optional(_typebox.Type.Boolean())
  };
}
function buildChannelTargetSchema() {
  return {
    channelId: _typebox.Type.Optional(_typebox.Type.String({ description: "Channel id filter (search/thread list/event create)." })),
    channelIds: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String({ description: "Channel id filter (repeatable)." }))),
    guildId: _typebox.Type.Optional(_typebox.Type.String()),
    userId: _typebox.Type.Optional(_typebox.Type.String()),
    authorId: _typebox.Type.Optional(_typebox.Type.String()),
    authorIds: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String())),
    roleId: _typebox.Type.Optional(_typebox.Type.String()),
    roleIds: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String())),
    participant: _typebox.Type.Optional(_typebox.Type.String())
  };
}
function buildStickerSchema() {
  return {
    emojiName: _typebox.Type.Optional(_typebox.Type.String()),
    stickerId: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String())),
    stickerName: _typebox.Type.Optional(_typebox.Type.String()),
    stickerDesc: _typebox.Type.Optional(_typebox.Type.String()),
    stickerTags: _typebox.Type.Optional(_typebox.Type.String())
  };
}
function buildThreadSchema() {
  return {
    threadName: _typebox.Type.Optional(_typebox.Type.String()),
    autoArchiveMin: _typebox.Type.Optional(_typebox.Type.Number())
  };
}
function buildEventSchema() {
  return {
    query: _typebox.Type.Optional(_typebox.Type.String()),
    eventName: _typebox.Type.Optional(_typebox.Type.String()),
    eventType: _typebox.Type.Optional(_typebox.Type.String()),
    startTime: _typebox.Type.Optional(_typebox.Type.String()),
    endTime: _typebox.Type.Optional(_typebox.Type.String()),
    desc: _typebox.Type.Optional(_typebox.Type.String()),
    location: _typebox.Type.Optional(_typebox.Type.String()),
    durationMin: _typebox.Type.Optional(_typebox.Type.Number()),
    until: _typebox.Type.Optional(_typebox.Type.String())
  };
}
function buildModerationSchema() {
  return {
    reason: _typebox.Type.Optional(_typebox.Type.String()),
    deleteDays: _typebox.Type.Optional(_typebox.Type.Number())
  };
}
function buildGatewaySchema() {
  return {
    gatewayUrl: _typebox.Type.Optional(_typebox.Type.String()),
    gatewayToken: _typebox.Type.Optional(_typebox.Type.String()),
    timeoutMs: _typebox.Type.Optional(_typebox.Type.Number())
  };
}
function buildChannelManagementSchema() {
  return {
    name: _typebox.Type.Optional(_typebox.Type.String()),
    type: _typebox.Type.Optional(_typebox.Type.Number()),
    parentId: _typebox.Type.Optional(_typebox.Type.String()),
    topic: _typebox.Type.Optional(_typebox.Type.String()),
    position: _typebox.Type.Optional(_typebox.Type.Number()),
    nsfw: _typebox.Type.Optional(_typebox.Type.Boolean()),
    rateLimitPerUser: _typebox.Type.Optional(_typebox.Type.Number()),
    categoryId: _typebox.Type.Optional(_typebox.Type.String()),
    clearParent: _typebox.Type.Optional(_typebox.Type.Boolean({
      description: "Clear the parent/category when supported by the provider."
    }))
  };
}
function buildMessageToolSchemaProps(options) {
  return {
    ...buildRoutingSchema(),
    ...buildSendSchema(options),
    ...buildReactionSchema(),
    ...buildFetchSchema(),
    ...buildPollSchema(),
    ...buildChannelTargetSchema(),
    ...buildStickerSchema(),
    ...buildThreadSchema(),
    ...buildEventSchema(),
    ...buildModerationSchema(),
    ...buildGatewaySchema(),
    ...buildChannelManagementSchema()
  };
}
function buildMessageToolSchemaFromActions(actions, options) {
  const props = buildMessageToolSchemaProps(options);
  return _typebox.Type.Object({
    action: (0, _typebox2.stringEnum)(actions),
    ...props
  });
}
const MessageToolSchema = buildMessageToolSchemaFromActions(AllMessageActions, {
  includeButtons: true,
  includeCards: true
});
function buildMessageToolSchema(cfg) {
  const actions = (0, _messageActions.listChannelMessageActions)(cfg);
  const includeButtons = (0, _messageActions.supportsChannelMessageButtons)(cfg);
  const includeCards = (0, _messageActions.supportsChannelMessageCards)(cfg);
  return buildMessageToolSchemaFromActions(actions.length > 0 ? actions : ["send"], {
    includeButtons,
    includeCards
  });
}
function resolveAgentAccountId(value) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return (0, _sessionKey.normalizeAccountId)(trimmed);
}
function filterActionsForContext(params) {
  const channel = (0, _messageChannel.normalizeMessageChannel)(params.channel);
  if (!channel || channel !== "bluebubbles") {
    return params.actions;
  }
  const currentChannelId = params.currentChannelId?.trim();
  if (!currentChannelId) {
    return params.actions;
  }
  const normalizedTarget = (0, _targetNormalization.normalizeTargetForProvider)(channel, currentChannelId) ?? currentChannelId;
  const lowered = normalizedTarget.trim().toLowerCase();
  const isGroupTarget = lowered.startsWith("chat_guid:") ||
  lowered.startsWith("chat_id:") ||
  lowered.startsWith("chat_identifier:") ||
  lowered.startsWith("group:");
  if (isGroupTarget) {
    return params.actions;
  }
  return params.actions.filter((action) => !_bluebubblesActions.BLUEBUBBLES_GROUP_ACTIONS.has(action));
}
function buildMessageToolDescription(options) {
  const baseDescription = "Send, delete, and manage messages via channel plugins.";
  // If we have a current channel, show only its supported actions
  if (options?.currentChannel) {
    const channelActions = filterActionsForContext({
      actions: (0, _channelTools.listChannelSupportedActions)({
        cfg: options.config,
        channel: options.currentChannel
      }),
      channel: options.currentChannel,
      currentChannelId: options.currentChannelId
    });
    if (channelActions.length > 0) {
      // Always include "send" as a base action
      const allActions = new Set(["send", ...channelActions]);
      const actionList = Array.from(allActions).toSorted().join(", ");
      return `${baseDescription} Current channel (${options.currentChannel}) supports: ${actionList}.`;
    }
  }
  // Fallback to generic description with all configured actions
  if (options?.config) {
    const actions = (0, _messageActions.listChannelMessageActions)(options.config);
    if (actions.length > 0) {
      return `${baseDescription} Supports actions: ${actions.join(", ")}.`;
    }
  }
  return `${baseDescription} Supports actions: send, delete, react, poll, pin, threads, and more.`;
}
function createMessageTool(options) {
  const agentAccountId = resolveAgentAccountId(options?.agentAccountId);
  const schema = options?.config ? buildMessageToolSchema(options.config) : MessageToolSchema;
  const description = buildMessageToolDescription({
    config: options?.config,
    currentChannel: options?.currentChannelProvider,
    currentChannelId: options?.currentChannelId
  });
  return {
    label: "Message",
    name: "message",
    description,
    parameters: schema,
    execute: async (_toolCallId, args, signal) => {
      // Check if already aborted before doing any work
      if (signal?.aborted) {
        const err = new Error("Message send aborted");
        err.name = "AbortError";
        throw err;
      }
      const params = args;
      const cfg = options?.config ?? (0, _config.loadConfig)();
      const action = (0, _common.readStringParam)(params, "action", {
        required: true
      });
      // Validate file paths against sandbox root to prevent host file access.
      const sandboxRoot = options?.sandboxRoot;
      if (sandboxRoot) {
        for (const key of ["filePath", "path"]) {
          const raw = (0, _common.readStringParam)(params, key, { trim: false });
          if (raw) {
            await (0, _sandboxPaths.assertSandboxPath)({ filePath: raw, cwd: sandboxRoot, root: sandboxRoot });
          }
        }
      }
      const accountId = (0, _common.readStringParam)(params, "accountId") ?? agentAccountId;
      if (accountId) {
        params.accountId = accountId;
      }
      const gateway = {
        url: (0, _common.readStringParam)(params, "gatewayUrl", { trim: false }),
        token: (0, _common.readStringParam)(params, "gatewayToken", { trim: false }),
        timeoutMs: (0, _common.readNumberParam)(params, "timeoutMs"),
        clientName: _clientInfo.GATEWAY_CLIENT_IDS.GATEWAY_CLIENT,
        clientDisplayName: "agent",
        mode: _clientInfo.GATEWAY_CLIENT_MODES.BACKEND
      };
      const toolContext = options?.currentChannelId ||
      options?.currentChannelProvider ||
      options?.currentThreadTs ||
      options?.replyToMode ||
      options?.hasRepliedRef ?
      {
        currentChannelId: options?.currentChannelId,
        currentChannelProvider: options?.currentChannelProvider,
        currentThreadTs: options?.currentThreadTs,
        replyToMode: options?.replyToMode,
        hasRepliedRef: options?.hasRepliedRef,
        // Direct tool invocations should not add cross-context decoration.
        // The agent is composing a message, not forwarding from another chat.
        skipCrossContextDecoration: true
      } :
      undefined;
      const result = await (0, _messageActionRunner.runMessageAction)({
        cfg,
        action,
        params,
        defaultAccountId: accountId ?? undefined,
        gateway,
        toolContext,
        agentId: options?.agentSessionKey ?
        (0, _agentScope.resolveSessionAgentId)({ sessionKey: options.agentSessionKey, config: cfg }) :
        undefined,
        abortSignal: signal
      });
      const toolResult = (0, _messageActionRunner.getToolResult)(result);
      if (toolResult) {
        return toolResult;
      }
      return (0, _common.jsonResult)(result.payload);
    }
  };
} /* v9-eeb925a28f802908 */
