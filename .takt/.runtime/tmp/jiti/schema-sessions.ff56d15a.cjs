"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.SessionsResolveParamsSchema = exports.SessionsResetParamsSchema = exports.SessionsPreviewParamsSchema = exports.SessionsPatchParamsSchema = exports.SessionsListParamsSchema = exports.SessionsDeleteParamsSchema = exports.SessionsCompactParamsSchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
const SessionsListParamsSchema = exports.SessionsListParamsSchema = _typebox.Type.Object({
  limit: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1 })),
  activeMinutes: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1 })),
  includeGlobal: _typebox.Type.Optional(_typebox.Type.Boolean()),
  includeUnknown: _typebox.Type.Optional(_typebox.Type.Boolean()),
  /**
   * Read first 8KB of each session transcript to derive title from first user message.
   * Performs a file read per session - use `limit` to bound result set on large stores.
   */
  includeDerivedTitles: _typebox.Type.Optional(_typebox.Type.Boolean()),
  /**
   * Read last 16KB of each session transcript to extract most recent message preview.
   * Performs a file read per session - use `limit` to bound result set on large stores.
   */
  includeLastMessage: _typebox.Type.Optional(_typebox.Type.Boolean()),
  label: _typebox.Type.Optional(_primitives.SessionLabelString),
  spawnedBy: _typebox.Type.Optional(_primitives.NonEmptyString),
  agentId: _typebox.Type.Optional(_primitives.NonEmptyString),
  search: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const SessionsPreviewParamsSchema = exports.SessionsPreviewParamsSchema = _typebox.Type.Object({
  keys: _typebox.Type.Array(_primitives.NonEmptyString, { minItems: 1 }),
  limit: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1 })),
  maxChars: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 20 }))
}, { additionalProperties: false });
const SessionsResolveParamsSchema = exports.SessionsResolveParamsSchema = _typebox.Type.Object({
  key: _typebox.Type.Optional(_primitives.NonEmptyString),
  sessionId: _typebox.Type.Optional(_primitives.NonEmptyString),
  label: _typebox.Type.Optional(_primitives.SessionLabelString),
  agentId: _typebox.Type.Optional(_primitives.NonEmptyString),
  spawnedBy: _typebox.Type.Optional(_primitives.NonEmptyString),
  includeGlobal: _typebox.Type.Optional(_typebox.Type.Boolean()),
  includeUnknown: _typebox.Type.Optional(_typebox.Type.Boolean())
}, { additionalProperties: false });
const SessionsPatchParamsSchema = exports.SessionsPatchParamsSchema = _typebox.Type.Object({
  key: _primitives.NonEmptyString,
  label: _typebox.Type.Optional(_typebox.Type.Union([_primitives.SessionLabelString, _typebox.Type.Null()])),
  thinkingLevel: _typebox.Type.Optional(_typebox.Type.Union([_primitives.NonEmptyString, _typebox.Type.Null()])),
  verboseLevel: _typebox.Type.Optional(_typebox.Type.Union([_primitives.NonEmptyString, _typebox.Type.Null()])),
  reasoningLevel: _typebox.Type.Optional(_typebox.Type.Union([_primitives.NonEmptyString, _typebox.Type.Null()])),
  responseUsage: _typebox.Type.Optional(_typebox.Type.Union([
  _typebox.Type.Literal("off"),
  _typebox.Type.Literal("tokens"),
  _typebox.Type.Literal("full"),
  // Backward compat with older clients/stores.
  _typebox.Type.Literal("on"),
  _typebox.Type.Null()]
  )),
  elevatedLevel: _typebox.Type.Optional(_typebox.Type.Union([_primitives.NonEmptyString, _typebox.Type.Null()])),
  execHost: _typebox.Type.Optional(_typebox.Type.Union([_primitives.NonEmptyString, _typebox.Type.Null()])),
  execSecurity: _typebox.Type.Optional(_typebox.Type.Union([_primitives.NonEmptyString, _typebox.Type.Null()])),
  execAsk: _typebox.Type.Optional(_typebox.Type.Union([_primitives.NonEmptyString, _typebox.Type.Null()])),
  execNode: _typebox.Type.Optional(_typebox.Type.Union([_primitives.NonEmptyString, _typebox.Type.Null()])),
  model: _typebox.Type.Optional(_typebox.Type.Union([_primitives.NonEmptyString, _typebox.Type.Null()])),
  spawnedBy: _typebox.Type.Optional(_typebox.Type.Union([_primitives.NonEmptyString, _typebox.Type.Null()])),
  sendPolicy: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("allow"), _typebox.Type.Literal("deny"), _typebox.Type.Null()])),
  groupActivation: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("mention"), _typebox.Type.Literal("always"), _typebox.Type.Null()]))
}, { additionalProperties: false });
const SessionsResetParamsSchema = exports.SessionsResetParamsSchema = _typebox.Type.Object({ key: _primitives.NonEmptyString }, { additionalProperties: false });
const SessionsDeleteParamsSchema = exports.SessionsDeleteParamsSchema = _typebox.Type.Object({
  key: _primitives.NonEmptyString,
  deleteTranscript: _typebox.Type.Optional(_typebox.Type.Boolean())
}, { additionalProperties: false });
const SessionsCompactParamsSchema = exports.SessionsCompactParamsSchema = _typebox.Type.Object({
  key: _primitives.NonEmptyString,
  maxLines: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1 }))
}, { additionalProperties: false }); /* v9-6e15a60c648f7dc0 */
