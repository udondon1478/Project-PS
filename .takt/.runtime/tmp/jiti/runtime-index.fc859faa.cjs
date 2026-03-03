"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createPluginRuntime = createPluginRuntime;var _nodeModule = require("node:module");
var _identity = require("../../agents/identity.js");
var _memoryTool = require("../../agents/tools/memory-tool.js");
var _slackActions = require("../../agents/tools/slack-actions.js");
var _whatsappActions = require("../../agents/tools/whatsapp-actions.js");
var _chunk = require("../../auto-reply/chunk.js");
var _commandDetection = require("../../auto-reply/command-detection.js");
var _commandsRegistry = require("../../auto-reply/commands-registry.js");
var _envelope = require("../../auto-reply/envelope.js");
var _inboundDebounce = require("../../auto-reply/inbound-debounce.js");
var _dispatchFromConfig = require("../../auto-reply/reply/dispatch-from-config.js");
var _inboundContext = require("../../auto-reply/reply/inbound-context.js");
var _mentions = require("../../auto-reply/reply/mentions.js");
var _providerDispatcher = require("../../auto-reply/reply/provider-dispatcher.js");
var _replyDispatcher = require("../../auto-reply/reply/reply-dispatcher.js");
var _ackReactions = require("../../channels/ack-reactions.js");
var _commandGating = require("../../channels/command-gating.js");
var _discord = require("../../channels/plugins/actions/discord.js");
var _signal = require("../../channels/plugins/actions/signal.js");
var _telegram = require("../../channels/plugins/actions/telegram.js");
var _whatsappLogin = require("../../channels/plugins/agent-tools/whatsapp-login.js");
var _session = require("../../channels/session.js");
var _index = require("../../channels/web/index.js");
var _memoryCli = require("../../cli/memory-cli.js");
var _config = require("../../config/config.js");
var _groupPolicy = require("../../config/group-policy.js");
var _markdownTables = require("../../config/markdown-tables.js");
var _paths = require("../../config/paths.js");
var _sessions = require("../../config/sessions.js");
var _audit = require("../../discord/audit.js");
var _directoryLive = require("../../discord/directory-live.js");
var _monitor = require("../../discord/monitor.js");
var _probe = require("../../discord/probe.js");
var _resolveChannels = require("../../discord/resolve-channels.js");
var _resolveUsers = require("../../discord/resolve-users.js");
var _send = require("../../discord/send.js");
var _globals = require("../../globals.js");
var _monitor2 = require("../../imessage/monitor.js");
var _probe2 = require("../../imessage/probe.js");
var _send2 = require("../../imessage/send.js");
var _channelActivity = require("../../infra/channel-activity.js");
var _systemEvents = require("../../infra/system-events.js");
var _accounts = require("../../line/accounts.js");
var _monitor3 = require("../../line/monitor.js");
var _probe3 = require("../../line/probe.js");
var _send3 = require("../../line/send.js");
var _templateMessages = require("../../line/template-messages.js");
var _logging = require("../../logging.js");
var _levels = require("../../logging/levels.js");
var _tables = require("../../markdown/tables.js");
var _audio = require("../../media/audio.js");
var _constants = require("../../media/constants.js");
var _fetch = require("../../media/fetch.js");
var _imageOps = require("../../media/image-ops.js");
var _mime = require("../../media/mime.js");
var _store = require("../../media/store.js");
var _pairingMessages = require("../../pairing/pairing-messages.js");
var _pairingStore = require("../../pairing/pairing-store.js");
var _exec = require("../../process/exec.js");
var _resolveRoute = require("../../routing/resolve-route.js");
var _index2 = require("../../signal/index.js");
var _probe4 = require("../../signal/probe.js");
var _send4 = require("../../signal/send.js");
var _directoryLive2 = require("../../slack/directory-live.js");
var _index3 = require("../../slack/index.js");
var _probe5 = require("../../slack/probe.js");
var _resolveChannels2 = require("../../slack/resolve-channels.js");
var _resolveUsers2 = require("../../slack/resolve-users.js");
var _send5 = require("../../slack/send.js");
var _audit2 = require("../../telegram/audit.js");
var _monitor4 = require("../../telegram/monitor.js");
var _probe6 = require("../../telegram/probe.js");
var _send6 = require("../../telegram/send.js");
var _token = require("../../telegram/token.js");
var _tts = require("../../tts/tts.js");
var _activeListener = require("../../web/active-listener.js");
var _authStore = require("../../web/auth-store.js");
var _loginQr = require("../../web/login-qr.js");
var _login = require("../../web/login.js");
var _media = require("../../web/media.js");
var _outbound = require("../../web/outbound.js");
var _nativeDeps = require("./native-deps.js");
let cachedVersion = null;
function resolveVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }
  try {
    const require = (0, _nodeModule.createRequire)("file:///Users/x22004xx/.nvm/versions/node/v24.11.1/lib/node_modules/openclaw/dist/plugins/runtime/index.js");
    const pkg = require("../../../package.json");
    cachedVersion = pkg.version ?? "unknown";
    return cachedVersion;
  }
  catch {
    cachedVersion = "unknown";
    return cachedVersion;
  }
}
function createPluginRuntime() {
  return {
    version: resolveVersion(),
    config: {
      loadConfig: _config.loadConfig,
      writeConfigFile: _config.writeConfigFile
    },
    system: {
      enqueueSystemEvent: _systemEvents.enqueueSystemEvent,
      runCommandWithTimeout: _exec.runCommandWithTimeout,
      formatNativeDependencyHint: _nativeDeps.formatNativeDependencyHint
    },
    media: {
      loadWebMedia: _media.loadWebMedia,
      detectMime: _mime.detectMime,
      mediaKindFromMime: _constants.mediaKindFromMime,
      isVoiceCompatibleAudio: _audio.isVoiceCompatibleAudio,
      getImageMetadata: _imageOps.getImageMetadata,
      resizeToJpeg: _imageOps.resizeToJpeg
    },
    tts: {
      textToSpeechTelephony: _tts.textToSpeechTelephony
    },
    tools: {
      createMemoryGetTool: _memoryTool.createMemoryGetTool,
      createMemorySearchTool: _memoryTool.createMemorySearchTool,
      registerMemoryCli: _memoryCli.registerMemoryCli
    },
    channel: {
      text: {
        chunkByNewline: _chunk.chunkByNewline,
        chunkMarkdownText: _chunk.chunkMarkdownText,
        chunkMarkdownTextWithMode: _chunk.chunkMarkdownTextWithMode,
        chunkText: _chunk.chunkText,
        chunkTextWithMode: _chunk.chunkTextWithMode,
        resolveChunkMode: _chunk.resolveChunkMode,
        resolveTextChunkLimit: _chunk.resolveTextChunkLimit,
        hasControlCommand: _commandDetection.hasControlCommand,
        resolveMarkdownTableMode: _markdownTables.resolveMarkdownTableMode,
        convertMarkdownTables: _tables.convertMarkdownTables
      },
      reply: {
        dispatchReplyWithBufferedBlockDispatcher: _providerDispatcher.dispatchReplyWithBufferedBlockDispatcher,
        createReplyDispatcherWithTyping: _replyDispatcher.createReplyDispatcherWithTyping,
        resolveEffectiveMessagesConfig: _identity.resolveEffectiveMessagesConfig,
        resolveHumanDelayConfig: _identity.resolveHumanDelayConfig,
        dispatchReplyFromConfig: _dispatchFromConfig.dispatchReplyFromConfig,
        finalizeInboundContext: _inboundContext.finalizeInboundContext,
        formatAgentEnvelope: _envelope.formatAgentEnvelope,
        formatInboundEnvelope: _envelope.formatInboundEnvelope,
        resolveEnvelopeFormatOptions: _envelope.resolveEnvelopeFormatOptions
      },
      routing: {
        resolveAgentRoute: _resolveRoute.resolveAgentRoute
      },
      pairing: {
        buildPairingReply: _pairingMessages.buildPairingReply,
        readAllowFromStore: _pairingStore.readChannelAllowFromStore,
        upsertPairingRequest: _pairingStore.upsertChannelPairingRequest
      },
      media: {
        fetchRemoteMedia: _fetch.fetchRemoteMedia,
        saveMediaBuffer: _store.saveMediaBuffer
      },
      activity: {
        record: _channelActivity.recordChannelActivity,
        get: _channelActivity.getChannelActivity
      },
      session: {
        resolveStorePath: _sessions.resolveStorePath,
        readSessionUpdatedAt: _sessions.readSessionUpdatedAt,
        recordSessionMetaFromInbound: _sessions.recordSessionMetaFromInbound,
        recordInboundSession: _session.recordInboundSession,
        updateLastRoute: _sessions.updateLastRoute
      },
      mentions: {
        buildMentionRegexes: _mentions.buildMentionRegexes,
        matchesMentionPatterns: _mentions.matchesMentionPatterns,
        matchesMentionWithExplicit: _mentions.matchesMentionWithExplicit
      },
      reactions: {
        shouldAckReaction: _ackReactions.shouldAckReaction,
        removeAckReactionAfterReply: _ackReactions.removeAckReactionAfterReply
      },
      groups: {
        resolveGroupPolicy: _groupPolicy.resolveChannelGroupPolicy,
        resolveRequireMention: _groupPolicy.resolveChannelGroupRequireMention
      },
      debounce: {
        createInboundDebouncer: _inboundDebounce.createInboundDebouncer,
        resolveInboundDebounceMs: _inboundDebounce.resolveInboundDebounceMs
      },
      commands: {
        resolveCommandAuthorizedFromAuthorizers: _commandGating.resolveCommandAuthorizedFromAuthorizers,
        isControlCommandMessage: _commandDetection.isControlCommandMessage,
        shouldComputeCommandAuthorized: _commandDetection.shouldComputeCommandAuthorized,
        shouldHandleTextCommands: _commandsRegistry.shouldHandleTextCommands
      },
      discord: {
        messageActions: _discord.discordMessageActions,
        auditChannelPermissions: _audit.auditDiscordChannelPermissions,
        listDirectoryGroupsLive: _directoryLive.listDiscordDirectoryGroupsLive,
        listDirectoryPeersLive: _directoryLive.listDiscordDirectoryPeersLive,
        probeDiscord: _probe.probeDiscord,
        resolveChannelAllowlist: _resolveChannels.resolveDiscordChannelAllowlist,
        resolveUserAllowlist: _resolveUsers.resolveDiscordUserAllowlist,
        sendMessageDiscord: _send.sendMessageDiscord,
        sendPollDiscord: _send.sendPollDiscord,
        monitorDiscordProvider: _monitor.monitorDiscordProvider
      },
      slack: {
        listDirectoryGroupsLive: _directoryLive2.listSlackDirectoryGroupsLive,
        listDirectoryPeersLive: _directoryLive2.listSlackDirectoryPeersLive,
        probeSlack: _probe5.probeSlack,
        resolveChannelAllowlist: _resolveChannels2.resolveSlackChannelAllowlist,
        resolveUserAllowlist: _resolveUsers2.resolveSlackUserAllowlist,
        sendMessageSlack: _send5.sendMessageSlack,
        monitorSlackProvider: _index3.monitorSlackProvider,
        handleSlackAction: _slackActions.handleSlackAction
      },
      telegram: {
        auditGroupMembership: _audit2.auditTelegramGroupMembership,
        collectUnmentionedGroupIds: _audit2.collectTelegramUnmentionedGroupIds,
        probeTelegram: _probe6.probeTelegram,
        resolveTelegramToken: _token.resolveTelegramToken,
        sendMessageTelegram: _send6.sendMessageTelegram,
        monitorTelegramProvider: _monitor4.monitorTelegramProvider,
        messageActions: _telegram.telegramMessageActions
      },
      signal: {
        probeSignal: _probe4.probeSignal,
        sendMessageSignal: _send4.sendMessageSignal,
        monitorSignalProvider: _index2.monitorSignalProvider,
        messageActions: _signal.signalMessageActions
      },
      imessage: {
        monitorIMessageProvider: _monitor2.monitorIMessageProvider,
        probeIMessage: _probe2.probeIMessage,
        sendMessageIMessage: _send2.sendMessageIMessage
      },
      whatsapp: {
        getActiveWebListener: _activeListener.getActiveWebListener,
        getWebAuthAgeMs: _authStore.getWebAuthAgeMs,
        logoutWeb: _authStore.logoutWeb,
        logWebSelfId: _authStore.logWebSelfId,
        readWebSelfId: _authStore.readWebSelfId,
        webAuthExists: _authStore.webAuthExists,
        sendMessageWhatsApp: _outbound.sendMessageWhatsApp,
        sendPollWhatsApp: _outbound.sendPollWhatsApp,
        loginWeb: _login.loginWeb,
        startWebLoginWithQr: _loginQr.startWebLoginWithQr,
        waitForWebLogin: _loginQr.waitForWebLogin,
        monitorWebChannel: _index.monitorWebChannel,
        handleWhatsAppAction: _whatsappActions.handleWhatsAppAction,
        createLoginTool: _whatsappLogin.createWhatsAppLoginTool
      },
      line: {
        listLineAccountIds: _accounts.listLineAccountIds,
        resolveDefaultLineAccountId: _accounts.resolveDefaultLineAccountId,
        resolveLineAccount: _accounts.resolveLineAccount,
        normalizeAccountId: _accounts.normalizeAccountId,
        probeLineBot: _probe3.probeLineBot,
        sendMessageLine: _send3.sendMessageLine,
        pushMessageLine: _send3.pushMessageLine,
        pushMessagesLine: _send3.pushMessagesLine,
        pushFlexMessage: _send3.pushFlexMessage,
        pushTemplateMessage: _send3.pushTemplateMessage,
        pushLocationMessage: _send3.pushLocationMessage,
        pushTextMessageWithQuickReplies: _send3.pushTextMessageWithQuickReplies,
        createQuickReplyItems: _send3.createQuickReplyItems,
        buildTemplateMessageFromPayload: _templateMessages.buildTemplateMessageFromPayload,
        monitorLineProvider: _monitor3.monitorLineProvider
      }
    },
    logging: {
      shouldLogVerbose: _globals.shouldLogVerbose,
      getChildLogger: (bindings, opts) => {
        const logger = (0, _logging.getChildLogger)(bindings, {
          level: opts?.level ? (0, _levels.normalizeLogLevel)(opts.level) : undefined
        });
        return {
          debug: (message) => logger.debug?.(message),
          info: (message) => logger.info(message),
          warn: (message) => logger.warn(message),
          error: (message) => logger.error(message)
        };
      }
    },
    state: {
      resolveStateDir: _paths.resolveStateDir
    }
  };
} /* v9-a2e23b768a5524c0 */
