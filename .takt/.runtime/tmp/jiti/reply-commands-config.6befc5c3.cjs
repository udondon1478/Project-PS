"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.handleDebugCommand = exports.handleConfigCommand = void 0;var _configWrites = require("../../channels/plugins/config-writes.js");
var _registry = require("../../channels/registry.js");
var _configPaths = require("../../config/config-paths.js");
var _config = require("../../config/config.js");
var _runtimeOverrides = require("../../config/runtime-overrides.js");
var _globals = require("../../globals.js");
var _configCommands = require("./config-commands.js");
var _debugCommands = require("./debug-commands.js");
const handleConfigCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const configCommand = (0, _configCommands.parseConfigCommand)(params.command.commandBodyNormalized);
  if (!configCommand) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /config from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  if (params.cfg.commands?.config !== true) {
    return {
      shouldContinue: false,
      reply: {
        text: "⚠️ /config is disabled. Set commands.config=true to enable."
      }
    };
  }
  if (configCommand.action === "error") {
    return {
      shouldContinue: false,
      reply: { text: `⚠️ ${configCommand.message}` }
    };
  }
  if (configCommand.action === "set" || configCommand.action === "unset") {
    const channelId = params.command.channelId ?? (0, _registry.normalizeChannelId)(params.command.channel);
    const allowWrites = (0, _configWrites.resolveChannelConfigWrites)({
      cfg: params.cfg,
      channelId,
      accountId: params.ctx.AccountId
    });
    if (!allowWrites) {
      const channelLabel = channelId ?? "this channel";
      const hint = channelId ?
      `channels.${channelId}.configWrites=true` :
      "channels.<channel>.configWrites=true";
      return {
        shouldContinue: false,
        reply: {
          text: `⚠️ Config writes are disabled for ${channelLabel}. Set ${hint} to enable.`
        }
      };
    }
  }
  const snapshot = await (0, _config.readConfigFileSnapshot)();
  if (!snapshot.valid || !snapshot.parsed || typeof snapshot.parsed !== "object") {
    return {
      shouldContinue: false,
      reply: {
        text: "⚠️ Config file is invalid; fix it before using /config."
      }
    };
  }
  const parsedBase = structuredClone(snapshot.parsed);
  if (configCommand.action === "show") {
    const pathRaw = configCommand.path?.trim();
    if (pathRaw) {
      const parsedPath = (0, _configPaths.parseConfigPath)(pathRaw);
      if (!parsedPath.ok || !parsedPath.path) {
        return {
          shouldContinue: false,
          reply: { text: `⚠️ ${parsedPath.error ?? "Invalid path."}` }
        };
      }
      const value = (0, _configPaths.getConfigValueAtPath)(parsedBase, parsedPath.path);
      const rendered = JSON.stringify(value ?? null, null, 2);
      return {
        shouldContinue: false,
        reply: {
          text: `⚙️ Config ${pathRaw}:\n\`\`\`json\n${rendered}\n\`\`\``
        }
      };
    }
    const json = JSON.stringify(parsedBase, null, 2);
    return {
      shouldContinue: false,
      reply: { text: `⚙️ Config (raw):\n\`\`\`json\n${json}\n\`\`\`` }
    };
  }
  if (configCommand.action === "unset") {
    const parsedPath = (0, _configPaths.parseConfigPath)(configCommand.path);
    if (!parsedPath.ok || !parsedPath.path) {
      return {
        shouldContinue: false,
        reply: { text: `⚠️ ${parsedPath.error ?? "Invalid path."}` }
      };
    }
    const removed = (0, _configPaths.unsetConfigValueAtPath)(parsedBase, parsedPath.path);
    if (!removed) {
      return {
        shouldContinue: false,
        reply: { text: `⚙️ No config value found for ${configCommand.path}.` }
      };
    }
    const validated = (0, _config.validateConfigObjectWithPlugins)(parsedBase);
    if (!validated.ok) {
      const issue = validated.issues[0];
      return {
        shouldContinue: false,
        reply: {
          text: `⚠️ Config invalid after unset (${issue.path}: ${issue.message}).`
        }
      };
    }
    await (0, _config.writeConfigFile)(validated.config);
    return {
      shouldContinue: false,
      reply: { text: `⚙️ Config updated: ${configCommand.path} removed.` }
    };
  }
  if (configCommand.action === "set") {
    const parsedPath = (0, _configPaths.parseConfigPath)(configCommand.path);
    if (!parsedPath.ok || !parsedPath.path) {
      return {
        shouldContinue: false,
        reply: { text: `⚠️ ${parsedPath.error ?? "Invalid path."}` }
      };
    }
    (0, _configPaths.setConfigValueAtPath)(parsedBase, parsedPath.path, configCommand.value);
    const validated = (0, _config.validateConfigObjectWithPlugins)(parsedBase);
    if (!validated.ok) {
      const issue = validated.issues[0];
      return {
        shouldContinue: false,
        reply: {
          text: `⚠️ Config invalid after set (${issue.path}: ${issue.message}).`
        }
      };
    }
    await (0, _config.writeConfigFile)(validated.config);
    const valueLabel = typeof configCommand.value === "string" ?
    `"${configCommand.value}"` :
    JSON.stringify(configCommand.value);
    return {
      shouldContinue: false,
      reply: {
        text: `⚙️ Config updated: ${configCommand.path}=${valueLabel ?? "null"}`
      }
    };
  }
  return null;
};exports.handleConfigCommand = handleConfigCommand;
const handleDebugCommand = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }
  const debugCommand = (0, _debugCommands.parseDebugCommand)(params.command.commandBodyNormalized);
  if (!debugCommand) {
    return null;
  }
  if (!params.command.isAuthorizedSender) {
    (0, _globals.logVerbose)(`Ignoring /debug from unauthorized sender: ${params.command.senderId || "<unknown>"}`);
    return { shouldContinue: false };
  }
  if (params.cfg.commands?.debug !== true) {
    return {
      shouldContinue: false,
      reply: {
        text: "⚠️ /debug is disabled. Set commands.debug=true to enable."
      }
    };
  }
  if (debugCommand.action === "error") {
    return {
      shouldContinue: false,
      reply: { text: `⚠️ ${debugCommand.message}` }
    };
  }
  if (debugCommand.action === "show") {
    const overrides = (0, _runtimeOverrides.getConfigOverrides)();
    const hasOverrides = Object.keys(overrides).length > 0;
    if (!hasOverrides) {
      return {
        shouldContinue: false,
        reply: { text: "⚙️ Debug overrides: (none)" }
      };
    }
    const json = JSON.stringify(overrides, null, 2);
    return {
      shouldContinue: false,
      reply: {
        text: `⚙️ Debug overrides (memory-only):\n\`\`\`json\n${json}\n\`\`\``
      }
    };
  }
  if (debugCommand.action === "reset") {
    (0, _runtimeOverrides.resetConfigOverrides)();
    return {
      shouldContinue: false,
      reply: { text: "⚙️ Debug overrides cleared; using config on disk." }
    };
  }
  if (debugCommand.action === "unset") {
    const result = (0, _runtimeOverrides.unsetConfigOverride)(debugCommand.path);
    if (!result.ok) {
      return {
        shouldContinue: false,
        reply: { text: `⚠️ ${result.error ?? "Invalid path."}` }
      };
    }
    if (!result.removed) {
      return {
        shouldContinue: false,
        reply: {
          text: `⚙️ No debug override found for ${debugCommand.path}.`
        }
      };
    }
    return {
      shouldContinue: false,
      reply: { text: `⚙️ Debug override removed for ${debugCommand.path}.` }
    };
  }
  if (debugCommand.action === "set") {
    const result = (0, _runtimeOverrides.setConfigOverride)(debugCommand.path, debugCommand.value);
    if (!result.ok) {
      return {
        shouldContinue: false,
        reply: { text: `⚠️ ${result.error ?? "Invalid override."}` }
      };
    }
    const valueLabel = typeof debugCommand.value === "string" ?
    `"${debugCommand.value}"` :
    JSON.stringify(debugCommand.value);
    return {
      shouldContinue: false,
      reply: {
        text: `⚙️ Debug override set: ${debugCommand.path}=${valueLabel ?? "null"}`
      }
    };
  }
  return null;
};exports.handleDebugCommand = handleDebugCommand; /* v9-b05757a6780fcbaf */
