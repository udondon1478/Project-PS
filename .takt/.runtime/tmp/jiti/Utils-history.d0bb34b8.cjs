"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.processHistoryMessage = exports.getHistoryMsg = exports.downloadHistory = exports.downloadAndProcessHistorySyncNotification = void 0;var _util = require("util");
var _zlib = require("zlib");
var _index = require("../../WAProto/index.js");
var _index2 = require("../Types/index.js");
var _generics = require("./generics.js");
var _messages = require("./messages.js");
var _messagesMedia = require("./messages-media.js");
const inflatePromise = (0, _util.promisify)(_zlib.inflate);
const downloadHistory = async (msg, options) => {
  const stream = await (0, _messagesMedia.downloadContentFromMessage)(msg, 'md-msg-hist', { options });
  const bufferArray = [];
  for await (const chunk of stream) {
    bufferArray.push(chunk);
  }
  let buffer = Buffer.concat(bufferArray);
  // decompress buffer
  buffer = await inflatePromise(buffer);
  const syncData = _index.proto.HistorySync.decode(buffer);
  return syncData;
};exports.downloadHistory = downloadHistory;
const processHistoryMessage = (item) => {
  const messages = [];
  const contacts = [];
  const chats = [];
  switch (item.syncType) {
    case _index.proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP:
    case _index.proto.HistorySync.HistorySyncType.RECENT:
    case _index.proto.HistorySync.HistorySyncType.FULL:
    case _index.proto.HistorySync.HistorySyncType.ON_DEMAND:
      for (const chat of item.conversations) {
        contacts.push({
          id: chat.id,
          name: chat.name || undefined,
          lid: chat.lidJid || undefined,
          phoneNumber: chat.pnJid || undefined
        });
        const msgs = chat.messages || [];
        delete chat.messages;
        for (const item of msgs) {
          const message = item.message;
          messages.push(message);
          if (!chat.messages?.length) {
            // keep only the most recent message in the chat array
            chat.messages = [{ message }];
          }
          if (!message.key.fromMe && !chat.lastMessageRecvTimestamp) {
            chat.lastMessageRecvTimestamp = (0, _generics.toNumber)(message.messageTimestamp);
          }
          if ((message.messageStubType === _index2.WAMessageStubType.BIZ_PRIVACY_MODE_TO_BSP ||
          message.messageStubType === _index2.WAMessageStubType.BIZ_PRIVACY_MODE_TO_FB) &&
          message.messageStubParameters?.[0]) {
            contacts.push({
              id: message.key.participant || message.key.remoteJid,
              verifiedName: message.messageStubParameters?.[0]
            });
          }
        }
        chats.push({ ...chat });
      }
      break;
    case _index.proto.HistorySync.HistorySyncType.PUSH_NAME:
      for (const c of item.pushnames) {
        contacts.push({ id: c.id, notify: c.pushname });
      }
      break;
  }
  return {
    chats,
    contacts,
    messages,
    syncType: item.syncType,
    progress: item.progress
  };
};exports.processHistoryMessage = processHistoryMessage;
const downloadAndProcessHistorySyncNotification = async (msg, options) => {
  let historyMsg;
  if (msg.initialHistBootstrapInlinePayload) {
    historyMsg = _index.proto.HistorySync.decode(await inflatePromise(msg.initialHistBootstrapInlinePayload));
  } else
  {
    historyMsg = await downloadHistory(msg, options);
  }
  return processHistoryMessage(historyMsg);
};exports.downloadAndProcessHistorySyncNotification = downloadAndProcessHistorySyncNotification;
const getHistoryMsg = (message) => {
  const normalizedContent = !!message ? (0, _messages.normalizeMessageContent)(message) : undefined;
  const anyHistoryMsg = normalizedContent?.protocolMessage?.historySyncNotification;
  return anyHistoryMsg;
};exports.getHistoryMsg = getHistoryMsg; /* v9-84e2289af41116ff */
