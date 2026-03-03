"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.SessionLabelString = exports.NonEmptyString = exports.GatewayClientModeSchema = exports.GatewayClientIdSchema = void 0;var _typebox = require("@sinclair/typebox");
var _sessionLabel = require("../../../sessions/session-label.js");
var _clientInfo = require("../client-info.js");
const NonEmptyString = exports.NonEmptyString = _typebox.Type.String({ minLength: 1 });
const SessionLabelString = exports.SessionLabelString = _typebox.Type.String({
  minLength: 1,
  maxLength: _sessionLabel.SESSION_LABEL_MAX_LENGTH
});
const GatewayClientIdSchema = exports.GatewayClientIdSchema = _typebox.Type.Union(Object.values(_clientInfo.GATEWAY_CLIENT_IDS).map((value) => _typebox.Type.Literal(value)));
const GatewayClientModeSchema = exports.GatewayClientModeSchema = _typebox.Type.Union(Object.values(_clientInfo.GATEWAY_CLIENT_MODES).map((value) => _typebox.Type.Literal(value))); /* v9-bc045fbc381d0a18 */
