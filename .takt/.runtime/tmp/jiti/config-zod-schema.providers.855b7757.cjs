"use strict";Object.defineProperty(exports, "__esModule", { value: true });var _exportNames = { ChannelsSchema: true, ChannelHeartbeatVisibilitySchema: true };Object.defineProperty(exports, "ChannelHeartbeatVisibilitySchema", { enumerable: true, get: function () {return _zodSchemaChannels.ChannelHeartbeatVisibilitySchema;} });exports.ChannelsSchema = void 0;var _zod = require("zod");
var _zodSchemaChannels = require("./zod-schema.channels.js");
var _zodSchemaCore = require("./zod-schema.core.js");
var _zodSchemaProvidersCore = require("./zod-schema.providers-core.js");

Object.keys(_zodSchemaProvidersCore).forEach(function (key) {if (key === "default" || key === "__esModule") return;if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;if (key in exports && exports[key] === _zodSchemaProvidersCore[key]) return;Object.defineProperty(exports, key, { enumerable: true, get: function () {return _zodSchemaProvidersCore[key];} });});var _zodSchemaProvidersWhatsapp = require("./zod-schema.providers-whatsapp.js");
Object.keys(_zodSchemaProvidersWhatsapp).forEach(function (key) {if (key === "default" || key === "__esModule") return;if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;if (key in exports && exports[key] === _zodSchemaProvidersWhatsapp[key]) return;Object.defineProperty(exports, key, { enumerable: true, get: function () {return _zodSchemaProvidersWhatsapp[key];} });});

const ChannelsSchema = exports.ChannelsSchema = _zod.z.
object({
  defaults: _zod.z.
  object({
    groupPolicy: _zodSchemaCore.GroupPolicySchema.optional(),
    heartbeat: _zodSchemaChannels.ChannelHeartbeatVisibilitySchema
  }).
  strict().
  optional(),
  whatsapp: _zodSchemaProvidersWhatsapp.WhatsAppConfigSchema.optional(),
  telegram: _zodSchemaProvidersCore.TelegramConfigSchema.optional(),
  discord: _zodSchemaProvidersCore.DiscordConfigSchema.optional(),
  googlechat: _zodSchemaProvidersCore.GoogleChatConfigSchema.optional(),
  slack: _zodSchemaProvidersCore.SlackConfigSchema.optional(),
  signal: _zodSchemaProvidersCore.SignalConfigSchema.optional(),
  imessage: _zodSchemaProvidersCore.IMessageConfigSchema.optional(),
  bluebubbles: _zodSchemaProvidersCore.BlueBubblesConfigSchema.optional(),
  msteams: _zodSchemaProvidersCore.MSTeamsConfigSchema.optional()
}).
passthrough() // Allow extension channel configs (nostr, matrix, zalo, etc.)
.optional(); /* v9-c2c3a0464ff1c3f1 */
