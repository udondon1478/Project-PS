"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.LogsTailResultSchema = exports.LogsTailParamsSchema = exports.ChatSendParamsSchema = exports.ChatInjectParamsSchema = exports.ChatHistoryParamsSchema = exports.ChatEventSchema = exports.ChatAbortParamsSchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
const LogsTailParamsSchema = exports.LogsTailParamsSchema = _typebox.Type.Object({
  cursor: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  limit: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1, maximum: 5000 })),
  maxBytes: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1, maximum: 1_000_000 }))
}, { additionalProperties: false });
const LogsTailResultSchema = exports.LogsTailResultSchema = _typebox.Type.Object({
  file: _primitives.NonEmptyString,
  cursor: _typebox.Type.Integer({ minimum: 0 }),
  size: _typebox.Type.Integer({ minimum: 0 }),
  lines: _typebox.Type.Array(_typebox.Type.String()),
  truncated: _typebox.Type.Optional(_typebox.Type.Boolean()),
  reset: _typebox.Type.Optional(_typebox.Type.Boolean())
}, { additionalProperties: false });
// WebChat/WebSocket-native chat methods
const ChatHistoryParamsSchema = exports.ChatHistoryParamsSchema = _typebox.Type.Object({
  sessionKey: _primitives.NonEmptyString,
  limit: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1, maximum: 1000 }))
}, { additionalProperties: false });
const ChatSendParamsSchema = exports.ChatSendParamsSchema = _typebox.Type.Object({
  sessionKey: _primitives.NonEmptyString,
  message: _typebox.Type.String(),
  thinking: _typebox.Type.Optional(_typebox.Type.String()),
  deliver: _typebox.Type.Optional(_typebox.Type.Boolean()),
  attachments: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.Unknown())),
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  idempotencyKey: _primitives.NonEmptyString
}, { additionalProperties: false });
const ChatAbortParamsSchema = exports.ChatAbortParamsSchema = _typebox.Type.Object({
  sessionKey: _primitives.NonEmptyString,
  runId: _typebox.Type.Optional(_primitives.NonEmptyString)
}, { additionalProperties: false });
const ChatInjectParamsSchema = exports.ChatInjectParamsSchema = _typebox.Type.Object({
  sessionKey: _primitives.NonEmptyString,
  message: _primitives.NonEmptyString,
  label: _typebox.Type.Optional(_typebox.Type.String({ maxLength: 100 }))
}, { additionalProperties: false });
const ChatEventSchema = exports.ChatEventSchema = _typebox.Type.Object({
  runId: _primitives.NonEmptyString,
  sessionKey: _primitives.NonEmptyString,
  seq: _typebox.Type.Integer({ minimum: 0 }),
  state: _typebox.Type.Union([
  _typebox.Type.Literal("delta"),
  _typebox.Type.Literal("final"),
  _typebox.Type.Literal("aborted"),
  _typebox.Type.Literal("error")]
  ),
  message: _typebox.Type.Optional(_typebox.Type.Unknown()),
  errorMessage: _typebox.Type.Optional(_typebox.Type.String()),
  usage: _typebox.Type.Optional(_typebox.Type.Unknown()),
  stopReason: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false }); /* v9-1597a851ad736f7c */
