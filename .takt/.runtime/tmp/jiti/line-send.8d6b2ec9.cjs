"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createFlexMessage = createFlexMessage;exports.createImageMessage = createImageMessage;exports.createLocationMessage = createLocationMessage;exports.createQuickReplyItems = createQuickReplyItems;exports.createTextMessageWithQuickReplies = createTextMessageWithQuickReplies;exports.getUserDisplayName = getUserDisplayName;exports.getUserProfile = getUserProfile;exports.pushFlexMessage = pushFlexMessage;exports.pushImageMessage = pushImageMessage;exports.pushLocationMessage = pushLocationMessage;exports.pushMessageLine = pushMessageLine;exports.pushMessagesLine = pushMessagesLine;exports.pushTemplateMessage = pushTemplateMessage;exports.pushTextMessageWithQuickReplies = pushTextMessageWithQuickReplies;exports.replyMessageLine = replyMessageLine;exports.sendMessageLine = sendMessageLine;exports.showLoadingAnimation = showLoadingAnimation;var _botSdk = require("@line/bot-sdk");
var _config = require("../config/config.js");
var _globals = require("../globals.js");
var _channelActivity = require("../infra/channel-activity.js");
var _accounts = require("./accounts.js");
// Cache for user profiles
const userProfileCache = new Map();
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
function resolveToken(explicit, params) {
  if (explicit?.trim()) {
    return explicit.trim();
  }
  if (!params.channelAccessToken) {
    throw new Error(`LINE channel access token missing for account "${params.accountId}" (set channels.line.channelAccessToken or LINE_CHANNEL_ACCESS_TOKEN).`);
  }
  return params.channelAccessToken.trim();
}
function normalizeTarget(to) {
  const trimmed = to.trim();
  if (!trimmed) {
    throw new Error("Recipient is required for LINE sends");
  }
  // Strip internal prefixes
  let normalized = trimmed.
  replace(/^line:group:/i, "").
  replace(/^line:room:/i, "").
  replace(/^line:user:/i, "").
  replace(/^line:/i, "");
  if (!normalized) {
    throw new Error("Recipient is required for LINE sends");
  }
  return normalized;
}
function createTextMessage(text) {
  return { type: "text", text };
}
function createImageMessage(originalContentUrl, previewImageUrl) {
  return {
    type: "image",
    originalContentUrl,
    previewImageUrl: previewImageUrl ?? originalContentUrl
  };
}
function createLocationMessage(location) {
  return {
    type: "location",
    title: location.title.slice(0, 100), // LINE limit
    address: location.address.slice(0, 100), // LINE limit
    latitude: location.latitude,
    longitude: location.longitude
  };
}
function logLineHttpError(err, context) {
  if (!err || typeof err !== "object") {
    return;
  }
  const { status, statusText, body } = err;
  if (typeof body === "string") {
    const summary = status ? `${status} ${statusText ?? ""}`.trim() : "unknown status";
    (0, _globals.logVerbose)(`line: ${context} failed (${summary}): ${body}`);
  }
}
async function sendMessageLine(to, text, opts = {}) {
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveLineAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = resolveToken(opts.channelAccessToken, account);
  const chatId = normalizeTarget(to);
  const client = new _botSdk.messagingApi.MessagingApiClient({
    channelAccessToken: token
  });
  const messages = [];
  // Add media if provided
  if (opts.mediaUrl?.trim()) {
    messages.push(createImageMessage(opts.mediaUrl.trim()));
  }
  // Add text message
  if (text?.trim()) {
    messages.push(createTextMessage(text.trim()));
  }
  if (messages.length === 0) {
    throw new Error("Message must be non-empty for LINE sends");
  }
  // Use reply if we have a reply token, otherwise push
  if (opts.replyToken) {
    await client.replyMessage({
      replyToken: opts.replyToken,
      messages
    });
    (0, _channelActivity.recordChannelActivity)({
      channel: "line",
      accountId: account.accountId,
      direction: "outbound"
    });
    if (opts.verbose) {
      (0, _globals.logVerbose)(`line: replied to ${chatId}`);
    }
    return {
      messageId: "reply",
      chatId
    };
  }
  // Push message (for proactive messaging)
  await client.pushMessage({
    to: chatId,
    messages
  });
  (0, _channelActivity.recordChannelActivity)({
    channel: "line",
    accountId: account.accountId,
    direction: "outbound"
  });
  if (opts.verbose) {
    (0, _globals.logVerbose)(`line: pushed message to ${chatId}`);
  }
  return {
    messageId: "push",
    chatId
  };
}
async function pushMessageLine(to, text, opts = {}) {
  // Force push (no reply token)
  return sendMessageLine(to, text, { ...opts, replyToken: undefined });
}
async function replyMessageLine(replyToken, messages, opts = {}) {
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveLineAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = resolveToken(opts.channelAccessToken, account);
  const client = new _botSdk.messagingApi.MessagingApiClient({
    channelAccessToken: token
  });
  await client.replyMessage({
    replyToken,
    messages
  });
  (0, _channelActivity.recordChannelActivity)({
    channel: "line",
    accountId: account.accountId,
    direction: "outbound"
  });
  if (opts.verbose) {
    (0, _globals.logVerbose)(`line: replied with ${messages.length} messages`);
  }
}
async function pushMessagesLine(to, messages, opts = {}) {
  if (messages.length === 0) {
    throw new Error("Message must be non-empty for LINE sends");
  }
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveLineAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = resolveToken(opts.channelAccessToken, account);
  const chatId = normalizeTarget(to);
  const client = new _botSdk.messagingApi.MessagingApiClient({
    channelAccessToken: token
  });
  await client.
  pushMessage({
    to: chatId,
    messages
  }).
  catch((err) => {
    logLineHttpError(err, "push message");
    throw err;
  });
  (0, _channelActivity.recordChannelActivity)({
    channel: "line",
    accountId: account.accountId,
    direction: "outbound"
  });
  if (opts.verbose) {
    (0, _globals.logVerbose)(`line: pushed ${messages.length} messages to ${chatId}`);
  }
  return {
    messageId: "push",
    chatId
  };
}
function createFlexMessage(altText, contents) {
  return {
    type: "flex",
    altText,
    contents
  };
}
/**
 * Push an image message to a user/group
 */
