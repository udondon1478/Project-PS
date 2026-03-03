"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.WebhookEvent = exports.ListenerEvent = exports.GatewayEvent = void 0;var _v = require("discord-api-types/v10");
const WebhookEvent = exports.WebhookEvent = {
  ..._v.ApplicationWebhookEventType
};
const GatewayEvent = exports.GatewayEvent = {
  ..._v.GatewayDispatchEvents
};
const ListenerEvent = exports.ListenerEvent = {
  ...GatewayEvent,
  ...WebhookEvent,
  GuildAvailable: "GUILD_AVAILABLE",
  GuildUnavailable: "GUILD_UNAVAILABLE"
}; /* v9-4192165a16232b81 */
