"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.StateVersionSchema = exports.SnapshotSchema = exports.SessionDefaultsSchema = exports.PresenceEntrySchema = exports.HealthSnapshotSchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
const PresenceEntrySchema = exports.PresenceEntrySchema = _typebox.Type.Object({
  host: _typebox.Type.Optional(_primitives.NonEmptyString),
  ip: _typebox.Type.Optional(_primitives.NonEmptyString),
  version: _typebox.Type.Optional(_primitives.NonEmptyString),
  platform: _typebox.Type.Optional(_primitives.NonEmptyString),
  deviceFamily: _typebox.Type.Optional(_primitives.NonEmptyString),
  modelIdentifier: _typebox.Type.Optional(_primitives.NonEmptyString),
  mode: _typebox.Type.Optional(_primitives.NonEmptyString),
  lastInputSeconds: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  reason: _typebox.Type.Optional(_primitives.NonEmptyString),
  tags: _typebox.Type.Optional(_typebox.Type.Array(_primitives.NonEmptyString)),
  text: _typebox.Type.Optional(_typebox.Type.String()),
  ts: _typebox.Type.Integer({ minimum: 0 }),
  deviceId: _typebox.Type.Optional(_primitives.NonEmptyString),
  roles: _typebox.Type.Optional(_typebox.Type.Array(_primitives.NonEmptyString)),
  scopes: _typebox.Type.Optional(_typebox.Type.Array(_primitives.NonEmptyString)),
  instanceId: _typebox.Type.Optional(_primitives.NonEmptyString)
}, { additionalProperties: false });
const HealthSnapshotSchema = exports.HealthSnapshotSchema = _typebox.Type.Any();
const SessionDefaultsSchema = exports.SessionDefaultsSchema = _typebox.Type.Object({
  defaultAgentId: _primitives.NonEmptyString,
  mainKey: _primitives.NonEmptyString,
  mainSessionKey: _primitives.NonEmptyString,
  scope: _typebox.Type.Optional(_primitives.NonEmptyString)
}, { additionalProperties: false });
const StateVersionSchema = exports.StateVersionSchema = _typebox.Type.Object({
  presence: _typebox.Type.Integer({ minimum: 0 }),
  health: _typebox.Type.Integer({ minimum: 0 })
}, { additionalProperties: false });
const SnapshotSchema = exports.SnapshotSchema = _typebox.Type.Object({
  presence: _typebox.Type.Array(PresenceEntrySchema),
  health: HealthSnapshotSchema,
  stateVersion: StateVersionSchema,
  uptimeMs: _typebox.Type.Integer({ minimum: 0 }),
  configPath: _typebox.Type.Optional(_primitives.NonEmptyString),
  stateDir: _typebox.Type.Optional(_primitives.NonEmptyString),
  sessionDefaults: _typebox.Type.Optional(SessionDefaultsSchema)
}, { additionalProperties: false }); /* v9-58b48fdec0582c91 */
