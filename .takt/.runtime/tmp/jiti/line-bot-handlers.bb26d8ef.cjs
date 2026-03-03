"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleLineWebhookEvents = handleLineWebhookEvents;var _globals = require("../globals.js");
var _pairingLabels = require("../pairing/pairing-labels.js");
var _pairingMessages = require("../pairing/pairing-messages.js");
var _pairingStore = require("../pairing/pairing-store.js");
var _botAccess = require("./bot-access.js");
var _botMessageContext = require("./bot-message-context.js");
var _download = require("./download.js");
var _send = require("./send.js");
function getSourceInfo(source) {
  const userId = source.type === "user" ?
  source.userId :
  source.type === "group" ?
  source.userId :
  source.type === "room" ?
  source.userId :
  undefined;
  const groupId = source.type === "group" ? source.groupId : undefined;
  const roomId = source.type === "room" ? source.roomId : undefined;
  const isGroup = source.type === "group" || source.type === "room";
  return { userId, groupId, roomId, isGroup };
}
function resolveLineGroupConfig(params) {
  const groups = params.config.groups ?? {};
  if (params.groupId) {
    return groups[params.groupId] ?? groups[`group:${params.groupId}`] ?? groups["*"];
  }
  if (params.roomId) {
    return groups[params.roomId] ?? groups[`room:${params.roomId}`] ?? groups["*"];
  }
  return groups["*"];
}
async function sendLinePairingReply(params) {
  const { senderId, replyToken, context } = params;
  const { code, created } = await (0, _pairingStore.upsertChannelPairingRequest)({
    channel: "line",
    id: senderId
  });
  if (!created) {
    return;
  }
  (0, _globals.logVerbose)(`line pairing request sender=${senderId}`);
  const idLabel = (() => {
    try {
      return (0, _pairingLabels.resolvePairingIdLabel)("line");
    }
    catch {
      return "lineUserId";
    }
  })();
  const text = (0, _pairingMessages.buildPairingReply)({
    channel: "line",
    idLine: `Your ${idLabel}: ${senderId}`,
    code
  });
  try {
    if (replyToken) {
      await (0, _send.replyMessageLine)(replyToken, [{ type: "text", text }], {
        accountId: context.account.accountId,
        channelAccessToken: context.account.channelAccessToken
      });
      return;
    }
  }
  catch (err) {
    (0, _globals.logVerbose)(`line pairing reply failed for ${senderId}: ${String(err)}`);
  }
  try {
    await (0, _send.pushMessageLine)(`line:${senderId}`, text, {
      accountId: context.account.accountId,
      channelAccessToken: context.account.channelAccessToken
    });
  }
  catch (err) {
    (0, _globals.logVerbose)(`line pairing reply failed for ${senderId}: ${String(err)}`);
  }
}
async function shouldProcessLineEvent(event, context) {
  const { cfg, account } = context;
  const { userId, groupId, roomId, isGroup } = getSourceInfo(event.source);
  const senderId = userId ?? "";
  const storeAllowFrom = await (0, _pairingStore.readChannelAllowFromStore)("line").catch(() => []);
  const effectiveDmAllow = (0, _botAccess.normalizeAllowFromWithStore)({
    allowFrom: account.config.allowFrom,
    storeAllowFrom
  });
  const groupConfig = resolveLineGroupConfig({ config: account.config, groupId, roomId });
  const groupAllowOverride = groupConfig?.allowFrom;
  const fallbackGroupAllowFrom = account.config.allowFrom?.length ?
  account.config.allowFrom :
  undefined;
  const groupAllowFrom = (0, _botAccess.firstDefined)(groupAllowOverride, account.config.groupAllowFrom, fallbackGroupAllowFrom);
  const effectiveGroupAllow = (0, _botAccess.normalizeAllowFromWithStore)({
    allowFrom: groupAllowFrom,
    storeAllowFrom
  });
  const dmPolicy = account.config.dmPolicy ?? "pairing";
  const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
  const groupPolicy = account.config.groupPolicy ?? defaultGroupPolicy ?? "allowlist";
  if (isGroup) {
    if (groupConfig?.enabled === false) {
      (0, _globals.logVerbose)(`Blocked line group ${groupId ?? roomId ?? "unknown"} (group disabled)`);
      return false;
    }
    if (typeof groupAllowOverride !== "undefined") {
      if (!senderId) {
        (0, _globals.logVerbose)("Blocked line group message (group allowFrom override, no sender ID)");
        return false;
      }
      if (!(0, _botAccess.isSenderAllowed)({ allow: effectiveGroupAllow, senderId })) {
        (0, _globals.logVerbose)(`Blocked line group sender ${senderId} (group allowFrom override)`);
        return false;
      }
    }
    if (groupPolicy === "disabled") {
      (0, _globals.logVerbose)("Blocked line group message (groupPolicy: disabled)");
      return false;
    }
    if (groupPolicy === "allowlist") {
      if (!senderId) {
        (0, _globals.logVerbose)("Blocked line group message (no sender ID, groupPolicy: allowlist)");
        return false;
      }
      if (!effectiveGroupAllow.hasEntries) {
        (0, _globals.logVerbose)("Blocked line group message (groupPolicy: allowlist, no groupAllowFrom)");
        return false;
      }
      if (!(0, _botAccess.isSenderAllowed)({ allow: effectiveGroupAllow, senderId })) {
        (0, _globals.logVerbose)(`Blocked line group message from ${senderId} (groupPolicy: allowlist)`);
        return false;
      }
    }
    return true;
  }
  if (dmPolicy === "disabled") {
    (0, _globals.logVerbose)("Blocked line sender (dmPolicy: disabled)");
    return false;
  }
  const dmAllowed = dmPolicy === "open" || (0, _botAccess.isSenderAllowed)({ allow: effectiveDmAllow, senderId });
  if (!dmAllowed) {
    if (dmPolicy === "pairing") {
      if (!senderId) {
        (0, _globals.logVerbose)("Blocked line sender (dmPolicy: pairing, no sender ID)");
        return false;
      }
      await sendLinePairingReply({
        senderId,
        replyToken: "replyToken" in event ? event.replyToken : undefined,
        context
      });
    } else
    {
      (0, _globals.logVerbose)(`Blocked line sender ${senderId || "unknown"} (dmPolicy: ${dmPolicy})`);
    }
    return false;
  }
  return true;
}
async function handleMessageEvent(event, context) {
  const { cfg, account, runtime, mediaMaxBytes, processMessage } = context;
  const message = event.message;
  if (!(await shouldProcessLineEvent(event, context))) {
    return;
  }
  // Download media if applicable
  const allMedia = [];
  if (message.type === "image" || message.type === "video" || message.type === "audio") {
    try {
      const media = await (0, _download.downloadLineMedia)(message.id, account.channelAccessToken, mediaMaxBytes);
      allMedia.push({
        path: media.path,
        contentType: media.contentType
      });
    }
    catch (err) {
      const errMsg = String(err);
      if (errMsg.includes("exceeds") && errMsg.includes("limit")) {
        (0, _globals.logVerbose)(`line: media exceeds size limit for message ${message.id}`);
        // Continue without media
      } else
      {
        runtime.error?.((0, _globals.danger)(`line: failed to download media: ${errMsg}`));
      }
    }
  }
  const messageContext = await (0, _botMessageContext.buildLineMessageContext)({
    event,
    allMedia,
    cfg,
    account
  });
  if (!messageContext) {
    (0, _globals.logVerbose)("line: skipping empty message");
    return;
  }
  await processMessage(messageContext);
}
async function handleFollowEvent(event, _context) {
  const userId = event.source.type === "user" ? event.source.userId : undefined;
  (0, _globals.logVerbose)(`line: user ${userId ?? "unknown"} followed`);
  // Could implement welcome message here
}
async function handleUnfollowEvent(event, _context) {
  const userId = event.source.type === "user" ? event.source.userId : undefined;
  (0, _globals.logVerbose)(`line: user ${userId ?? "unknown"} unfollowed`);
}
async function handleJoinEvent(event, _context) {
  const groupId = event.source.type === "group" ? event.source.groupId : undefined;
  const roomId = event.source.type === "room" ? event.source.roomId : undefined;
  (0, _globals.logVerbose)(`line: bot joined ${groupId ? `group ${groupId}` : `room ${roomId}`}`);
}
async function handleLeaveEvent(event, _context) {
  const groupId = event.source.type === "group" ? event.source.groupId : undefined;
  const roomId = event.source.type === "room" ? event.source.roomId : undefined;
  (0, _globals.logVerbose)(`line: bot left ${groupId ? `group ${groupId}` : `room ${roomId}`}`);
}
async function handlePostbackEvent(event, context) {
  const data = event.postback.data;
  (0, _globals.logVerbose)(`line: received postback: ${data}`);
  if (!(await shouldProcessLineEvent(event, context))) {
    return;
  }
  const postbackContext = await (0, _botMessageContext.buildLinePostbackContext)({
    event,
    cfg: context.cfg,
    account: context.account
  });
  if (!postbackContext) {
    return;
  }
  await context.processMessage(postbackContext);
}
async function handleLineWebhookEvents(events, context) {
  for (const event of events) {
    try {
      switch (event.type) {
        case "message":
          await handleMessageEvent(event, context);
          break;
        case "follow":
          await handleFollowEvent(event, context);
          break;
        case "unfollow":
          await handleUnfollowEvent(event, context);
          break;
        case "join":
          await handleJoinEvent(event, context);
          break;
        case "leave":
          await handleLeaveEvent(event, context);
          break;
        case "postback":
          await handlePostbackEvent(event, context);
          break;
        default:
          (0, _globals.logVerbose)(`line: unhandled event type: ${event.type}`);
      }
    }
    catch (err) {
      context.runtime.error?.((0, _globals.danger)(`line: event handler failed: ${String(err)}`));
    }
  }
} /* v9-9e8489f12f348287 */
