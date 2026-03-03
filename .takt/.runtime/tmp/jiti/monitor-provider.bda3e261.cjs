"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.monitorSlackProvider = monitorSlackProvider;var _bolt = _interopRequireDefault(require("@slack/bolt"));
var _chunk = require("../../auto-reply/chunk.js");
var _history = require("../../auto-reply/reply/history.js");
var _resolveUtils = require("../../channels/allowlists/resolve-utils.js");
var _config = require("../../config/config.js");
var _globals = require("../../globals.js");
var _sessionKey = require("../../routing/session-key.js");
var _accounts = require("../accounts.js");
var _client = require("../client.js");
var _index = require("../http/index.js");
var _resolveChannels = require("../resolve-channels.js");
var _resolveUsers = require("../resolve-users.js");
var _token = require("../token.js");
var _allowList = require("./allow-list.js");
var _commands = require("./commands.js");
var _context = require("./context.js");
var _events = require("./events.js");
var _messageHandler = require("./message-handler.js");
var _slash = require("./slash.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const slackBoltModule = _bolt.default;
// Bun allows named imports from CJS; Node ESM doesn't. Use default+fallback for compatibility.
// Fix: Check if module has App property directly (Node 25.x ESM/CJS compat issue)
const slackBolt = (slackBoltModule.App ? slackBoltModule : slackBoltModule.default) ?? slackBoltModule;
const { App, HTTPReceiver } = slackBolt;
function parseApiAppIdFromAppToken(raw) {
  const token = raw?.trim();
  if (!token) {
    return undefined;
  }
  const match = /^xapp-\d-([a-z0-9]+)-/i.exec(token);
  return match?.[1]?.toUpperCase();
}
async function monitorSlackProvider(opts = {}) {
  const cfg = opts.config ?? (0, _config.loadConfig)();
  let account = (0, _accounts.resolveSlackAccount)({
    cfg,
    accountId: opts.accountId
  });
  const historyLimit = Math.max(0, account.config.historyLimit ??
  cfg.messages?.groupChat?.historyLimit ??
  _history.DEFAULT_GROUP_HISTORY_LIMIT);
  const sessionCfg = cfg.session;
  const sessionScope = sessionCfg?.scope ?? "per-sender";
  const mainKey = (0, _sessionKey.normalizeMainKey)(sessionCfg?.mainKey);
  const slackMode = opts.mode ?? account.config.mode ?? "socket";
  const slackWebhookPath = (0, _index.normalizeSlackWebhookPath)(account.config.webhookPath);
  const signingSecret = account.config.signingSecret?.trim();
  const botToken = (0, _token.resolveSlackBotToken)(opts.botToken ?? account.botToken);
  const appToken = (0, _token.resolveSlackAppToken)(opts.appToken ?? account.appToken);
  if (!botToken || slackMode !== "http" && !appToken) {
    const missing = slackMode === "http" ?
    `Slack bot token missing for account "${account.accountId}" (set channels.slack.accounts.${account.accountId}.botToken or SLACK_BOT_TOKEN for default).` :
    `Slack bot + app tokens missing for account "${account.accountId}" (set channels.slack.accounts.${account.accountId}.botToken/appToken or SLACK_BOT_TOKEN/SLACK_APP_TOKEN for default).`;
    throw new Error(missing);
  }
  if (slackMode === "http" && !signingSecret) {
    throw new Error(`Slack signing secret missing for account "${account.accountId}" (set channels.slack.signingSecret or channels.slack.accounts.${account.accountId}.signingSecret).`);
  }
  const runtime = opts.runtime ?? {
    log: console.log,
    error: console.error,
    exit: (code) => {
      throw new Error(`exit ${code}`);
    }
  };
  const slackCfg = account.config;
  const dmConfig = slackCfg.dm;
  const dmEnabled = dmConfig?.enabled ?? true;
  const dmPolicy = dmConfig?.policy ?? "pairing";
  let allowFrom = dmConfig?.allowFrom;
  const groupDmEnabled = dmConfig?.groupEnabled ?? false;
  const groupDmChannels = dmConfig?.groupChannels;
  let channelsConfig = slackCfg.channels;
  const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
  const groupPolicy = slackCfg.groupPolicy ?? defaultGroupPolicy ?? "open";
  if (slackCfg.groupPolicy === undefined &&
  slackCfg.channels === undefined &&
  defaultGroupPolicy === undefined &&
  groupPolicy === "open") {
    runtime.log?.((0, _globals.warn)('slack: groupPolicy defaults to "open" when channels.slack is missing; set channels.slack.groupPolicy (or channels.defaults.groupPolicy) or add channels.slack.channels to restrict access.'));
  }
  const resolveToken = slackCfg.userToken?.trim() || botToken;
  const useAccessGroups = cfg.commands?.useAccessGroups !== false;
  const reactionMode = slackCfg.reactionNotifications ?? "own";
  const reactionAllowlist = slackCfg.reactionAllowlist ?? [];
  const replyToMode = slackCfg.replyToMode ?? "off";
  const threadHistoryScope = slackCfg.thread?.historyScope ?? "thread";
  const threadInheritParent = slackCfg.thread?.inheritParent ?? false;
  const slashCommand = (0, _commands.resolveSlackSlashCommandConfig)(opts.slashCommand ?? slackCfg.slashCommand);
  const textLimit = (0, _chunk.resolveTextChunkLimit)(cfg, "slack", account.accountId);
  const ackReactionScope = cfg.messages?.ackReactionScope ?? "group-mentions";
  const mediaMaxBytes = (opts.mediaMaxMb ?? slackCfg.mediaMaxMb ?? 20) * 1024 * 1024;
  const removeAckAfterReply = cfg.messages?.removeAckAfterReply ?? false;
  const receiver = slackMode === "http" ?
  new HTTPReceiver({
    signingSecret: signingSecret ?? "",
    endpoints: slackWebhookPath
  }) :
  null;
  const clientOptions = (0, _client.resolveSlackWebClientOptions)();
  const app = new App(slackMode === "socket" ?
  {
    token: botToken,
    appToken,
    socketMode: true,
    clientOptions
  } :
  {
    token: botToken,
    receiver: receiver ?? undefined,
    clientOptions
  });
  const slackHttpHandler = slackMode === "http" && receiver ?
  async (req, res) => {
    await Promise.resolve(receiver.requestListener(req, res));
  } :
  null;
  let unregisterHttpHandler = null;
  let botUserId = "";
  let teamId = "";
  let apiAppId = "";
  const expectedApiAppIdFromAppToken = parseApiAppIdFromAppToken(appToken);
  try {
    const auth = await app.client.auth.test({ token: botToken });
    botUserId = auth.user_id ?? "";
    teamId = auth.team_id ?? "";
    apiAppId = auth.api_app_id ?? "";
  }
  catch {

    // auth test failing is non-fatal; message handler falls back to regex mentions.
  }if (apiAppId && expectedApiAppIdFromAppToken && apiAppId !== expectedApiAppIdFromAppToken) {
    runtime.error?.(`slack token mismatch: bot token api_app_id=${apiAppId} but app token looks like api_app_id=${expectedApiAppIdFromAppToken}`);
  }
  const ctx = (0, _context.createSlackMonitorContext)({
    cfg,
    accountId: account.accountId,
    botToken,
    app,
    runtime,
    botUserId,
    teamId,
    apiAppId,
    historyLimit,
    sessionScope,
    mainKey,
    dmEnabled,
    dmPolicy,
    allowFrom,
    groupDmEnabled,
    groupDmChannels,
    defaultRequireMention: slackCfg.requireMention,
    channelsConfig,
    groupPolicy,
    useAccessGroups,
    reactionMode,
    reactionAllowlist,
    replyToMode,
    threadHistoryScope,
    threadInheritParent,
    slashCommand,
    textLimit,
    ackReactionScope,
    mediaMaxBytes,
    removeAckAfterReply
  });
  const handleSlackMessage = (0, _messageHandler.createSlackMessageHandler)({ ctx, account });
  (0, _events.registerSlackMonitorEvents)({ ctx, account, handleSlackMessage });
  (0, _slash.registerSlackMonitorSlashCommands)({ ctx, account });
  if (slackMode === "http" && slackHttpHandler) {
    unregisterHttpHandler = (0, _index.registerSlackHttpHandler)({
      path: slackWebhookPath,
      handler: slackHttpHandler,
      log: runtime.log,
      accountId: account.accountId
    });
  }
  if (resolveToken) {
    void (async () => {
      if (opts.abortSignal?.aborted) {
        return;
      }
      if (channelsConfig && Object.keys(channelsConfig).length > 0) {
        try {
          const entries = Object.keys(channelsConfig).filter((key) => key !== "*");
          if (entries.length > 0) {
            const resolved = await (0, _resolveChannels.resolveSlackChannelAllowlist)({
              token: resolveToken,
              entries
            });
            const nextChannels = { ...channelsConfig };
            const mapping = [];
            const unresolved = [];
            for (const entry of resolved) {
              const source = channelsConfig?.[entry.input];
              if (!source) {
                continue;
              }
              if (!entry.resolved || !entry.id) {
                unresolved.push(entry.input);
                continue;
              }
              mapping.push(`${entry.input}→${entry.id}${entry.archived ? " (archived)" : ""}`);
              const existing = nextChannels[entry.id] ?? {};
              nextChannels[entry.id] = { ...source, ...existing };
            }
            channelsConfig = nextChannels;
            ctx.channelsConfig = nextChannels;
            (0, _resolveUtils.summarizeMapping)("slack channels", mapping, unresolved, runtime);
          }
        }
        catch (err) {
          runtime.log?.(`slack channel resolve failed; using config entries. ${String(err)}`);
        }
      }
      const allowEntries = allowFrom?.filter((entry) => String(entry).trim() && String(entry).trim() !== "*") ?? [];
      if (allowEntries.length > 0) {
        try {
          const resolvedUsers = await (0, _resolveUsers.resolveSlackUserAllowlist)({
            token: resolveToken,
            entries: allowEntries.map((entry) => String(entry))
          });
          const mapping = [];
          const unresolved = [];
          const additions = [];
          for (const entry of resolvedUsers) {
            if (entry.resolved && entry.id) {
              const note = entry.note ? ` (${entry.note})` : "";
              mapping.push(`${entry.input}→${entry.id}${note}`);
              additions.push(entry.id);
            } else
            {
              unresolved.push(entry.input);
            }
          }
          allowFrom = (0, _resolveUtils.mergeAllowlist)({ existing: allowFrom, additions });
          ctx.allowFrom = (0, _allowList.normalizeAllowList)(allowFrom);
          (0, _resolveUtils.summarizeMapping)("slack users", mapping, unresolved, runtime);
        }
        catch (err) {
          runtime.log?.(`slack user resolve failed; using config entries. ${String(err)}`);
        }
      }
      if (channelsConfig && Object.keys(channelsConfig).length > 0) {
        const userEntries = new Set();
        for (const channel of Object.values(channelsConfig)) {
          if (!channel || typeof channel !== "object") {
            continue;
          }
          const channelUsers = channel.users;
          if (!Array.isArray(channelUsers)) {
            continue;
          }
          for (const entry of channelUsers) {
            const trimmed = String(entry).trim();
            if (trimmed && trimmed !== "*") {
              userEntries.add(trimmed);
            }
          }
        }
        if (userEntries.size > 0) {
          try {
            const resolvedUsers = await (0, _resolveUsers.resolveSlackUserAllowlist)({
              token: resolveToken,
              entries: Array.from(userEntries)
            });
            const resolvedMap = new Map(resolvedUsers.map((entry) => [entry.input, entry]));
            const mapping = resolvedUsers.
            filter((entry) => entry.resolved && entry.id).
            map((entry) => `${entry.input}→${entry.id}`);
            const unresolved = resolvedUsers.
            filter((entry) => !entry.resolved).
            map((entry) => entry.input);
            const nextChannels = { ...channelsConfig };
            for (const [channelKey, channelConfig] of Object.entries(channelsConfig)) {
              if (!channelConfig || typeof channelConfig !== "object") {
                continue;
              }
              const channelUsers = channelConfig.users;
              if (!Array.isArray(channelUsers) || channelUsers.length === 0) {
                continue;
              }
              const additions = [];
              for (const entry of channelUsers) {
                const trimmed = String(entry).trim();
                const resolved = resolvedMap.get(trimmed);
                if (resolved?.resolved && resolved.id) {
                  additions.push(resolved.id);
                }
              }
              nextChannels[channelKey] = {
                ...channelConfig,
                users: (0, _resolveUtils.mergeAllowlist)({ existing: channelUsers, additions })
              };
            }
            channelsConfig = nextChannels;
            ctx.channelsConfig = nextChannels;
            (0, _resolveUtils.summarizeMapping)("slack channel users", mapping, unresolved, runtime);
          }
          catch (err) {
            runtime.log?.(`slack channel user resolve failed; using config entries. ${String(err)}`);
          }
        }
      }
    })();
  }
  const stopOnAbort = () => {
    if (opts.abortSignal?.aborted && slackMode === "socket") {
      void app.stop();
    }
  };
  opts.abortSignal?.addEventListener("abort", stopOnAbort, { once: true });
  try {
    if (slackMode === "socket") {
      await app.start();
      runtime.log?.("slack socket mode connected");
    } else
    {
      runtime.log?.(`slack http mode listening at ${slackWebhookPath}`);
    }
    if (opts.abortSignal?.aborted) {
      return;
    }
    await new Promise((resolve) => {
      opts.abortSignal?.addEventListener("abort", () => resolve(), {
        once: true
      });
    });
  } finally
  {
    opts.abortSignal?.removeEventListener("abort", stopOnAbort);
    unregisterHttpHandler?.();
    await app.stop().catch(() => undefined);
  }
} /* v9-44f27cc069037d7b */
