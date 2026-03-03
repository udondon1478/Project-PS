"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createSignalEventHandler = createSignalEventHandler;var _identity = require("../../agents/identity.js");
var _commandDetection = require("../../auto-reply/command-detection.js");
var _dispatch = require("../../auto-reply/dispatch.js");
var _envelope = require("../../auto-reply/envelope.js");
var _inboundDebounce = require("../../auto-reply/inbound-debounce.js");
var _history = require("../../auto-reply/reply/history.js");
var _inboundContext = require("../../auto-reply/reply/inbound-context.js");
var _replyDispatcher = require("../../auto-reply/reply/reply-dispatcher.js");
var _commandGating = require("../../channels/command-gating.js");
var _logging = require("../../channels/logging.js");
var _replyPrefix = require("../../channels/reply-prefix.js");
var _session = require("../../channels/session.js");
var _typing = require("../../channels/typing.js");
var _sessions = require("../../config/sessions.js");
var _globals = require("../../globals.js");
var _systemEvents = require("../../infra/system-events.js");
var _constants = require("../../media/constants.js");
var _pairingMessages = require("../../pairing/pairing-messages.js");
var _pairingStore = require("../../pairing/pairing-store.js");
var _resolveRoute = require("../../routing/resolve-route.js");
var _utils = require("../../utils.js");
var _identity2 = require("../identity.js");
var _send = require("../send.js");
function createSignalEventHandler(deps) {
  const inboundDebounceMs = (0, _inboundDebounce.resolveInboundDebounceMs)({ cfg: deps.cfg, channel: "signal" });
  async function handleSignalInboundMessage(entry) {
    const fromLabel = (0, _envelope.formatInboundFromLabel)({
      isGroup: entry.isGroup,
      groupLabel: entry.groupName ?? undefined,
      groupId: entry.groupId ?? "unknown",
      groupFallback: "Group",
      directLabel: entry.senderName,
      directId: entry.senderDisplay
    });
    const route = (0, _resolveRoute.resolveAgentRoute)({
      cfg: deps.cfg,
      channel: "signal",
      accountId: deps.accountId,
      peer: {
        kind: entry.isGroup ? "group" : "dm",
        id: entry.isGroup ? entry.groupId ?? "unknown" : entry.senderPeerId
      }
    });
    const storePath = (0, _sessions.resolveStorePath)(deps.cfg.session?.store, {
      agentId: route.agentId
    });
    const envelopeOptions = (0, _envelope.resolveEnvelopeFormatOptions)(deps.cfg);
    const previousTimestamp = (0, _sessions.readSessionUpdatedAt)({
      storePath,
      sessionKey: route.sessionKey
    });
    const body = (0, _envelope.formatInboundEnvelope)({
      channel: "Signal",
      from: fromLabel,
      timestamp: entry.timestamp ?? undefined,
      body: entry.bodyText,
      chatType: entry.isGroup ? "group" : "direct",
      sender: { name: entry.senderName, id: entry.senderDisplay },
      previousTimestamp,
      envelope: envelopeOptions
    });
    let combinedBody = body;
    const historyKey = entry.isGroup ? String(entry.groupId ?? "unknown") : undefined;
    if (entry.isGroup && historyKey) {
      combinedBody = (0, _history.buildPendingHistoryContextFromMap)({
        historyMap: deps.groupHistories,
        historyKey,
        limit: deps.historyLimit,
        currentMessage: combinedBody,
        formatEntry: (historyEntry) => (0, _envelope.formatInboundEnvelope)({
          channel: "Signal",
          from: fromLabel,
          timestamp: historyEntry.timestamp,
          body: `${historyEntry.body}${historyEntry.messageId ? ` [id:${historyEntry.messageId}]` : ""}`,
          chatType: "group",
          senderLabel: historyEntry.sender,
          envelope: envelopeOptions
        })
      });
    }
    const signalTo = entry.isGroup ? `group:${entry.groupId}` : `signal:${entry.senderRecipient}`;
    const ctxPayload = (0, _inboundContext.finalizeInboundContext)({
      Body: combinedBody,
      RawBody: entry.bodyText,
      CommandBody: entry.bodyText,
      From: entry.isGroup ?
      `group:${entry.groupId ?? "unknown"}` :
      `signal:${entry.senderRecipient}`,
      To: signalTo,
      SessionKey: route.sessionKey,
      AccountId: route.accountId,
      ChatType: entry.isGroup ? "group" : "direct",
      ConversationLabel: fromLabel,
      GroupSubject: entry.isGroup ? entry.groupName ?? undefined : undefined,
      SenderName: entry.senderName,
      SenderId: entry.senderDisplay,
      Provider: "signal",
      Surface: "signal",
      MessageSid: entry.messageId,
      Timestamp: entry.timestamp ?? undefined,
      MediaPath: entry.mediaPath,
      MediaType: entry.mediaType,
      MediaUrl: entry.mediaPath,
      CommandAuthorized: entry.commandAuthorized,
      OriginatingChannel: "signal",
      OriginatingTo: signalTo
    });
    await (0, _session.recordInboundSession)({
      storePath,
      sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
      ctx: ctxPayload,
      updateLastRoute: !entry.isGroup ?
      {
        sessionKey: route.mainSessionKey,
        channel: "signal",
        to: entry.senderRecipient,
        accountId: route.accountId
      } :
      undefined,
      onRecordError: (err) => {
        (0, _globals.logVerbose)(`signal: failed updating session meta: ${String(err)}`);
      }
    });
    if ((0, _globals.shouldLogVerbose)()) {
      const preview = body.slice(0, 200).replace(/\\n/g, "\\\\n");
      (0, _globals.logVerbose)(`signal inbound: from=${ctxPayload.From} len=${body.length} preview="${preview}"`);
    }
    const prefixContext = (0, _replyPrefix.createReplyPrefixContext)({ cfg: deps.cfg, agentId: route.agentId });
    const typingCallbacks = (0, _typing.createTypingCallbacks)({
      start: async () => {
        if (!ctxPayload.To) {
          return;
        }
        await (0, _send.sendTypingSignal)(ctxPayload.To, {
          baseUrl: deps.baseUrl,
          account: deps.account,
          accountId: deps.accountId
        });
      },
      onStartError: (err) => {
        (0, _logging.logTypingFailure)({
          log: _globals.logVerbose,
          channel: "signal",
          target: ctxPayload.To ?? undefined,
          error: err
        });
      }
    });
    const { dispatcher, replyOptions, markDispatchIdle } = (0, _replyDispatcher.createReplyDispatcherWithTyping)({
      responsePrefix: prefixContext.responsePrefix,
      responsePrefixContextProvider: prefixContext.responsePrefixContextProvider,
      humanDelay: (0, _identity.resolveHumanDelayConfig)(deps.cfg, route.agentId),
      deliver: async (payload) => {
        await deps.deliverReplies({
          replies: [payload],
          target: ctxPayload.To,
          baseUrl: deps.baseUrl,
          account: deps.account,
          accountId: deps.accountId,
          runtime: deps.runtime,
          maxBytes: deps.mediaMaxBytes,
          textLimit: deps.textLimit
        });
      },
      onError: (err, info) => {
        deps.runtime.error?.((0, _globals.danger)(`signal ${info.kind} reply failed: ${String(err)}`));
      },
      onReplyStart: typingCallbacks.onReplyStart
    });
    const { queuedFinal } = await (0, _dispatch.dispatchInboundMessage)({
      ctx: ctxPayload,
      cfg: deps.cfg,
      dispatcher,
      replyOptions: {
        ...replyOptions,
        disableBlockStreaming: typeof deps.blockStreaming === "boolean" ? !deps.blockStreaming : undefined,
        onModelSelected: (ctx) => {
          prefixContext.onModelSelected(ctx);
        }
      }
    });
    markDispatchIdle();
    if (!queuedFinal) {
      if (entry.isGroup && historyKey) {
        (0, _history.clearHistoryEntriesIfEnabled)({
          historyMap: deps.groupHistories,
          historyKey,
          limit: deps.historyLimit
        });
      }
      return;
    }
    if (entry.isGroup && historyKey) {
      (0, _history.clearHistoryEntriesIfEnabled)({
        historyMap: deps.groupHistories,
        historyKey,
        limit: deps.historyLimit
      });
    }
  }
  const inboundDebouncer = (0, _inboundDebounce.createInboundDebouncer)({
    debounceMs: inboundDebounceMs,
    buildKey: (entry) => {
      const conversationId = entry.isGroup ? entry.groupId ?? "unknown" : entry.senderPeerId;
      if (!conversationId || !entry.senderPeerId) {
        return null;
      }
      return `signal:${deps.accountId}:${conversationId}:${entry.senderPeerId}`;
    },
    shouldDebounce: (entry) => {
      if (!entry.bodyText.trim()) {
        return false;
      }
      if (entry.mediaPath || entry.mediaType) {
        return false;
      }
      return !(0, _commandDetection.hasControlCommand)(entry.bodyText, deps.cfg);
    },
    onFlush: async (entries) => {
      const last = entries.at(-1);
      if (!last) {
        return;
      }
      if (entries.length === 1) {
        await handleSignalInboundMessage(last);
        return;
      }
      const combinedText = entries.
      map((entry) => entry.bodyText).
      filter(Boolean).
      join("\\n");
      if (!combinedText.trim()) {
        return;
      }
      await handleSignalInboundMessage({
        ...last,
        bodyText: combinedText,
        mediaPath: undefined,
        mediaType: undefined
      });
    },
    onError: (err) => {
      deps.runtime.error?.(`signal debounce flush failed: ${String(err)}`);
    }
  });
  return async (event) => {
    if (event.event !== "receive" || !event.data) {
      return;
    }
    let payload = null;
    try {
      payload = JSON.parse(event.data);
    }
    catch (err) {
      deps.runtime.error?.(`failed to parse event: ${String(err)}`);
      return;
    }
    if (payload?.exception?.message) {
      deps.runtime.error?.(`receive exception: ${payload.exception.message}`);
    }
    const envelope = payload?.envelope;
    if (!envelope) {
      return;
    }
    if (envelope.syncMessage) {
      return;
    }
    const sender = (0, _identity2.resolveSignalSender)(envelope);
    if (!sender) {
      return;
    }
    if (deps.account && sender.kind === "phone") {
      if (sender.e164 === (0, _utils.normalizeE164)(deps.account)) {
        return;
      }
    }
    const dataMessage = envelope.dataMessage ?? envelope.editMessage?.dataMessage;
    const reaction = deps.isSignalReactionMessage(envelope.reactionMessage) ?
    envelope.reactionMessage :
    deps.isSignalReactionMessage(dataMessage?.reaction) ?
    dataMessage?.reaction :
    null;
    const messageText = (dataMessage?.message ?? "").trim();
    const quoteText = dataMessage?.quote?.text?.trim() ?? "";
    const hasBodyContent = Boolean(messageText || quoteText) || Boolean(!reaction && dataMessage?.attachments?.length);
    if (reaction && !hasBodyContent) {
      if (reaction.isRemove) {
        return;
      } // Ignore reaction removals
      const emojiLabel = reaction.emoji?.trim() || "emoji";
      const senderDisplay = (0, _identity2.formatSignalSenderDisplay)(sender);
      const senderName = envelope.sourceName ?? senderDisplay;
      (0, _globals.logVerbose)(`signal reaction: ${emojiLabel} from ${senderName}`);
      const targets = deps.resolveSignalReactionTargets(reaction);
      const shouldNotify = deps.shouldEmitSignalReactionNotification({
        mode: deps.reactionMode,
        account: deps.account,
        targets,
        sender,
        allowlist: deps.reactionAllowlist
      });
      if (!shouldNotify) {
        return;
      }
      const groupId = reaction.groupInfo?.groupId ?? undefined;
      const groupName = reaction.groupInfo?.groupName ?? undefined;
      const isGroup = Boolean(groupId);
      const senderPeerId = (0, _identity2.resolveSignalPeerId)(sender);
      const route = (0, _resolveRoute.resolveAgentRoute)({
        cfg: deps.cfg,
        channel: "signal",
        accountId: deps.accountId,
        peer: {
          kind: isGroup ? "group" : "dm",
          id: isGroup ? groupId ?? "unknown" : senderPeerId
        }
      });
      const groupLabel = isGroup ? `${groupName ?? "Signal Group"} id:${groupId}` : undefined;
      const messageId = reaction.targetSentTimestamp ?
      String(reaction.targetSentTimestamp) :
      "unknown";
      const text = deps.buildSignalReactionSystemEventText({
        emojiLabel,
        actorLabel: senderName,
        messageId,
        targetLabel: targets[0]?.display,
        groupLabel
      });
      const senderId = (0, _identity2.formatSignalSenderId)(sender);
      const contextKey = [
      "signal",
      "reaction",
      "added",
      messageId,
      senderId,
      emojiLabel,
      groupId ?? ""].

      filter(Boolean).
      join(":");
      (0, _systemEvents.enqueueSystemEvent)(text, { sessionKey: route.sessionKey, contextKey });
      return;
    }
    if (!dataMessage) {
      return;
    }
    const senderDisplay = (0, _identity2.formatSignalSenderDisplay)(sender);
    const senderRecipient = (0, _identity2.resolveSignalRecipient)(sender);
    const senderPeerId = (0, _identity2.resolveSignalPeerId)(sender);
    const senderAllowId = (0, _identity2.formatSignalSenderId)(sender);
    if (!senderRecipient) {
      return;
    }
    const senderIdLine = (0, _identity2.formatSignalPairingIdLine)(sender);
    const groupId = dataMessage.groupInfo?.groupId ?? undefined;
    const groupName = dataMessage.groupInfo?.groupName ?? undefined;
    const isGroup = Boolean(groupId);
    const storeAllowFrom = await (0, _pairingStore.readChannelAllowFromStore)("signal").catch(() => []);
    const effectiveDmAllow = [...deps.allowFrom, ...storeAllowFrom];
    const effectiveGroupAllow = [...deps.groupAllowFrom, ...storeAllowFrom];
    const dmAllowed = deps.dmPolicy === "open" ? true : (0, _identity2.isSignalSenderAllowed)(sender, effectiveDmAllow);
    if (!isGroup) {
      if (deps.dmPolicy === "disabled") {
        return;
      }
      if (!dmAllowed) {
        if (deps.dmPolicy === "pairing") {
          const senderId = senderAllowId;
          const { code, created } = await (0, _pairingStore.upsertChannelPairingRequest)({
            channel: "signal",
            id: senderId,
            meta: { name: envelope.sourceName ?? undefined }
          });
          if (created) {
            (0, _globals.logVerbose)(`signal pairing request sender=${senderId}`);
            try {
              await (0, _send.sendMessageSignal)(`signal:${senderRecipient}`, (0, _pairingMessages.buildPairingReply)({
                channel: "signal",
                idLine: senderIdLine,
                code
              }), {
                baseUrl: deps.baseUrl,
                account: deps.account,
                maxBytes: deps.mediaMaxBytes,
                accountId: deps.accountId
              });
            }
            catch (err) {
              (0, _globals.logVerbose)(`signal pairing reply failed for ${senderId}: ${String(err)}`);
            }
          }
        } else
        {
          (0, _globals.logVerbose)(`Blocked signal sender ${senderDisplay} (dmPolicy=${deps.dmPolicy})`);
        }
        return;
      }
    }
    if (isGroup && deps.groupPolicy === "disabled") {
      (0, _globals.logVerbose)("Blocked signal group message (groupPolicy: disabled)");
      return;
    }
    if (isGroup && deps.groupPolicy === "allowlist") {
      if (effectiveGroupAllow.length === 0) {
        (0, _globals.logVerbose)("Blocked signal group message (groupPolicy: allowlist, no groupAllowFrom)");
        return;
      }
      if (!(0, _identity2.isSignalSenderAllowed)(sender, effectiveGroupAllow)) {
        (0, _globals.logVerbose)(`Blocked signal group sender ${senderDisplay} (not in groupAllowFrom)`);
        return;
      }
    }
    const useAccessGroups = deps.cfg.commands?.useAccessGroups !== false;
    const ownerAllowedForCommands = (0, _identity2.isSignalSenderAllowed)(sender, effectiveDmAllow);
    const groupAllowedForCommands = (0, _identity2.isSignalSenderAllowed)(sender, effectiveGroupAllow);
    const hasControlCommandInMessage = (0, _commandDetection.hasControlCommand)(messageText, deps.cfg);
    const commandGate = (0, _commandGating.resolveControlCommandGate)({
      useAccessGroups,
      authorizers: [
      { configured: effectiveDmAllow.length > 0, allowed: ownerAllowedForCommands },
      { configured: effectiveGroupAllow.length > 0, allowed: groupAllowedForCommands }],

      allowTextCommands: true,
      hasControlCommand: hasControlCommandInMessage
    });
    const commandAuthorized = isGroup ? commandGate.commandAuthorized : dmAllowed;
    if (isGroup && commandGate.shouldBlock) {
      (0, _logging.logInboundDrop)({
        log: _globals.logVerbose,
        channel: "signal",
        reason: "control command (unauthorized)",
        target: senderDisplay
      });
      return;
    }
    let mediaPath;
    let mediaType;
    let placeholder = "";
    const firstAttachment = dataMessage.attachments?.[0];
    if (firstAttachment?.id && !deps.ignoreAttachments) {
      try {
        const fetched = await deps.fetchAttachment({
          baseUrl: deps.baseUrl,
          account: deps.account,
          attachment: firstAttachment,
          sender: senderRecipient,
          groupId,
          maxBytes: deps.mediaMaxBytes
        });
        if (fetched) {
          mediaPath = fetched.path;
          mediaType = fetched.contentType ?? firstAttachment.contentType ?? undefined;
        }
      }
      catch (err) {
        deps.runtime.error?.((0, _globals.danger)(`attachment fetch failed: ${String(err)}`));
      }
    }
    const kind = (0, _constants.mediaKindFromMime)(mediaType ?? undefined);
    if (kind) {
      placeholder = `<media:${kind}>`;
    } else
    if (dataMessage.attachments?.length) {
      placeholder = "<media:attachment>";
    }
    const bodyText = messageText || placeholder || dataMessage.quote?.text?.trim() || "";
    if (!bodyText) {
      return;
    }
    const receiptTimestamp = typeof envelope.timestamp === "number" ?
    envelope.timestamp :
    typeof dataMessage.timestamp === "number" ?
    dataMessage.timestamp :
    undefined;
    if (deps.sendReadReceipts && !deps.readReceiptsViaDaemon && !isGroup && receiptTimestamp) {
      try {
        await (0, _send.sendReadReceiptSignal)(`signal:${senderRecipient}`, receiptTimestamp, {
          baseUrl: deps.baseUrl,
          account: deps.account,
          accountId: deps.accountId
        });
      }
      catch (err) {
        (0, _globals.logVerbose)(`signal read receipt failed for ${senderDisplay}: ${String(err)}`);
      }
    } else
    if (deps.sendReadReceipts &&
    !deps.readReceiptsViaDaemon &&
    !isGroup &&
    !receiptTimestamp) {
      (0, _globals.logVerbose)(`signal read receipt skipped (missing timestamp) for ${senderDisplay}`);
    }
    const senderName = envelope.sourceName ?? senderDisplay;
    const messageId = typeof envelope.timestamp === "number" ? String(envelope.timestamp) : undefined;
    await inboundDebouncer.enqueue({
      senderName,
      senderDisplay,
      senderRecipient,
      senderPeerId,
      groupId,
      groupName,
      isGroup,
      bodyText,
      timestamp: envelope.timestamp ?? undefined,
      messageId,
      mediaPath,
      mediaType,
      commandAuthorized
    });
  };
} /* v9-d72a5f9991b47052 */
