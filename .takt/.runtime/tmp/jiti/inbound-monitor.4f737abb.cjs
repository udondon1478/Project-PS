"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.monitorWebInbox = monitorWebInbox;var _baileys = require("@whiskeysockets/baileys");
var _inboundDebounce = require("../../auto-reply/inbound-debounce.js");
var _location = require("../../channels/location.js");
var _globals = require("../../globals.js");
var _channelActivity = require("../../infra/channel-activity.js");
var _logger = require("../../logging/logger.js");
var _subsystem = require("../../logging/subsystem.js");
var _store = require("../../media/store.js");
var _utils = require("../../utils.js");
var _session = require("../session.js");
var _accessControl = require("./access-control.js");
var _dedupe = require("./dedupe.js");
var _extract = require("./extract.js");
var _media = require("./media.js");
var _sendApi = require("./send-api.js");
async function monitorWebInbox(options) {
  const inboundLogger = (0, _logger.getChildLogger)({ module: "web-inbound" });
  const inboundConsoleLog = (0, _subsystem.createSubsystemLogger)("gateway/channels/whatsapp").child("inbound");
  const sock = await (0, _session.createWaSocket)(false, options.verbose, {
    authDir: options.authDir
  });
  await (0, _session.waitForWaConnection)(sock);
  const connectedAtMs = Date.now();
  let onCloseResolve = null;
  const onClose = new Promise((resolve) => {
    onCloseResolve = resolve;
  });
  const resolveClose = (reason) => {
    if (!onCloseResolve) {
      return;
    }
    const resolver = onCloseResolve;
    onCloseResolve = null;
    resolver(reason);
  };
  try {
    await sock.sendPresenceUpdate("available");
    if ((0, _globals.shouldLogVerbose)()) {
      (0, _globals.logVerbose)("Sent global 'available' presence on connect");
    }
  }
  catch (err) {
    (0, _globals.logVerbose)(`Failed to send 'available' presence on connect: ${String(err)}`);
  }
  const selfJid = sock.user?.id;
  const selfE164 = selfJid ? (0, _utils.jidToE164)(selfJid) : null;
  const debouncer = (0, _inboundDebounce.createInboundDebouncer)({
    debounceMs: options.debounceMs ?? 0,
    buildKey: (msg) => {
      const senderKey = msg.chatType === "group" ?
      msg.senderJid ?? msg.senderE164 ?? msg.senderName ?? msg.from :
      msg.from;
      if (!senderKey) {
        return null;
      }
      const conversationKey = msg.chatType === "group" ? msg.chatId : msg.from;
      return `${msg.accountId}:${conversationKey}:${senderKey}`;
    },
    shouldDebounce: options.shouldDebounce,
    onFlush: async (entries) => {
      const last = entries.at(-1);
      if (!last) {
        return;
      }
      if (entries.length === 1) {
        await options.onMessage(last);
        return;
      }
      const mentioned = new Set();
      for (const entry of entries) {
        for (const jid of entry.mentionedJids ?? []) {
          mentioned.add(jid);
        }
      }
      const combinedBody = entries.
      map((entry) => entry.body).
      filter(Boolean).
      join("\n");
      const combinedMessage = {
        ...last,
        body: combinedBody,
        mentionedJids: mentioned.size > 0 ? Array.from(mentioned) : undefined
      };
      await options.onMessage(combinedMessage);
    },
    onError: (err) => {
      inboundLogger.error({ error: String(err) }, "failed handling inbound web message");
      inboundConsoleLog.error(`Failed handling inbound web message: ${String(err)}`);
    }
  });
  const groupMetaCache = new Map();
  const GROUP_META_TTL_MS = 5 * 60 * 1000; // 5 minutes
  const lidLookup = sock.signalRepository?.lidMapping;
  const resolveInboundJid = async (jid) => (0, _utils.resolveJidToE164)(jid, { authDir: options.authDir, lidLookup });
  const getGroupMeta = async (jid) => {
    const cached = groupMetaCache.get(jid);
    if (cached && cached.expires > Date.now()) {
      return cached;
    }
    try {
      const meta = await sock.groupMetadata(jid);
      const participants = (await Promise.all(meta.participants?.map(async (p) => {
        const mapped = await resolveInboundJid(p.id);
        return mapped ?? p.id;
      }) ?? [])).filter(Boolean) ?? [];
      const entry = {
        subject: meta.subject,
        participants,
        expires: Date.now() + GROUP_META_TTL_MS
      };
      groupMetaCache.set(jid, entry);
      return entry;
    }
    catch (err) {
      (0, _globals.logVerbose)(`Failed to fetch group metadata for ${jid}: ${String(err)}`);
      return { expires: Date.now() + GROUP_META_TTL_MS };
    }
  };
  const handleMessagesUpsert = async (upsert) => {
    if (upsert.type !== "notify" && upsert.type !== "append") {
      return;
    }
    for (const msg of upsert.messages ?? []) {
      (0, _channelActivity.recordChannelActivity)({
        channel: "whatsapp",
        accountId: options.accountId,
        direction: "inbound"
      });
      const id = msg.key?.id ?? undefined;
      const remoteJid = msg.key?.remoteJid;
      if (!remoteJid) {
        continue;
      }
      if (remoteJid.endsWith("@status") || remoteJid.endsWith("@broadcast")) {
        continue;
      }
      const group = (0, _baileys.isJidGroup)(remoteJid) === true;
      if (id) {
        const dedupeKey = `${options.accountId}:${remoteJid}:${id}`;
        if ((0, _dedupe.isRecentInboundMessage)(dedupeKey)) {
          continue;
        }
      }
      const participantJid = msg.key?.participant ?? undefined;
      const from = group ? remoteJid : await resolveInboundJid(remoteJid);
      if (!from) {
        continue;
      }
      const senderE164 = group ?
      participantJid ?
      await resolveInboundJid(participantJid) :
      null :
      from;
      let groupSubject;
      let groupParticipants;
      if (group) {
        const meta = await getGroupMeta(remoteJid);
        groupSubject = meta.subject;
        groupParticipants = meta.participants;
      }
      const messageTimestampMs = msg.messageTimestamp ?
      Number(msg.messageTimestamp) * 1000 :
      undefined;
      const access = await (0, _accessControl.checkInboundAccessControl)({
        accountId: options.accountId,
        from,
        selfE164,
        senderE164,
        group,
        pushName: msg.pushName ?? undefined,
        isFromMe: Boolean(msg.key?.fromMe),
        messageTimestampMs,
        connectedAtMs,
        sock: { sendMessage: (jid, content) => sock.sendMessage(jid, content) },
        remoteJid
      });
      if (!access.allowed) {
        continue;
      }
      if (id && !access.isSelfChat && options.sendReadReceipts !== false) {
        const participant = msg.key?.participant;
        try {
          await sock.readMessages([{ remoteJid, id, participant, fromMe: false }]);
          if ((0, _globals.shouldLogVerbose)()) {
            const suffix = participant ? ` (participant ${participant})` : "";
            (0, _globals.logVerbose)(`Marked message ${id} as read for ${remoteJid}${suffix}`);
          }
        }
        catch (err) {
          (0, _globals.logVerbose)(`Failed to mark message ${id} read: ${String(err)}`);
        }
      } else
      if (id && access.isSelfChat && (0, _globals.shouldLogVerbose)()) {
        // Self-chat mode: never auto-send read receipts (blue ticks) on behalf of the owner.
        (0, _globals.logVerbose)(`Self-chat mode: skipping read receipt for ${id}`);
      }
      // If this is history/offline catch-up, mark read above but skip auto-reply.
      if (upsert.type === "append") {
        continue;
      }
      const location = (0, _extract.extractLocationData)(msg.message ?? undefined);
      const locationText = location ? (0, _location.formatLocationText)(location) : undefined;
      let body = (0, _extract.extractText)(msg.message ?? undefined);
      if (locationText) {
        body = [body, locationText].filter(Boolean).join("\n").trim();
      }
      if (!body) {
        body = (0, _extract.extractMediaPlaceholder)(msg.message ?? undefined);
        if (!body) {
          continue;
        }
      }
      const replyContext = (0, _extract.describeReplyContext)(msg.message);
      let mediaPath;
      let mediaType;
      try {
        const inboundMedia = await (0, _media.downloadInboundMedia)(msg, sock);
        if (inboundMedia) {
          const maxMb = typeof options.mediaMaxMb === "number" && options.mediaMaxMb > 0 ?
          options.mediaMaxMb :
          50;
          const maxBytes = maxMb * 1024 * 1024;
          const saved = await (0, _store.saveMediaBuffer)(inboundMedia.buffer, inboundMedia.mimetype, "inbound", maxBytes);
          mediaPath = saved.path;
          mediaType = inboundMedia.mimetype;
        }
      }
      catch (err) {
        (0, _globals.logVerbose)(`Inbound media download failed: ${String(err)}`);
      }
      const chatJid = remoteJid;
      const sendComposing = async () => {
        try {
          await sock.sendPresenceUpdate("composing", chatJid);
        }
        catch (err) {
          (0, _globals.logVerbose)(`Presence update failed: ${String(err)}`);
        }
      };
      const reply = async (text) => {
        await sock.sendMessage(chatJid, { text });
      };
      const sendMedia = async (payload) => {
        await sock.sendMessage(chatJid, payload);
      };
      const timestamp = messageTimestampMs;
      const mentionedJids = (0, _extract.extractMentionedJids)(msg.message);
      const senderName = msg.pushName ?? undefined;
      inboundLogger.info({ from, to: selfE164 ?? "me", body, mediaPath, mediaType, timestamp }, "inbound message");
      const inboundMessage = {
        id,
        from,
        conversationId: from,
        to: selfE164 ?? "me",
        accountId: access.resolvedAccountId,
        body,
        pushName: senderName,
        timestamp,
        chatType: group ? "group" : "direct",
        chatId: remoteJid,
        senderJid: participantJid,
        senderE164: senderE164 ?? undefined,
        senderName,
        replyToId: replyContext?.id,
        replyToBody: replyContext?.body,
        replyToSender: replyContext?.sender,
        replyToSenderJid: replyContext?.senderJid,
        replyToSenderE164: replyContext?.senderE164,
        groupSubject,
        groupParticipants,
        mentionedJids: mentionedJids ?? undefined,
        selfJid,
        selfE164,
        location: location ?? undefined,
        sendComposing,
        reply,
        sendMedia,
        mediaPath,
        mediaType
      };
      try {
        const task = Promise.resolve(debouncer.enqueue(inboundMessage));
        void task.catch((err) => {
          inboundLogger.error({ error: String(err) }, "failed handling inbound web message");
          inboundConsoleLog.error(`Failed handling inbound web message: ${String(err)}`);
        });
      }
      catch (err) {
        inboundLogger.error({ error: String(err) }, "failed handling inbound web message");
        inboundConsoleLog.error(`Failed handling inbound web message: ${String(err)}`);
      }
    }
  };
  sock.ev.on("messages.upsert", handleMessagesUpsert);
  const handleConnectionUpdate = (update) => {
    try {
      if (update.connection === "close") {
        const status = (0, _session.getStatusCode)(update.lastDisconnect?.error);
        resolveClose({
          status,
          isLoggedOut: status === _baileys.DisconnectReason.loggedOut,
          error: update.lastDisconnect?.error
        });
      }
    }
    catch (err) {
      inboundLogger.error({ error: String(err) }, "connection.update handler error");
      resolveClose({ status: undefined, isLoggedOut: false, error: err });
    }
  };
  sock.ev.on("connection.update", handleConnectionUpdate);
  const sendApi = (0, _sendApi.createWebSendApi)({
    sock: {
      sendMessage: (jid, content) => sock.sendMessage(jid, content),
      sendPresenceUpdate: (presence, jid) => sock.sendPresenceUpdate(presence, jid)
    },
    defaultAccountId: options.accountId
  });
  return {
    close: async () => {
      try {
        const ev = sock.ev;
        const messagesUpsertHandler = handleMessagesUpsert;
        const connectionUpdateHandler = handleConnectionUpdate;
        if (typeof ev.off === "function") {
          ev.off("messages.upsert", messagesUpsertHandler);
          ev.off("connection.update", connectionUpdateHandler);
        } else
        if (typeof ev.removeListener === "function") {
          ev.removeListener("messages.upsert", messagesUpsertHandler);
          ev.removeListener("connection.update", connectionUpdateHandler);
        }
        sock.ws?.close();
      }
      catch (err) {
        (0, _globals.logVerbose)(`Socket close failed: ${String(err)}`);
      }
    },
    onClose,
    signalClose: (reason) => {
      resolveClose(reason ?? { status: undefined, isLoggedOut: false, error: "closed" });
    },
    // IPC surface (sendMessage/sendPoll/sendReaction/sendComposingTo)
    ...sendApi
  };
} /* v9-0769d87a9d9220ef */
