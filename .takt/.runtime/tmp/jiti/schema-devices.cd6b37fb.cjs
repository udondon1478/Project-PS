"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DeviceTokenRotateParamsSchema = exports.DeviceTokenRevokeParamsSchema = exports.DevicePairResolvedEventSchema = exports.DevicePairRequestedEventSchema = exports.DevicePairRejectParamsSchema = exports.DevicePairListParamsSchema = exports.DevicePairApproveParamsSchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
const DevicePairListParamsSchema = exports.DevicePairListParamsSchema = _typebox.Type.Object({}, { additionalProperties: false });
const DevicePairApproveParamsSchema = exports.DevicePairApproveParamsSchema = _typebox.Type.Object({ requestId: _primitives.NonEmptyString }, { additionalProperties: false });
const DevicePairRejectParamsSchema = exports.DevicePairRejectParamsSchema = _typebox.Type.Object({ requestId: _primitives.NonEmptyString }, { additionalProperties: false });
const DeviceTokenRotateParamsSchema = exports.DeviceTokenRotateParamsSchema = _typebox.Type.Object({
  deviceId: _primitives.NonEmptyString,
  role: _primitives.NonEmptyString,
  scopes: _typebox.Type.Optional(_typebox.Type.Array(_primitives.NonEmptyString))
}, { additionalProperties: false });
const DeviceTokenRevokeParamsSchema = exports.DeviceTokenRevokeParamsSchema = _typebox.Type.Object({
  deviceId: _primitives.NonEmptyString,
  role: _primitives.NonEmptyString
}, { additionalProperties: false });
const DevicePairRequestedEventSchema = exports.DevicePairRequestedEventSchema = _typebox.Type.Object({
  requestId: _primitives.NonEmptyString,
  deviceId: _primitives.NonEmptyString,
  publicKey: _primitives.NonEmptyString,
  displayName: _typebox.Type.Optional(_primitives.NonEmptyString),
  platform: _typebox.Type.Optional(_primitives.NonEmptyString),
  clientId: _typebox.Type.Optional(_primitives.NonEmptyString),
  clientMode: _typebox.Type.Optional(_primitives.NonEmptyString),
  role: _typebox.Type.Optional(_primitives.NonEmptyString),
  roles: _typebox.Type.Optional(_typebox.Type.Array(_primitives.NonEmptyString)),
  scopes: _typebox.Type.Optional(_typebox.Type.Array(_primitives.NonEmptyString)),
  remoteIp: _typebox.Type.Optional(_primitives.NonEmptyString),
  silent: _typebox.Type.Optional(_typebox.Type.Boolean()),
  isRepair: _typebox.Type.Optional(_typebox.Type.Boolean()),
  ts: _typebox.Type.Integer({ minimum: 0 })
}, { additionalProperties: false });
const DevicePairResolvedEventSchema = exports.DevicePairResolvedEventSchema = _typebox.Type.Object({
  requestId: _primitives.NonEmptyString,
  deviceId: _primitives.NonEmptyString,
  decision: _primitives.NonEmptyString,
  ts: _typebox.Type.Integer({ minimum: 0 })
}, { additionalProperties: false }); /* v9-bd57c8b8d21b691b */
