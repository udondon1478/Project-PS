"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.monitorIMessageProvider = monitorIMessageProvider;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _identity = require("../../agents/identity.js");
var _chunk = require("../../auto-reply/chunk.js");
var _commandDetection = require("../../auto-reply/command-detection.js");
var _dispatch = require("../../auto-reply/dispatch.js");
var _envelope = require("../../auto-reply/envelope.js");
var _inboundDebounce = require("../../auto-reply/inbound-debounce.js");
var _history = require("../../auto-reply/reply/history.js");
var _inboundContext = require("../../auto-reply/reply/inbound-context.js");
var _mentions = require("../../auto-reply/reply/mentions.js");
var _replyDispatcher = require("../../auto-reply/reply/reply-dispatcher.js");
var _commandGating = require("../../channels/command-gating.js");
var _logging = require("../../channels/logging.js");
var _replyPrefix = require("../../channels/reply-prefix.js");
var _session = require("../../channels/session.js");
var _config = require("../../config/config.js");
var _groupPolicy = require("../../config/group-policy.js");
var _sessions = require("../../config/sessions.js");
var _globals = require("../../globals.js");
var _transportReady = require("../../infra/transport-ready.js");
var _constants = require("../../media/constants.js");
var _pairingMessages = require("../../pairing/pairing-messages.js");
var _pairingStore = require("../../pairing/pairing-store.js");
var _resolveRoute = require("../../routing/resolve-route.js");
var _utils = require("../../utils.js");
var _accounts = require("../accounts.js");
var _client = require("../client.js");
var _probe = require("../probe.js");
var _send = require("../send.js");
var _targets = require("../targets.js");
var _deliver = require("./deliver.js");
var _runtime = require("./runtime.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
/**
 * Try to detect remote host from an SSH wrapper script like:
 *   exec ssh -T openclaw@192.168.64.3 /opt/homebrew/bin/imsg "$@"
 *   exec ssh -T mac-mini imsg "$@"
 * Returns the user@host or host portion if found, undefined otherwise.
 */
async function detectRemoteHostFromCliPath(cliPath) {
  try {
    // Expand ~ to home directory
    const expanded = cliPath.startsWith("~") ?
    cliPath.replace(/^~/, process.env.HOME ?? "") :
    cliPath;
    const content = await _promises.default.readFile(expanded, "utf8");
    // Match user@host pattern first (e.g., openclaw@192.168.64.3)
    const userHostMatch = content.match(/\bssh\b[^\n]*?\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+)/);
    if (userHostMatch) {
      return userHostMatch[1];
    }
    // Fallback: match host-only before imsg command (e.g., ssh -T mac-mini imsg)
    const hostOnlyMatch = content.match(/\bssh\b[^\n]*?\s+([a-zA-Z][a-zA-Z0-9._-]*)\s+\S*\bimsg\b/);
    return hostOnlyMatch?.[1];
  }
  catch {
    return undefined;
  }
}
function normalizeReplyField(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return undefined;
}
function describeReplyContext(message) {
  const body = normalizeReplyField(message.reply_to_text);
  if (!body) {
    return null;
  }
  const id = normalizeReplyField(message.reply_to_id);
  const sender = normalizeReplyField(message.reply_to_sender);
  return { body, id, sender };
}
async function monitorIMessageProvider(opts = {}) {
  const runtime = (0, _runtime.resolveRuntime)(opts);
  const cfg = opts.config ?? (0, _config.loadConfig)();
  const accountInfo = (0, _accounts.resolveIMessageAccount)({
    cfg,
    accountId: opts.accountId
  });
  const imessageCfg = accountInfo.config;
  const historyLimit = Math.max(0, imessageCfg.historyLimit ??
  cfg.messages?.groupChat?.historyLimit ??
  _history.DEFAULT_GROUP_HISTORY_LIMIT);
  const groupHistories = new Map();
  const textLimit = (0, _chunk.resolveTextChunkLimit)(cfg, "imessage", accountInfo.accountId);
  const allowFrom = (0, _runtime.normalizeAllowList)(opts.allowFrom ?? imessageCfg.allowFrom);
  const groupAllowFrom = (0, _runtime.normalizeAllowList)(opts.groupAllowFrom ??
  imessageCfg.groupAllowFrom ?? (
  imessageCfg.allowFrom && imessageCfg.allowFrom.length > 0 ? imessageCfg.allowFrom : []));
  const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
  const groupPolicy = imessageCfg.groupPolicy ?? defaultGroupPolicy ?? "open";
  const dmPolicy = imessageCfg.dmPolicy ?? "pairing";
  const includeAttachments = opts.includeAttachments ?? imessageCfg.includeAttachments ?? false;
  const mediaMaxBytes = (opts.mediaMaxMb ?? imessageCfg.mediaMaxMb ?? 16) * 1024 * 1024;
  const cliPath = opts.cliPath ?? imessageCfg.cliPath ?? "imsg";
  const dbPath = opts.dbPath ?? imessageCfg.dbPath;
  // Resolve remoteHost: explicit config, or auto-detect from SSH wrapper script
  let remoteHost = imessageCfg.remoteHost;
  if (!remoteHost && cliPath && cliPath !== "imsg") {
    remoteHost = await detectRemoteHostFromCliPath(cliPath);
    if (remoteHost) {
      (0, _globals.logVerbose)(`imessage: detected remoteHost=${remoteHost} from cliPath`);
    }
  }
  const inboundDebounceMs = (0, _inboundDebounce.resolveInboundDebounceMs)({ cfg, channel: "imessage" });
  const inboundDebouncer = (0, _inboundDebounce.createInboundDebouncer)({
    debounceMs: inboundDebounceMs,
    buildKey: (entry) => {
      const sender = entry.message.sender?.trim();
      if (!sender) {
        return null;
      }
      const conversationId = entry.message.chat_id != null ?
      `chat:${entry.message.chat_id}` :
      entry.message.chat_guid ?? entry.message.chat_identifier ?? "unknown";
      return `imessage:${accountInfo.accountId}:${conversationId}:${sender}`;
    },
    shouldDebounce: (entry) => {
      const text = entry.message.text?.trim() ?? "";
      if (!text) {
        return false;
      }
      if (entry.message.attachments && entry.message.attachments.length > 0) {
        return false;
      }
      return !(0, _commandDetection.hasControlCommand)(text, cfg);
    },
    onFlush: async (entries) => {
      const last = entries.at(-1);
      if (!last) {
        return;
      }
      if (entries.length === 1) {
        await handleMessageNow(last.message);
        return;
      }
      const combinedText = entries.
      map((entry) => entry.message.text ?? "").
      filter(Boolean).
      join("\n");
      const syntheticMessage = {
        ...last.message,
        text: combinedText,
        attachments: null
      };
      await handleMessageNow(syntheticMessage);
    },
    onError: (err) => {
      runtime.error?.(`imessage debounce flush failed: ${String(err)}`);
    }
  });
  async function handleMessageNow(message) {
    const senderRaw = message.sender ?? "";
    const sender = senderRaw.trim();
    if (!sender) {
      return;
    }
    const senderNormalized = (0, _targets.normalizeIMessageHandle)(sender);
    if (message.is_from_me) {
      return;
    }
    const chatId = message.chat_id ?? undefined;
    const chatGuid = message.chat_guid ?? undefined;
    const chatIdentifier = message.chat_identifier ?? undefined;
    const groupIdCandidate = chatId !== undefined ? String(chatId) : undefined;
    const groupListPolicy = groupIdCandidate ?
    (0, _groupPolicy.resolveChannelGroupPolicy)({
      cfg,
      channel: "imessage",
      accountId: accountInfo.accountId,
      groupId: groupIdCandidate
    }) :
    {
      allowlistEnabled: false,
      allowed: true,
      groupConfig: undefined,
      defaultConfig: undefined
    };
    // Some iMessage threads can have multiple participants but still report
    // is_group=false depending on how Messages stores the identifier.
    // If the owner explicitly configures a chat_id under imessage.groups, treat
    // that thread as a "group" for permission gating and session isolation.
    const treatAsGroupByConfig = Boolean(groupIdCandidate && groupListPolicy.allowlistEnabled && groupListPolicy.groupConfig);
    const isGroup = Boolean(message.is_group) || treatAsGroupByConfig;
    if (isGroup && !chatId) {
      return;
    }
    const groupId = isGroup ? groupIdCandidate : undefined;
    const storeAllowFrom = await (0, _pairingStore.readChannelAllowFromStore)("imessage").catch(() => []);
    const effectiveDmAllowFrom = Array.from(new Set([...allowFrom, ...storeAllowFrom])).
    map((v) => String(v).trim()).
    filter(Boolean);
    const effectiveGroupAllowFrom = Array.from(new Set([...groupAllowFrom, ...storeAllowFrom])).
    map((v) => String(v).trim()).
    filter(Boolean);
    if (isGroup) {
      if (groupPolicy === "disabled") {
        (0, _globals.logVerbose)("Blocked iMessage group message (groupPolicy: disabled)");
        return;
      }
      if (groupPolicy === "allowlist") {
        if (effectiveGroupAllowFrom.length === 0) {
          (0, _globals.logVerbose)("Blocked iMessage group message (groupPolicy: allowlist, no groupAllowFrom)");
          return;
        }
        const allowed = (0, _targets.isAllowedIMessageSender)({
          allowFrom: effectiveGroupAllowFrom,
          sender,
          chatId: chatId ?? undefined,
          chatGuid,
          chatIdentifier
        });
        if (!allowed) {
          (0, _globals.logVerbose)(`Blocked iMessage sender ${sender} (not in groupAllowFrom)`);
          return;
        }
      }
      if (groupListPolicy.allowlistEnabled && !groupListPolicy.allowed) {
        (0, _globals.logVerbose)(`imessage: skipping group message (${groupId ?? "unknown"}) not in allowlist`);
        return;
      }
    }
    const dmHasWildcard = effectiveDmAllowFrom.includes("*");
    const dmAuthorized = dmPolicy === "open" ?
    true :
    dmHasWildcard ||
    effectiveDmAllowFrom.length > 0 &&
    (0, _targets.isAllowedIMessageSender)({
      allowFrom: effectiveDmAllowFrom,
      sender,
      chatId: chatId ?? undefined,
      chatGuid,
      chatIdentifier
    });
    if (!isGroup) {
      if (dmPolicy === "disabled") {
        return;
      }
      if (!dmAuthorized) {
        if (dmPolicy === "pairing") {
          const senderId = (0, _targets.normalizeIMessageHandle)(sender);
          const { code, created } = await (0, _pairingStore.upsertChannelPairingRequest)({
            channel: "imessage",
            id: senderId,
            meta: {
              sender: senderId,
              chatId: chatId ? String(chatId) : undefined
            }
          });
          if (created) {
            (0, _globals.logVerbose)(`imessage pairing request sender=${senderId}`);
            try {
              await (0, _send.sendMessageIMessage)(sender, (0, _pairingMessages.buildPairingReply)({
                channel: "imessage",
                idLine: `Your iMessage sender id: ${senderId}`,
                code
              }), {
                client,
                maxBytes: mediaMaxBytes,
                accountId: accountInfo.accountId,
                ...(chatId ? { chatId } : {})
              });
            }
            catch (err) {
              (0, _globals.logVerbose)(`imessage pairing reply failed for ${senderId}: ${String(err)}`);
            }
          }
        } else
        {
          (0, _globals.logVerbose)(`Blocked iMessage sender ${sender} (dmPolicy=${dmPolicy})`);
        }
        return;
      }
    }
    const route = (0, _resolveRoute.resolveAgentRoute)({
      cfg,
      channel: "imessage",
      accountId: accountInfo.accountId,
      peer: {
        kind: isGroup ? "group" : "dm",
        id: isGroup ? String(chatId ?? "unknown") : (0, _targets.normalizeIMessageHandle)(sender)
      }
    });
    const mentionRegexes = (0, _mentions.buildMentionRegexes)(cfg, route.agentId);
    const messageText = (message.text ?? "").trim();
    const attachments = includeAttachments ? message.attachments ?? [] : [];
    // Filter to valid attachments with paths
    const validAttachments = attachments.filter((entry) => entry?.original_path && !entry?.missing);
    const firstAttachment = validAttachments[0];
    const mediaPath = firstAttachment?.original_path ?? undefined;
    const mediaType = firstAttachment?.mime_type ?? undefined;
    // Build arrays for all attachments (for multi-image support)
    const mediaPaths = validAttachments.map((a) => a.original_path).filter(Boolean);
    const mediaTypes = validAttachments.map((a) => a.mime_type ?? undefined);
    const kind = (0, _constants.mediaKindFromMime)(mediaType ?? undefined);
    const placeholder = kind ? `<media:${kind}>` : attachments?.length ? "<media:attachment>" : "";
    const bodyText = messageText || placeholder;
    if (!bodyText) {
      return;
    }
    const replyContext = describeReplyContext(message);
    const createdAt = message.created_at ? Date.parse(message.created_at) : undefined;
    const historyKey = isGroup ?
    String(chatId ?? chatGuid ?? chatIdentifier ?? "unknown") :
    undefined;
    const mentioned = isGroup ? (0, _mentions.matchesMentionPatterns)(messageText, mentionRegexes) : true;
    const requireMention = (0, _groupPolicy.resolveChannelGroupRequireMention)({
      cfg,
      channel: "imessage",
      accountId: accountInfo.accountId,
      groupId,
      requireMentionOverride: opts.requireMention,
      overrideOrder: "before-config"
    });
    const canDetectMention = mentionRegexes.length > 0;
    const useAccessGroups = cfg.commands?.useAccessGroups !== false;
    const ownerAllowedForCommands = effectiveDmAllowFrom.length > 0 ?
    (0, _targets.isAllowedIMessageSender)({
      allowFrom: effectiveDmAllowFrom,
      sender,
      chatId: chatId ?? undefined,
      chatGuid,
      chatIdentifier
    }) :
    false;
    const groupAllowedForCommands = effectiveGroupAllowFrom.length > 0 ?
    (0, _targets.isAllowedIMessageSender)({
      allowFrom: effectiveGroupAllowFrom,
      sender,
      chatId: chatId ?? undefined,
      chatGuid,
      chatIdentifier
    }) :
    false;
    const hasControlCommandInMessage = (0, _commandDetection.hasControlCommand)(messageText, cfg);
    const commandGate = (0, _commandGating.resolveControlCommandGate)({
      useAccessGroups,
      authorizers: [
      { configured: effectiveDmAllowFrom.length > 0, allowed: ownerAllowedForCommands },
      { configured: effectiveGroupAllowFrom.length > 0, allowed: groupAllowedForCommands }],

      allowTextCommands: true,
      hasControlCommand: hasControlCommandInMessage
    });
    const commandAuthorized = isGroup ? commandGate.commandAuthorized : dmAuthorized;
    if (isGroup && commandGate.shouldBlock) {
      (0, _logging.logInboundDrop)({
        log: _globals.logVerbose,
        channel: "imessage",
        reason: "control command (unauthorized)",
        target: sender
      });
      return;
    }
    const shouldBypassMention = isGroup && requireMention && !mentioned && commandAuthorized && hasControlCommandInMessage;
    const effectiveWasMentioned = mentioned || shouldBypassMention;
    if (isGroup && requireMention && canDetectMention && !mentioned && !shouldBypassMention) {
      (0, _globals.logVerbose)(`imessage: skipping group message (no mention)`);
      (0, _history.recordPendingHistoryEntryIfEnabled)({
        historyMap: groupHistories,
        historyKey: historyKey ?? "",
        limit: historyLimit,
        entry: historyKey ?
        {
          sender: senderNormalized,
          body: bodyText,
          timestamp: createdAt,
          messageId: message.id ? String(message.id) : undefined
        } :
        null
      });
      return;
    }
    const chatTarget = (0, _targets.formatIMessageChatTarget)(chatId);
    const fromLabel = (0, _envelope.formatInboundFromLabel)({
      isGroup,
      groupLabel: message.chat_name ?? undefined,
      groupId: chatId !== undefined ? String(chatId) : "unknown",
      groupFallback: "Group",
      directLabel: senderNormalized,
      directId: sender
    });
    const storePath = (0, _sessions.resolveStorePath)(cfg.session?.store, {
      agentId: route.agentId
    });
    const envelopeOptions = (0, _envelope.resolveEnvelopeFormatOptions)(cfg);
    const previousTimestamp = (0, _sessions.readSessionUpdatedAt)({
      storePath,
      sessionKey: route.sessionKey
    });
    const replySuffix = replyContext ?
    `\n\n[Replying to ${replyContext.sender ?? "unknown sender"}${replyContext.id ? ` id:${replyContext.id}` : ""}]\n${replyContext.body}\n[/Replying]` :
    "";
    const body = (0, _envelope.formatInboundEnvelope)({
      channel: "iMessage",
      from: fromLabel,
      timestamp: createdAt,
      body: `${bodyText}${replySuffix}`,
      chatType: isGroup ? "group" : "direct",
      sender: { name: senderNormalized, id: sender },
      previousTimestamp,
      envelope: envelopeOptions
    });
    let combinedBody = body;
    if (isGroup && historyKey) {
      combinedBody = (0, _history.buildPendingHistoryContextFromMap)({
        historyMap: groupHistories,
        historyKey,
        limit: historyLimit,
        currentMessage: combinedBody,
        formatEntry: (entry) => (0, _envelope.formatInboundEnvelope)({
          channel: "iMessage",
          from: fromLabel,
          timestamp: entry.timestamp,
          body: `${entry.body}${entry.messageId ? ` [id:${entry.messageId}]` : ""}`,
          chatType: "group",
          senderLabel: entry.sender,
          envelope: envelopeOptions
        })
      });
    }
    const imessageTo = (isGroup ? chatTarget : undefined) || `imessage:${sender}`;
    const ctxPayload = (0, _inboundContext.finalizeInboundContext)({
      Body: combinedBody,
      RawBody: bodyText,
      CommandBody: bodyText,
      From: isGroup ? `imessage:group:${chatId ?? "unknown"}` : `imessage:${sender}`,
      To: imessageTo,
      SessionKey: route.sessionKey,
      AccountId: route.accountId,
      ChatType: isGroup ? "group" : "direct",
      ConversationLabel: fromLabel,
      GroupSubject: isGroup ? message.chat_name ?? undefined : undefined,
      GroupMembers: isGroup ? (message.participants ?? []).filter(Boolean).join(", ") : undefined,
      SenderName: senderNormalized,
      SenderId: sender,
      Provider: "imessage",
      Surface: "imessage",
      MessageSid: message.id ? String(message.id) : undefined,
      ReplyToId: replyContext?.id,
      ReplyToBody: replyContext?.body,
      ReplyToSender: replyContext?.sender,
      Timestamp: createdAt,
      MediaPath: mediaPath,
      MediaType: mediaType,
      MediaUrl: mediaPath,
      MediaPaths: mediaPaths.length > 0 ? mediaPaths : undefined,
      MediaTypes: mediaTypes.length > 0 ? mediaTypes : undefined,
      MediaUrls: mediaPaths.length > 0 ? mediaPaths : undefined,
      MediaRemoteHost: remoteHost,
      WasMentioned: effectiveWasMentioned,
      CommandAuthorized: commandAuthorized,
      // Originating channel for reply routing.
      OriginatingChannel: "imessage",
      OriginatingTo: imessageTo
    });
    const updateTarget = (isGroup ? chatTarget : undefined) || sender;
    await (0, _session.recordInboundSession)({
      storePath,
      sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
      ctx: ctxPayload,
      updateLastRoute: !isGroup && updateTarget ?
      {
        sessionKey: route.mainSessionKey,
        channel: "imessage",
        to: updateTarget,
        accountId: route.accountId
      } :
      undefined,
      onRecordError: (err) => {
        (0, _globals.logVerbose)(`imessage: failed updating session meta: ${String(err)}`);
      }
    });
    if ((0, _globals.shouldLogVerbose)()) {
      const preview = (0, _utils.truncateUtf16Safe)(body, 200).replace(/\n/g, "\\n");
      (0, _globals.logVerbose)(`imessage inbound: chatId=${chatId ?? "unknown"} from=${ctxPayload.From} len=${body.length} preview="${preview}"`);
    }
    const prefixContext = (0, _replyPrefix.createReplyPrefixContext)({ cfg, agentId: route.agentId });
    const dispatcher = (0, _replyDispatcher.createReplyDispatcher)({
      responsePrefix: prefixContext.responsePrefix,
      responsePrefixContextProvider: prefixContext.responsePrefixContextProvider,
      humanDelay: (0, _identity.resolveHumanDelayConfig)(cfg, route.agentId),
      deliver: async (payload) => {
        await (0, _deliver.deliverReplies)({
          replies: [payload],
          target: ctxPayload.To,
          client,
          accountId: accountInfo.accountId,
          runtime,
          maxBytes: mediaMaxBytes,
          textLimit
        });
      },
      onError: (err, info) => {
        runtime.error?.((0, _globals.danger)(`imessage ${info.kind} reply failed: ${String(err)}`));
      }
    });
    const { queuedFinal } = await (0, _dispatch.dispatchInboundMessage)({
      ctx: ctxPayload,
      cfg,
      dispatcher,
      replyOptions: {
        disableBlockStreaming: typeof accountInfo.config.blockStreaming === "boolean" ?
        !accountInfo.config.blockStreaming :
        undefined,
        onModelSelected: prefixContext.onModelSelected
      }
    });
    if (!queuedFinal) {
      if (isGroup && historyKey) {
        (0, _history.clearHistoryEntriesIfEnabled)({
          historyMap: groupHistories,
          historyKey,
          limit: historyLimit
        });
      }
      return;
    }
    if (isGroup && historyKey) {
      (0, _history.clearHistoryEntriesIfEnabled)({ historyMap: groupHistories, historyKey, limit: historyLimit });
    }
  }
  const handleMessage = async (raw) => {
    const params = raw;
    const message = params?.message ?? null;
    if (!message) {
      return;
    }
    await inboundDebouncer.enqueue({ message });
  };
  await (0, _transportReady.waitForTransportReady)({
    label: "imsg rpc",
    timeoutMs: 30_000,
    logAfterMs: 10_000,
    logIntervalMs: 10_000,
    pollIntervalMs: 500,
    abortSignal: opts.abortSignal,
    runtime,
    check: async () => {
      const probe = await (0, _probe.probeIMessage)(2000, { cliPath, dbPath, runtime });
      if (probe.ok) {
        return { ok: true };
      }
      if (probe.fatal) {
        throw new Error(probe.error ?? "imsg rpc unavailable");
      }
      return { ok: false, error: probe.error ?? "unreachable" };
    }
  });
  if (opts.abortSignal?.aborted) {
    return;
  }
  const client = await (0, _client.createIMessageRpcClient)({
    cliPath,
    dbPath,
    runtime,
    onNotification: (msg) => {
      if (msg.method === "message") {
        void handleMessage(msg.params).catch((err) => {
          runtime.error?.(`imessage: handler failed: ${String(err)}`);
        });
      } else
      if (msg.method === "error") {
        runtime.error?.(`imessage: watch error ${JSON.stringify(msg.params)}`);
      }
    }
  });
  let subscriptionId = null;
  const abort = opts.abortSignal;
  const onAbort = () => {
    if (subscriptionId) {
      void client.
      request("watch.unsubscribe", {
        subscription: subscriptionId
      }).
      catch(() => {

        // Ignore disconnect errors during shutdown.
      });}
    void client.stop().catch(() => {

      // Ignore disconnect errors during shutdown.
    });};
  abort?.addEventListener("abort", onAbort, { once: true });
  try {
    const result = await client.request("watch.subscribe", {
      attachments: includeAttachments
    });
    subscriptionId = result?.subscription ?? null;
    await client.waitForClose();
  }
  catch (err) {
    if (abort?.aborted) {
      return;
    }
    runtime.error?.((0, _globals.danger)(`imessage: monitor failed: ${String(err)}`));
    throw err;
  } finally
  {
    abort?.removeEventListener("abort", onAbort);
    await client.stop();
  }
} /* v9-1c73489e69ac8f6b */