async function pushImageMessage(to, originalContentUrl, previewImageUrl, opts = {}) {
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveLineAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = resolveToken(opts.channelAccessToken, account);
  const chatId = normalizeTarget(to);
  const client = new _botSdk.messagingApi.MessagingApiClient({
    channelAccessToken: token
  });
  const imageMessage = createImageMessage(originalContentUrl, previewImageUrl);
  await client.pushMessage({
    to: chatId,
    messages: [imageMessage]
  });
  (0, _channelActivity.recordChannelActivity)({
    channel: "line",
    accountId: account.accountId,
    direction: "outbound"
  });
  if (opts.verbose) {
    (0, _globals.logVerbose)(`line: pushed image to ${chatId}`);
  }
  return {
    messageId: "push",
    chatId
  };
}
/**
 * Push a location message to a user/group
 */
async function pushLocationMessage(to, location, opts = {}) {
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveLineAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = resolveToken(opts.channelAccessToken, account);
  const chatId = normalizeTarget(to);
  const client = new _botSdk.messagingApi.MessagingApiClient({
    channelAccessToken: token
  });
  const locationMessage = createLocationMessage(location);
  await client.pushMessage({
    to: chatId,
    messages: [locationMessage]
  });
  (0, _channelActivity.recordChannelActivity)({
    channel: "line",
    accountId: account.accountId,
    direction: "outbound"
  });
  if (opts.verbose) {
    (0, _globals.logVerbose)(`line: pushed location to ${chatId}`);
  }
  return {
    messageId: "push",
    chatId
  };
}
/**
 * Push a Flex Message to a user/group
 */
async function pushFlexMessage(to, altText, contents, opts = {}) {
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveLineAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = resolveToken(opts.channelAccessToken, account);
  const chatId = normalizeTarget(to);
  const client = new _botSdk.messagingApi.MessagingApiClient({
    channelAccessToken: token
  });
  const flexMessage = {
    type: "flex",
    altText: altText.slice(0, 400), // LINE limit
    contents
  };
  await client.
  pushMessage({
    to: chatId,
    messages: [flexMessage]
  }).
  catch((err) => {
    logLineHttpError(err, "push flex message");
    throw err;
  });
  (0, _channelActivity.recordChannelActivity)({
    channel: "line",
    accountId: account.accountId,
    direction: "outbound"
  });
  if (opts.verbose) {
    (0, _globals.logVerbose)(`line: pushed flex message to ${chatId}`);
  }
  return {
    messageId: "push",
    chatId
  };
}
/**
 * Push a Template Message to a user/group
 */
