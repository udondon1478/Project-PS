"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.registerSlackChannelEvents = registerSlackChannelEvents;var _configWrites = require("../../../channels/plugins/config-writes.js");
var _config = require("../../../config/config.js");
var _globals = require("../../../globals.js");
var _systemEvents = require("../../../infra/system-events.js");
var _channelMigration = require("../../channel-migration.js");
var _channelConfig = require("../channel-config.js");
function registerSlackChannelEvents(params) {
  const { ctx } = params;
  ctx.app.event("channel_created", async ({ event, body }) => {
    try {
      if (ctx.shouldDropMismatchedSlackEvent(body)) {
        return;
      }
      const payload = event;
      const channelId = payload.channel?.id;
      const channelName = payload.channel?.name;
      if (!ctx.isChannelAllowed({
        channelId,
        channelName,
        channelType: "channel"
      })) {
        return;
      }
      const label = (0, _channelConfig.resolveSlackChannelLabel)({ channelId, channelName });
      const sessionKey = ctx.resolveSlackSystemEventSessionKey({
        channelId,
        channelType: "channel"
      });
      (0, _systemEvents.enqueueSystemEvent)(`Slack channel created: ${label}.`, {
        sessionKey,
        contextKey: `slack:channel:created:${channelId ?? channelName ?? "unknown"}`
      });
    }
    catch (err) {
      ctx.runtime.error?.((0, _globals.danger)(`slack channel created handler failed: ${String(err)}`));
    }
  });
  ctx.app.event("channel_rename", async ({ event, body }) => {
    try {
      if (ctx.shouldDropMismatchedSlackEvent(body)) {
        return;
      }
      const payload = event;
      const channelId = payload.channel?.id;
      const channelName = payload.channel?.name_normalized ?? payload.channel?.name;
      if (!ctx.isChannelAllowed({
        channelId,
        channelName,
        channelType: "channel"
      })) {
        return;
      }
      const label = (0, _channelConfig.resolveSlackChannelLabel)({ channelId, channelName });
      const sessionKey = ctx.resolveSlackSystemEventSessionKey({
        channelId,
        channelType: "channel"
      });
      (0, _systemEvents.enqueueSystemEvent)(`Slack channel renamed: ${label}.`, {
        sessionKey,
        contextKey: `slack:channel:renamed:${channelId ?? channelName ?? "unknown"}`
      });
    }
    catch (err) {
      ctx.runtime.error?.((0, _globals.danger)(`slack channel rename handler failed: ${String(err)}`));
    }
  });
  ctx.app.event("channel_id_changed", async ({ event, body }) => {
    try {
      if (ctx.shouldDropMismatchedSlackEvent(body)) {
        return;
      }
      const payload = event;
      const oldChannelId = payload.old_channel_id;
      const newChannelId = payload.new_channel_id;
      if (!oldChannelId || !newChannelId) {
        return;
      }
      const channelInfo = await ctx.resolveChannelName(newChannelId);
      const label = (0, _channelConfig.resolveSlackChannelLabel)({
        channelId: newChannelId,
        channelName: channelInfo?.name
      });
      ctx.runtime.log?.((0, _globals.warn)(`[slack] Channel ID changed: ${oldChannelId} → ${newChannelId} (${label})`));
      if (!(0, _configWrites.resolveChannelConfigWrites)({
        cfg: ctx.cfg,
        channelId: "slack",
        accountId: ctx.accountId
      })) {
        ctx.runtime.log?.((0, _globals.warn)("[slack] Config writes disabled; skipping channel config migration."));
        return;
      }
      const currentConfig = (0, _config.loadConfig)();
      const migration = (0, _channelMigration.migrateSlackChannelConfig)({
        cfg: currentConfig,
        accountId: ctx.accountId,
        oldChannelId,
        newChannelId
      });
      if (migration.migrated) {
        (0, _channelMigration.migrateSlackChannelConfig)({
          cfg: ctx.cfg,
          accountId: ctx.accountId,
          oldChannelId,
          newChannelId
        });
        await (0, _config.writeConfigFile)(currentConfig);
        ctx.runtime.log?.((0, _globals.warn)("[slack] Channel config migrated and saved successfully."));
      } else
      if (migration.skippedExisting) {
        ctx.runtime.log?.((0, _globals.warn)(`[slack] Channel config already exists for ${newChannelId}; leaving ${oldChannelId} unchanged`));
      } else
      {
        ctx.runtime.log?.((0, _globals.warn)(`[slack] No config found for old channel ID ${oldChannelId}; migration logged only`));
      }
    }
    catch (err) {
      ctx.runtime.error?.((0, _globals.danger)(`slack channel_id_changed handler failed: ${String(err)}`));
    }
  });
} /* v9-b191872d44a109de */
