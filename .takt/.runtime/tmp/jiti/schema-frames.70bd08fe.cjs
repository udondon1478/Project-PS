"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.TickEventSchema = exports.ShutdownEventSchema = exports.ResponseFrameSchema = exports.RequestFrameSchema = exports.HelloOkSchema = exports.GatewayFrameSchema = exports.EventFrameSchema = exports.ErrorShapeSchema = exports.ConnectParamsSchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
var _snapshot = require("./snapshot.js");
const TickEventSchema = exports.TickEventSchema = _typebox.Type.Object({
  ts: _typebox.Type.Integer({ minimum: 0 })
}, { additionalProperties: false });
const ShutdownEventSchema = exports.ShutdownEventSchema = _typebox.Type.Object({
  reason: _primitives.NonEmptyString,
  restartExpectedMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 }))
}, { additionalProperties: false });
const ConnectParamsSchema = exports.ConnectParamsSchema = _typebox.Type.Object({
  minProtocol: _typebox.Type.Integer({ minimum: 1 }),
  maxProtocol: _typebox.Type.Integer({ minimum: 1 }),
  client: _typebox.Type.Object({
    id: _primitives.GatewayClientIdSchema,
    displayName: _typebox.Type.Optional(_primitives.NonEmptyString),
    version: _primitives.NonEmptyString,
    platform: _primitives.NonEmptyString,
    deviceFamily: _typebox.Type.Optional(_primitives.NonEmptyString),
    modelIdentifier: _typebox.Type.Optional(_primitives.NonEmptyString),
    mode: _primitives.GatewayClientModeSchema,
    instanceId: _typebox.Type.Optional(_primitives.NonEmptyString)
  }, { additionalProperties: false }),
  caps: _typebox.Type.Optional(_typebox.Type.Array(_primitives.NonEmptyString, { default: [] })),
  commands: _typebox.Type.Optional(_typebox.Type.Array(_primitives.NonEmptyString)),
  permissions: _typebox.Type.Optional(_typebox.Type.Record(_primitives.NonEmptyString, _typebox.Type.Boolean())),
  pathEnv: _typebox.Type.Optional(_typebox.Type.String()),
  role: _typebox.Type.Optional(_primitives.NonEmptyString),
  scopes: _typebox.Type.Optional(_typebox.Type.Array(_primitives.NonEmptyString)),
  device: _typebox.Type.Optional(_typebox.Type.Object({
    id: _primitives.NonEmptyString,
    publicKey: _primitives.NonEmptyString,
    signature: _primitives.NonEmptyString,
    signedAt: _typebox.Type.Integer({ minimum: 0 }),
    nonce: _typebox.Type.Optional(_primitives.NonEmptyString)
  }, { additionalProperties: false })),
  auth: _typebox.Type.Optional(_typebox.Type.Object({
    token: _typebox.Type.Optional(_typebox.Type.String()),
    password: _typebox.Type.Optional(_typebox.Type.String())
  }, { additionalProperties: false })),
  locale: _typebox.Type.Optional(_typebox.Type.String()),
  userAgent: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const HelloOkSchema = exports.HelloOkSchema = _typebox.Type.Object({
  type: _typebox.Type.Literal("hello-ok"),
  protocol: _typebox.Type.Integer({ minimum: 1 }),
  server: _typebox.Type.Object({
    version: _primitives.NonEmptyString,
    commit: _typebox.Type.Optional(_primitives.NonEmptyString),
    host: _typebox.Type.Optional(_primitives.NonEmptyString),
    connId: _primitives.NonEmptyString
  }, { additionalProperties: false }),
  features: _typebox.Type.Object({
    methods: _typebox.Type.Array(_primitives.NonEmptyString),
    events: _typebox.Type.Array(_primitives.NonEmptyString)
  }, { additionalProperties: false }),
  snapshot: _snapshot.SnapshotSchema,
  canvasHostUrl: _typebox.Type.Optional(_primitives.NonEmptyString),
  auth: _typebox.Type.Optional(_typebox.Type.Object({
    deviceToken: _primitives.NonEmptyString,
    role: _primitives.NonEmptyString,
    scopes: _typebox.Type.Array(_primitives.NonEmptyString),
    issuedAtMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 }))
  }, { additionalProperties: false })),
  policy: _typebox.Type.Object({
    maxPayload: _typebox.Type.Integer({ minimum: 1 }),
    maxBufferedBytes: _typebox.Type.Integer({ minimum: 1 }),
    tickIntervalMs: _typebox.Type.Integer({ minimum: 1 })
  }, { additionalProperties: false })
}, { additionalProperties: false });
const ErrorShapeSchema = exports.ErrorShapeSchema = _typebox.Type.Object({
  code: _primitives.NonEmptyString,
  message: _primitives.NonEmptyString,
  details: _typebox.Type.Optional(_typebox.Type.Unknown()),
  retryable: _typebox.Type.Optional(_typebox.Type.Boolean()),
  retryAfterMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 }))
}, { additionalProperties: false });
const RequestFrameSchema = exports.RequestFrameSchema = _typebox.Type.Object({
  type: _typebox.Type.Literal("req"),
  id: _primitives.NonEmptyString,
  method: _primitives.NonEmptyString,
  params: _typebox.Type.Optional(_typebox.Type.Unknown())
}, { additionalProperties: false });
const ResponseFrameSchema = exports.ResponseFrameSchema = _typebox.Type.Object({
  type: _typebox.Type.Literal("res"),
  id: _primitives.NonEmptyString,
  ok: _typebox.Type.Boolean(),
  payload: _typebox.Type.Optional(_typebox.Type.Unknown()),
  error: _typebox.Type.Optional(ErrorShapeSchema)
}, { additionalProperties: false });
const EventFrameSchema = exports.EventFrameSchema = _typebox.Type.Object({
  type: _typebox.Type.Literal("event"),
  event: _primitives.NonEmptyString,
  payload: _typebox.Type.Optional(_typebox.Type.Unknown()),
  seq: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  stateVersion: _typebox.Type.Optional(_snapshot.StateVersionSchema)
}, { additionalProperties: false });
// Discriminated union of all top-level frames. Using a discriminator makes
// downstream codegen (quicktype) produce tighter types instead of all-optional
// blobs.
const GatewayFrameSchema = exports.GatewayFrameSchema = _typebox.Type.Union([RequestFrameSchema, ResponseFrameSchema, EventFrameSchema], { discriminator: "type" }); /* v9-a8e1fdda758edeb0 */