async function pushTemplateMessage(to, template, opts = {}) {
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveLineAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = resolveToken(opts.channelAccessToken, account);
  const chatId = normalizeTarget(to);
  const client = new _botSdk.messagingApi.MessagingApiClient({
    channelAccessToken: token
  });
  await client.pushMessage({
    to: chatId,
    messages: [template]
  });
  (0, _channelActivity.recordChannelActivity)({
    channel: "line",
    accountId: account.accountId,
    direction: "outbound"
  });
  if (opts.verbose) {
    (0, _globals.logVerbose)(`line: pushed template message to ${chatId}`);
  }
  return {
    messageId: "push",
    chatId
  };
}
/**
 * Push a text message with quick reply buttons
 */
async function pushTextMessageWithQuickReplies(to, text, quickReplyLabels, opts = {}) {
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveLineAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = resolveToken(opts.channelAccessToken, account);
  const chatId = normalizeTarget(to);
  const client = new _botSdk.messagingApi.MessagingApiClient({
    channelAccessToken: token
  });
  const message = createTextMessageWithQuickReplies(text, quickReplyLabels);
  await client.pushMessage({
    to: chatId,
    messages: [message]
  });
  (0, _channelActivity.recordChannelActivity)({
    channel: "line",
    accountId: account.accountId,
    direction: "outbound"
  });
  if (opts.verbose) {
    (0, _globals.logVerbose)(`line: pushed message with quick replies to ${chatId}`);
  }
  return {
    messageId: "push",
    chatId
  };
}
/**
 * Create quick reply buttons to attach to a message
 */
function createQuickReplyItems(labels) {
  const items = labels.slice(0, 13).map((label) => ({
    type: "action",
    action: {
      type: "message",
      label: label.slice(0, 20), // LINE limit: 20 chars
      text: label
    }
  }));
  return { items };
}
/**
 * Create a text message with quick reply buttons
 */
function createTextMessageWithQuickReplies(text, quickReplyLabels) {
  return {
    type: "text",
    text,
    quickReply: createQuickReplyItems(quickReplyLabels)
  };
}
/**
 * Show loading animation to user (lasts up to 20 seconds or until next message)
 */
async function showLoadingAnimation(chatId, opts = {}) {
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveLineAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = resolveToken(opts.channelAccessToken, account);
  const client = new _botSdk.messagingApi.MessagingApiClient({
    channelAccessToken: token
  });
  try {
    await client.showLoadingAnimation({
      chatId: normalizeTarget(chatId),
      loadingSeconds: opts.loadingSeconds ?? 20
    });
    (0, _globals.logVerbose)(`line: showing loading animation to ${chatId}`);
  }
  catch (err) {
    // Loading animation may fail for groups or unsupported clients - ignore
    (0, _globals.logVerbose)(`line: loading animation failed (non-fatal): ${String(err)}`);
  }
}
/**
 * Fetch user profile (display name, picture URL)
 */
async function getUserProfile(userId, opts = {}) {
  const useCache = opts.useCache ?? true;
  // Check cache first
  if (useCache) {
    const cached = userProfileCache.get(userId);
    if (cached && Date.now() - cached.fetchedAt < PROFILE_CACHE_TTL_MS) {
      return { displayName: cached.displayName, pictureUrl: cached.pictureUrl };
    }
  }
  const cfg = (0, _config.loadConfig)();
  const account = (0, _accounts.resolveLineAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = resolveToken(opts.channelAccessToken, account);
  const client = new _botSdk.messagingApi.MessagingApiClient({
    channelAccessToken: token
  });
  try {
    const profile = await client.getProfile(userId);
    const result = {
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl
    };
    // Cache the result
    userProfileCache.set(userId, {
      ...result,
      fetchedAt: Date.now()
    });
    return result;
  }
  catch (err) {
    (0, _globals.logVerbose)(`line: failed to fetch profile for ${userId}: ${String(err)}`);
    return null;
  }
}
/**
 * Get user's display name (with fallback to userId)
 */
async function getUserDisplayName(userId, opts = {}) {
  const profile = await getUserProfile(userId, opts);
  return profile?.displayName ?? userId;
} /* v9-96858c5c56b82e73 */
