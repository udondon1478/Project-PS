"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.monitorDiscordProvider = monitorDiscordProvider;var _carbon = require("@buape/carbon");
var _gateway = require("@buape/carbon/gateway");
var _v = require("discord-api-types/v10");
var _nodeUtil = require("node:util");
var _chunk = require("../../auto-reply/chunk.js");
var _commandsRegistry = require("../../auto-reply/commands-registry.js");
var _skillCommands = require("../../auto-reply/skill-commands.js");
var _resolveUtils = require("../../channels/allowlists/resolve-utils.js");
var _commands = require("../../config/commands.js");
var _config = require("../../config/config.js");
var _globals = require("../../globals.js");
var _errors = require("../../infra/errors.js");
var _retryPolicy = require("../../infra/retry-policy.js");
var _subsystem = require("../../logging/subsystem.js");
var _accounts = require("../accounts.js");
var _gatewayLogging = require("../gateway-logging.js");
var _monitorGateway = require("../monitor.gateway.js");
var _probe = require("../probe.js");
var _resolveChannels = require("../resolve-channels.js");
var _resolveUsers = require("../resolve-users.js");
var _token = require("../token.js");
var _execApprovals = require("./exec-approvals.js");
var _listeners = require("./listeners.js");
var _messageHandler = require("./message-handler.js");
var _nativeCommand = require("./native-command.js");
function summarizeAllowList(list) {
  if (!list || list.length === 0) {
    return "any";
  }
  const sample = list.slice(0, 4).map((entry) => String(entry));
  const suffix = list.length > sample.length ? ` (+${list.length - sample.length})` : "";
  return `${sample.join(", ")}${suffix}`;
}
function summarizeGuilds(entries) {
  if (!entries || Object.keys(entries).length === 0) {
    return "any";
  }
  const keys = Object.keys(entries);
  const sample = keys.slice(0, 4);
  const suffix = keys.length > sample.length ? ` (+${keys.length - sample.length})` : "";
  return `${sample.join(", ")}${suffix}`;
}
async function deployDiscordCommands(params) {
  if (!params.enabled) {
    return;
  }
  const runWithRetry = (0, _retryPolicy.createDiscordRetryRunner)({ verbose: (0, _globals.shouldLogVerbose)() });
  try {
    await runWithRetry(() => params.client.handleDeployRequest(), "command deploy");
  }
  catch (err) {
    const details = formatDiscordDeployErrorDetails(err);
    params.runtime.error?.((0, _globals.danger)(`discord: failed to deploy native commands: ${(0, _errors.formatErrorMessage)(err)}${details}`));
  }
}
function formatDiscordDeployErrorDetails(err) {
  if (!err || typeof err !== "object") {
    return "";
  }
  const status = err.status;
  const discordCode = err.discordCode;
  const rawBody = err.rawBody;
  const details = [];
  if (typeof status === "number") {
    details.push(`status=${status}`);
  }
  if (typeof discordCode === "number" || typeof discordCode === "string") {
    details.push(`code=${discordCode}`);
  }
  if (rawBody !== undefined) {
    let bodyText = "";
    try {
      bodyText = JSON.stringify(rawBody);
    }
    catch {
      bodyText =
      typeof rawBody === "string" ? rawBody : (0, _nodeUtil.inspect)(rawBody, { depth: 3, breakLength: 120 });
    }
    if (bodyText) {
      const maxLen = 800;
      const trimmed = bodyText.length > maxLen ? `${bodyText.slice(0, maxLen)}...` : bodyText;
      details.push(`body=${trimmed}`);
    }
  }
  return details.length > 0 ? ` (${details.join(", ")})` : "";
}
function resolveDiscordGatewayIntents(intentsConfig) {
  let intents = _gateway.GatewayIntents.Guilds |
  _gateway.GatewayIntents.GuildMessages |
  _gateway.GatewayIntents.MessageContent |
  _gateway.GatewayIntents.DirectMessages |
  _gateway.GatewayIntents.GuildMessageReactions |
  _gateway.GatewayIntents.DirectMessageReactions;
  if (intentsConfig?.presence) {
    intents |= _gateway.GatewayIntents.GuildPresences;
  }
  if (intentsConfig?.guildMembers) {
    intents |= _gateway.GatewayIntents.GuildMembers;
  }
  return intents;
}
async function monitorDiscordProvider(opts = {}) {
  const cfg = opts.config ?? (0, _config.loadConfig)();
  const account = (0, _accounts.resolveDiscordAccount)({
    cfg,
    accountId: opts.accountId
  });
  const token = (0, _token.normalizeDiscordToken)(opts.token ?? undefined) ?? account.token;
  if (!token) {
    throw new Error(`Discord bot token missing for account "${account.accountId}" (set discord.accounts.${account.accountId}.token or DISCORD_BOT_TOKEN for default).`);
  }
  const runtime = opts.runtime ?? {
    log: console.log,
    error: console.error,
    exit: (code) => {
      throw new Error(`exit ${code}`);
    }
  };
  const discordCfg = account.config;
  const dmConfig = discordCfg.dm;
  let guildEntries = discordCfg.guilds;
  const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
  const groupPolicy = discordCfg.groupPolicy ?? defaultGroupPolicy ?? "open";
  if (discordCfg.groupPolicy === undefined &&
  discordCfg.guilds === undefined &&
  defaultGroupPolicy === undefined &&
  groupPolicy === "open") {
    runtime.log?.((0, _globals.warn)('discord: groupPolicy defaults to "open" when channels.discord is missing; set channels.discord.groupPolicy (or channels.defaults.groupPolicy) or add channels.discord.guilds to restrict access.'));
  }
  let allowFrom = dmConfig?.allowFrom;
  const mediaMaxBytes = (opts.mediaMaxMb ?? discordCfg.mediaMaxMb ?? 8) * 1024 * 1024;
  const textLimit = (0, _chunk.resolveTextChunkLimit)(cfg, "discord", account.accountId, {
    fallbackLimit: 2000
  });
  const historyLimit = Math.max(0, opts.historyLimit ?? discordCfg.historyLimit ?? cfg.messages?.groupChat?.historyLimit ?? 20);
  const replyToMode = opts.replyToMode ?? discordCfg.replyToMode ?? "off";
  const dmEnabled = dmConfig?.enabled ?? true;
  const dmPolicy = dmConfig?.policy ?? "pairing";
  const groupDmEnabled = dmConfig?.groupEnabled ?? false;
  const groupDmChannels = dmConfig?.groupChannels;
  const nativeEnabled = (0, _commands.resolveNativeCommandsEnabled)({
    providerId: "discord",
    providerSetting: discordCfg.commands?.native,
    globalSetting: cfg.commands?.native
  });
  const nativeSkillsEnabled = (0, _commands.resolveNativeSkillsEnabled)({
    providerId: "discord",
    providerSetting: discordCfg.commands?.nativeSkills,
    globalSetting: cfg.commands?.nativeSkills
  });
  const nativeDisabledExplicit = (0, _commands.isNativeCommandsExplicitlyDisabled)({
    providerSetting: discordCfg.commands?.native,
    globalSetting: cfg.commands?.native
  });
  const useAccessGroups = cfg.commands?.useAccessGroups !== false;
  const sessionPrefix = "discord:slash";
  const ephemeralDefault = true;
  if (token) {
    if (guildEntries && Object.keys(guildEntries).length > 0) {
      try {
        const entries = [];
        for (const [guildKey, guildCfg] of Object.entries(guildEntries)) {
          if (guildKey === "*") {
            continue;
          }
          const channels = guildCfg?.channels ?? {};
          const channelKeys = Object.keys(channels).filter((key) => key !== "*");
          if (channelKeys.length === 0) {
            entries.push({ input: guildKey, guildKey });
            continue;
          }
          for (const channelKey of channelKeys) {
            entries.push({
              input: `${guildKey}/${channelKey}`,
              guildKey,
              channelKey
            });
          }
        }
        if (entries.length > 0) {
          const resolved = await (0, _resolveChannels.resolveDiscordChannelAllowlist)({
            token,
            entries: entries.map((entry) => entry.input)
          });
          const nextGuilds = { ...guildEntries };
          const mapping = [];
          const unresolved = [];
          for (const entry of resolved) {
            const source = entries.find((item) => item.input === entry.input);
            if (!source) {
              continue;
            }
            const sourceGuild = guildEntries?.[source.guildKey] ?? {};
            if (!entry.resolved || !entry.guildId) {
              unresolved.push(entry.input);
              continue;
            }
            mapping.push(entry.channelId ?
            `${entry.input}→${entry.guildId}/${entry.channelId}` :
            `${entry.input}→${entry.guildId}`);
            const existing = nextGuilds[entry.guildId] ?? {};
            const mergedChannels = { ...sourceGuild.channels, ...existing.channels };
            const mergedGuild = { ...sourceGuild, ...existing, channels: mergedChannels };
            nextGuilds[entry.guildId] = mergedGuild;
            if (source.channelKey && entry.channelId) {
              const sourceChannel = sourceGuild.channels?.[source.channelKey];
              if (sourceChannel) {
                nextGuilds[entry.guildId] = {
                  ...mergedGuild,
                  channels: {
                    ...mergedChannels,
                    [entry.channelId]: {
                      ...sourceChannel,
                      ...mergedChannels?.[entry.channelId]
                    }
                  }
                };
              }
            }
          }
          guildEntries = nextGuilds;
          (0, _resolveUtils.summarizeMapping)("discord channels", mapping, unresolved, runtime);
        }
      }
      catch (err) {
        runtime.log?.(`discord channel resolve failed; using config entries. ${(0, _errors.formatErrorMessage)(err)}`);
      }
    }
    const allowEntries = allowFrom?.filter((entry) => String(entry).trim() && String(entry).trim() !== "*") ?? [];
    if (allowEntries.length > 0) {
      try {
        const resolvedUsers = await (0, _resolveUsers.resolveDiscordUserAllowlist)({
          token,
          entries: allowEntries.map((entry) => String(entry))
        });
        const mapping = [];
        const unresolved = [];
        const additions = [];
        for (const entry of resolvedUsers) {
          if (entry.resolved && entry.id) {
            mapping.push(`${entry.input}→${entry.id}`);
            additions.push(entry.id);
          } else
          {
            unresolved.push(entry.input);
          }
        }
        allowFrom = (0, _resolveUtils.mergeAllowlist)({ existing: allowFrom, additions });
        (0, _resolveUtils.summarizeMapping)("discord users", mapping, unresolved, runtime);
      }
      catch (err) {
        runtime.log?.(`discord user resolve failed; using config entries. ${(0, _errors.formatErrorMessage)(err)}`);
      }
    }
    if (guildEntries && Object.keys(guildEntries).length > 0) {
      const userEntries = new Set();
      for (const guild of Object.values(guildEntries)) {
        if (!guild || typeof guild !== "object") {
          continue;
        }
        const users = guild.users;
        if (Array.isArray(users)) {
          for (const entry of users) {
            const trimmed = String(entry).trim();
            if (trimmed && trimmed !== "*") {
              userEntries.add(trimmed);
            }
          }
        }
        const channels = guild.channels ?? {};
        for (const channel of Object.values(channels)) {
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
      }
      if (userEntries.size > 0) {
        try {
          const resolvedUsers = await (0, _resolveUsers.resolveDiscordUserAllowlist)({
            token,
            entries: Array.from(userEntries)
          });
          const resolvedMap = new Map(resolvedUsers.map((entry) => [entry.input, entry]));
          const mapping = resolvedUsers.
          filter((entry) => entry.resolved && entry.id).
          map((entry) => `${entry.input}→${entry.id}`);
          const unresolved = resolvedUsers.
          filter((entry) => !entry.resolved).
          map((entry) => entry.input);
          const nextGuilds = { ...guildEntries };
          for (const [guildKey, guildConfig] of Object.entries(guildEntries ?? {})) {
            if (!guildConfig || typeof guildConfig !== "object") {
              continue;
            }
            const nextGuild = { ...guildConfig };
            const users = guildConfig.users;
            if (Array.isArray(users) && users.length > 0) {
              const additions = [];
              for (const entry of users) {
                const trimmed = String(entry).trim();
                const resolved = resolvedMap.get(trimmed);
                if (resolved?.resolved && resolved.id) {
                  additions.push(resolved.id);
                }
              }
              nextGuild.users = (0, _resolveUtils.mergeAllowlist)({ existing: users, additions });
            }
            const channels = guildConfig.channels ?? {};
            if (channels && typeof channels === "object") {
              const nextChannels = { ...channels };
              for (const [channelKey, channelConfig] of Object.entries(channels)) {
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
              nextGuild.channels = nextChannels;
            }
            nextGuilds[guildKey] = nextGuild;
          }
          guildEntries = nextGuilds;
          (0, _resolveUtils.summarizeMapping)("discord channel users", mapping, unresolved, runtime);
        }
        catch (err) {
          runtime.log?.(`discord channel user resolve failed; using config entries. ${(0, _errors.formatErrorMessage)(err)}`);
        }
      }
    }
  }
  if ((0, _globals.shouldLogVerbose)()) {
    (0, _globals.logVerbose)(`discord: config dm=${dmEnabled ? "on" : "off"} dmPolicy=${dmPolicy} allowFrom=${summarizeAllowList(allowFrom)} groupDm=${groupDmEnabled ? "on" : "off"} groupDmChannels=${summarizeAllowList(groupDmChannels)} groupPolicy=${groupPolicy} guilds=${summarizeGuilds(guildEntries)} historyLimit=${historyLimit} mediaMaxMb=${Math.round(mediaMaxBytes / (1024 * 1024))} native=${nativeEnabled ? "on" : "off"} nativeSkills=${nativeSkillsEnabled ? "on" : "off"} accessGroups=${useAccessGroups ? "on" : "off"}`);
  }
  const applicationId = await (0, _probe.fetchDiscordApplicationId)(token, 4000);
  if (!applicationId) {
    throw new Error("Failed to resolve Discord application id");
  }
  const maxDiscordCommands = 100;
  let skillCommands = nativeEnabled && nativeSkillsEnabled ? (0, _skillCommands.listSkillCommandsForAgents)({ cfg }) : [];
  let commandSpecs = nativeEnabled ?
  (0, _commandsRegistry.listNativeCommandSpecsForConfig)(cfg, { skillCommands, provider: "discord" }) :
  [];
  const initialCommandCount = commandSpecs.length;
  if (nativeEnabled && nativeSkillsEnabled && commandSpecs.length > maxDiscordCommands) {
    skillCommands = [];
    commandSpecs = (0, _commandsRegistry.listNativeCommandSpecsForConfig)(cfg, { skillCommands: [], provider: "discord" });
    runtime.log?.((0, _globals.warn)(`discord: ${initialCommandCount} commands exceeds limit; removing per-skill commands and keeping /skill.`));
  }
  if (nativeEnabled && commandSpecs.length > maxDiscordCommands) {
    runtime.log?.((0, _globals.warn)(`discord: ${commandSpecs.length} commands exceeds limit; some commands may fail to deploy.`));
  }
  const commands = commandSpecs.map((spec) => (0, _nativeCommand.createDiscordNativeCommand)({
    command: spec,
    cfg,
    discordConfig: discordCfg,
    accountId: account.accountId,
    sessionPrefix,
    ephemeralDefault
  }));
  // Initialize exec approvals handler if enabled
  const execApprovalsConfig = discordCfg.execApprovals ?? {};
  const execApprovalsHandler = execApprovalsConfig.enabled ?
  new _execApprovals.DiscordExecApprovalHandler({
    token,
    accountId: account.accountId,
    config: execApprovalsConfig,
    cfg,
    runtime
  }) :
  null;
  const components = [
  (0, _nativeCommand.createDiscordCommandArgFallbackButton)({
    cfg,
    discordConfig: discordCfg,
    accountId: account.accountId,
    sessionPrefix
  })];

  if (execApprovalsHandler) {
    components.push((0, _execApprovals.createExecApprovalButton)({ handler: execApprovalsHandler }));
  }
  const client = new _carbon.Client({
    baseUrl: "http://localhost",
    deploySecret: "a",
    clientId: applicationId,
    publicKey: "a",
    token,
    autoDeploy: false
  }, {
    commands,
    listeners: [],
    components
  }, [
  new _gateway.GatewayPlugin({
    reconnect: {
      maxAttempts: Number.POSITIVE_INFINITY
    },
    intents: resolveDiscordGatewayIntents(discordCfg.intents),
    autoInteractions: true
  })]
  );
  await deployDiscordCommands({ client, runtime, enabled: nativeEnabled });
  const logger = (0, _subsystem.createSubsystemLogger)("discord/monitor");
  const guildHistories = new Map();
  let botUserId;
  if (nativeDisabledExplicit) {
    await clearDiscordNativeCommands({
      client,
      applicationId,
      runtime
    });
  }
  try {
    const botUser = await client.fetchUser("@me");
    botUserId = botUser?.id;
  }
  catch (err) {
    runtime.error?.((0, _globals.danger)(`discord: failed to fetch bot identity: ${String(err)}`));
  }
  const messageHandler = (0, _messageHandler.createDiscordMessageHandler)({
    cfg,
    discordConfig: discordCfg,
    accountId: account.accountId,
    token,
    runtime,
    botUserId,
    guildHistories,
    historyLimit,
    mediaMaxBytes,
    textLimit,
    replyToMode,
    dmEnabled,
    groupDmEnabled,
    groupDmChannels,
    allowFrom,
    guildEntries
  });
  (0, _listeners.registerDiscordListener)(client.listeners, new _listeners.DiscordMessageListener(messageHandler, logger));
  (0, _listeners.registerDiscordListener)(client.listeners, new _listeners.DiscordReactionListener({
    cfg,
    accountId: account.accountId,
    runtime,
    botUserId,
    guildEntries,
    logger
  }));
  (0, _listeners.registerDiscordListener)(client.listeners, new _listeners.DiscordReactionRemoveListener({
    cfg,
    accountId: account.accountId,
    runtime,
    botUserId,
    guildEntries,
    logger
  }));
  if (discordCfg.intents?.presence) {
    (0, _listeners.registerDiscordListener)(client.listeners, new _listeners.DiscordPresenceListener({ logger, accountId: account.accountId }));
    runtime.log?.("discord: GuildPresences intent enabled — presence listener registered");
  }
  runtime.log?.(`logged in to discord${botUserId ? ` as ${botUserId}` : ""}`);
  // Start exec approvals handler after client is ready
  if (execApprovalsHandler) {
    await execApprovalsHandler.start();
  }
  const gateway = client.getPlugin("gateway");
  const gatewayEmitter = (0, _monitorGateway.getDiscordGatewayEmitter)(gateway);
  const stopGatewayLogging = (0, _gatewayLogging.attachDiscordGatewayLogging)({
    emitter: gatewayEmitter,
    runtime
  });
  const abortSignal = opts.abortSignal;
  const onAbort = () => {
    if (!gateway) {
      return;
    }
    // Carbon emits an error when maxAttempts is 0; keep a one-shot listener to avoid
    // an unhandled error after we tear down listeners during abort.
    gatewayEmitter?.once("error", () => {});
    gateway.options.reconnect = { maxAttempts: 0 };
    gateway.disconnect();
  };
  if (abortSignal?.aborted) {
    onAbort();
  } else
  {
    abortSignal?.addEventListener("abort", onAbort, { once: true });
  }
  // Timeout to detect zombie connections where HELLO is never received.
  const HELLO_TIMEOUT_MS = 30000;
  let helloTimeoutId;
  const onGatewayDebug = (msg) => {
    const message = String(msg);
    if (!message.includes("WebSocket connection opened")) {
      return;
    }
    if (helloTimeoutId) {
      clearTimeout(helloTimeoutId);
    }
    helloTimeoutId = setTimeout(() => {
      if (!gateway?.isConnected) {
        runtime.log?.((0, _globals.danger)(`connection stalled: no HELLO received within ${HELLO_TIMEOUT_MS}ms, forcing reconnect`));
        gateway?.disconnect();
        gateway?.connect(false);
      }
      helloTimeoutId = undefined;
    }, HELLO_TIMEOUT_MS);
  };
  gatewayEmitter?.on("debug", onGatewayDebug);
  try {
    await (0, _monitorGateway.waitForDiscordGatewayStop)({
      gateway: gateway ?
      {
        emitter: gatewayEmitter,
        disconnect: () => gateway.disconnect()
      } :
      undefined,
      abortSignal,
      onGatewayError: (err) => {
        runtime.error?.((0, _globals.danger)(`discord gateway error: ${String(err)}`));
      },
      shouldStopOnError: (err) => {
        const message = String(err);
        return message.includes("Max reconnect attempts") || message.includes("Fatal Gateway error");
      }
    });
  } finally
  {
    stopGatewayLogging();
    if (helloTimeoutId) {
      clearTimeout(helloTimeoutId);
    }
    gatewayEmitter?.removeListener("debug", onGatewayDebug);
    abortSignal?.removeEventListener("abort", onAbort);
    if (execApprovalsHandler) {
      await execApprovalsHandler.stop();
    }
  }
}
async function clearDiscordNativeCommands(params) {
  try {
    await params.client.rest.put(_v.Routes.applicationCommands(params.applicationId), {
      body: []
    });
    (0, _globals.logVerbose)("discord: cleared native commands (commands.native=false)");
  }
  catch (err) {
    params.runtime.error?.((0, _globals.danger)(`discord: failed to clear native commands: ${String(err)}`));
  }
} /* v9-06d3c44a1cd597b6 */
