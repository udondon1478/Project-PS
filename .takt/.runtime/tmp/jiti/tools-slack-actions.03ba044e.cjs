"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleSlackAction = handleSlackAction;var _accounts = require("../../slack/accounts.js");
var _actions = require("../../slack/actions.js");
var _targets = require("../../slack/targets.js");
var _dateTime = require("../date-time.js");
var _common = require("./common.js");
const messagingActions = new Set(["sendMessage", "editMessage", "deleteMessage", "readMessages"]);
const reactionsActions = new Set(["react", "reactions"]);
const pinActions = new Set(["pinMessage", "unpinMessage", "listPins"]);
/**
 * Resolve threadTs for a Slack message based on context and replyToMode.
 * - "all": always inject threadTs
 * - "first": inject only for first message (updates hasRepliedRef)
 * - "off": never auto-inject
 */
function resolveThreadTsFromContext(explicitThreadTs, targetChannel, context) {
  // Agent explicitly provided threadTs - use it
  if (explicitThreadTs) {
    return explicitThreadTs;
  }
  // No context or missing required fields
  if (!context?.currentThreadTs || !context?.currentChannelId) {
    return undefined;
  }
  const parsedTarget = (0, _targets.parseSlackTarget)(targetChannel, { defaultKind: "channel" });
  if (!parsedTarget || parsedTarget.kind !== "channel") {
    return undefined;
  }
  const normalizedTarget = parsedTarget.id;
  // Different channel - don't inject
  if (normalizedTarget !== context.currentChannelId) {
    return undefined;
  }
  // Check replyToMode
  if (context.replyToMode === "all") {
    return context.currentThreadTs;
  }
  if (context.replyToMode === "first" && context.hasRepliedRef && !context.hasRepliedRef.value) {
    context.hasRepliedRef.value = true;
    return context.currentThreadTs;
  }
  return undefined;
}
async function handleSlackAction(params, cfg, context) {
  const resolveChannelId = () => (0, _targets.resolveSlackChannelId)((0, _common.readStringParam)(params, "channelId", {
    required: true
  }));
  const action = (0, _common.readStringParam)(params, "action", { required: true });
  const accountId = (0, _common.readStringParam)(params, "accountId");
  const account = (0, _accounts.resolveSlackAccount)({ cfg, accountId });
  const actionConfig = account.actions ?? cfg.channels?.slack?.actions;
  const isActionEnabled = (0, _common.createActionGate)(actionConfig);
  const userToken = account.config.userToken?.trim() || undefined;
  const botToken = account.botToken?.trim();
  const allowUserWrites = account.config.userTokenReadOnly === false;
  // Choose the most appropriate token for Slack read/write operations.
  const getTokenForOperation = (operation) => {
    if (operation === "read") {
      return userToken ?? botToken;
    }
    if (!allowUserWrites) {
      return botToken;
    }
    return botToken ?? userToken;
  };
  const buildActionOpts = (operation) => {
    const token = getTokenForOperation(operation);
    const tokenOverride = token && token !== botToken ? token : undefined;
    if (!accountId && !tokenOverride) {
      return undefined;
    }
    return {
      ...(accountId ? { accountId } : {}),
      ...(tokenOverride ? { token: tokenOverride } : {})
    };
  };
  const readOpts = buildActionOpts("read");
  const writeOpts = buildActionOpts("write");
  if (reactionsActions.has(action)) {
    if (!isActionEnabled("reactions")) {
      throw new Error("Slack reactions are disabled.");
    }
    const channelId = resolveChannelId();
    const messageId = (0, _common.readStringParam)(params, "messageId", { required: true });
    if (action === "react") {
      const { emoji, remove, isEmpty } = (0, _common.readReactionParams)(params, {
        removeErrorMessage: "Emoji is required to remove a Slack reaction."
      });
      if (remove) {
        if (writeOpts) {
          await (0, _actions.removeSlackReaction)(channelId, messageId, emoji, writeOpts);
        } else
        {
          await (0, _actions.removeSlackReaction)(channelId, messageId, emoji);
        }
        return (0, _common.jsonResult)({ ok: true, removed: emoji });
      }
      if (isEmpty) {
        const removed = writeOpts ?
        await (0, _actions.removeOwnSlackReactions)(channelId, messageId, writeOpts) :
        await (0, _actions.removeOwnSlackReactions)(channelId, messageId);
        return (0, _common.jsonResult)({ ok: true, removed });
      }
      if (writeOpts) {
        await (0, _actions.reactSlackMessage)(channelId, messageId, emoji, writeOpts);
      } else
      {
        await (0, _actions.reactSlackMessage)(channelId, messageId, emoji);
      }
      return (0, _common.jsonResult)({ ok: true, added: emoji });
    }
    const reactions = readOpts ?
    await (0, _actions.listSlackReactions)(channelId, messageId, readOpts) :
    await (0, _actions.listSlackReactions)(channelId, messageId);
    return (0, _common.jsonResult)({ ok: true, reactions });
  }
  if (messagingActions.has(action)) {
    if (!isActionEnabled("messages")) {
      throw new Error("Slack messages are disabled.");
    }
    switch (action) {
      case "sendMessage":{
          const to = (0, _common.readStringParam)(params, "to", { required: true });
          const content = (0, _common.readStringParam)(params, "content", { required: true });
          const mediaUrl = (0, _common.readStringParam)(params, "mediaUrl");
          const threadTs = resolveThreadTsFromContext((0, _common.readStringParam)(params, "threadTs"), to, context);
          const result = await (0, _actions.sendSlackMessage)(to, content, {
            ...writeOpts,
            mediaUrl: mediaUrl ?? undefined,
            threadTs: threadTs ?? undefined
          });
          // Keep "first" mode consistent even when the agent explicitly provided
          // threadTs: once we send a message to the current channel, consider the
          // first reply "used" so later tool calls don't auto-thread again.
          if (context?.hasRepliedRef && context.currentChannelId) {
            const parsedTarget = (0, _targets.parseSlackTarget)(to, { defaultKind: "channel" });
            if (parsedTarget?.kind === "channel" && parsedTarget.id === context.currentChannelId) {
              context.hasRepliedRef.value = true;
            }
          }
          return (0, _common.jsonResult)({ ok: true, result });
        }
      case "editMessage":{
          const channelId = resolveChannelId();
          const messageId = (0, _common.readStringParam)(params, "messageId", {
            required: true
          });
          const content = (0, _common.readStringParam)(params, "content", {
            required: true
          });
          if (writeOpts) {
            await (0, _actions.editSlackMessage)(channelId, messageId, content, writeOpts);
          } else
          {
            await (0, _actions.editSlackMessage)(channelId, messageId, content);
          }
          return (0, _common.jsonResult)({ ok: true });
        }
      case "deleteMessage":{
          const channelId = resolveChannelId();
          const messageId = (0, _common.readStringParam)(params, "messageId", {
            required: true
          });
          if (writeOpts) {
            await (0, _actions.deleteSlackMessage)(channelId, messageId, writeOpts);
          } else
          {
            await (0, _actions.deleteSlackMessage)(channelId, messageId);
          }
          return (0, _common.jsonResult)({ ok: true });
        }
      case "readMessages":{
          const channelId = resolveChannelId();
          const limitRaw = params.limit;
          const limit = typeof limitRaw === "number" && Number.isFinite(limitRaw) ? limitRaw : undefined;
          const before = (0, _common.readStringParam)(params, "before");
          const after = (0, _common.readStringParam)(params, "after");
          const threadId = (0, _common.readStringParam)(params, "threadId");
          const result = await (0, _actions.readSlackMessages)(channelId, {
            ...readOpts,
            limit,
            before: before ?? undefined,
            after: after ?? undefined,
            threadId: threadId ?? undefined
          });
          const messages = result.messages.map((message) => (0, _dateTime.withNormalizedTimestamp)(message, message.ts));
          return (0, _common.jsonResult)({ ok: true, messages, hasMore: result.hasMore });
        }
      default:
        break;
    }
  }
  if (pinActions.has(action)) {
    if (!isActionEnabled("pins")) {
      throw new Error("Slack pins are disabled.");
    }
    const channelId = resolveChannelId();
    if (action === "pinMessage") {
      const messageId = (0, _common.readStringParam)(params, "messageId", {
        required: true
      });
      if (writeOpts) {
        await (0, _actions.pinSlackMessage)(channelId, messageId, writeOpts);
      } else
      {
        await (0, _actions.pinSlackMessage)(channelId, messageId);
      }
      return (0, _common.jsonResult)({ ok: true });
    }
    if (action === "unpinMessage") {
      const messageId = (0, _common.readStringParam)(params, "messageId", {
        required: true
      });
      if (writeOpts) {
        await (0, _actions.unpinSlackMessage)(channelId, messageId, writeOpts);
      } else
      {
        await (0, _actions.unpinSlackMessage)(channelId, messageId);
      }
      return (0, _common.jsonResult)({ ok: true });
    }
    const pins = writeOpts ?
    await (0, _actions.listSlackPins)(channelId, readOpts) :
    await (0, _actions.listSlackPins)(channelId);
    const normalizedPins = pins.map((pin) => {
      const message = pin.message ?
      (0, _dateTime.withNormalizedTimestamp)(pin.message, pin.message.ts) :
      pin.message;
      return message ? { ...pin, message } : pin;
    });
    return (0, _common.jsonResult)({ ok: true, pins: normalizedPins });
  }
  if (action === "memberInfo") {
    if (!isActionEnabled("memberInfo")) {
      throw new Error("Slack member info is disabled.");
    }
    const userId = (0, _common.readStringParam)(params, "userId", { required: true });
    const info = writeOpts ?
    await (0, _actions.getSlackMemberInfo)(userId, readOpts) :
    await (0, _actions.getSlackMemberInfo)(userId);
    return (0, _common.jsonResult)({ ok: true, info });
  }
  if (action === "emojiList") {
    if (!isActionEnabled("emojiList")) {
      throw new Error("Slack emoji list is disabled.");
    }
    const emojis = readOpts ? await (0, _actions.listSlackEmojis)(readOpts) : await (0, _actions.listSlackEmojis)();
    return (0, _common.jsonResult)({ ok: true, emojis });
  }
  throw new Error(`Unknown action: ${action}`);
} /* v9-b00491ff2dd5e322 */
