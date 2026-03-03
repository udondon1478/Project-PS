"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.WakeParamsSchema = exports.SendParamsSchema = exports.PollParamsSchema = exports.AgentWaitParamsSchema = exports.AgentParamsSchema = exports.AgentIdentityResultSchema = exports.AgentIdentityParamsSchema = exports.AgentEventSchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
const AgentEventSchema = exports.AgentEventSchema = _typebox.Type.Object({
  runId: _primitives.NonEmptyString,
  seq: _typebox.Type.Integer({ minimum: 0 }),
  stream: _primitives.NonEmptyString,
  ts: _typebox.Type.Integer({ minimum: 0 }),
  data: _typebox.Type.Record(_typebox.Type.String(), _typebox.Type.Unknown())
}, { additionalProperties: false });
const SendParamsSchema = exports.SendParamsSchema = _typebox.Type.Object({
  to: _primitives.NonEmptyString,
  message: _primitives.NonEmptyString,
  mediaUrl: _typebox.Type.Optional(_typebox.Type.String()),
  mediaUrls: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String())),
  gifPlayback: _typebox.Type.Optional(_typebox.Type.Boolean()),
  channel: _typebox.Type.Optional(_typebox.Type.String()),
  accountId: _typebox.Type.Optional(_typebox.Type.String()),
  /** Optional session key for mirroring delivered output back into the transcript. */
  sessionKey: _typebox.Type.Optional(_typebox.Type.String()),
  idempotencyKey: _primitives.NonEmptyString
}, { additionalProperties: false });
const PollParamsSchema = exports.PollParamsSchema = _typebox.Type.Object({
  to: _primitives.NonEmptyString,
  question: _primitives.NonEmptyString,
  options: _typebox.Type.Array(_primitives.NonEmptyString, { minItems: 2, maxItems: 12 }),
  maxSelections: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1, maximum: 12 })),
  durationHours: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1 })),
  channel: _typebox.Type.Optional(_typebox.Type.String()),
  accountId: _typebox.Type.Optional(_typebox.Type.String()),
  idempotencyKey: _primitives.NonEmptyString
}, { additionalProperties: false });
const AgentParamsSchema = exports.AgentParamsSchema = _typebox.Type.Object({
  message: _primitives.NonEmptyString,
  agentId: _typebox.Type.Optional(_primitives.NonEmptyString),
  to: _typebox.Type.Optional(_typebox.Type.String()),
  replyTo: _typebox.Type.Optional(_typebox.Type.String()),
  sessionId: _typebox.Type.Optional(_typebox.Type.String()),
  sessionKey: _typebox.Type.Optional(_typebox.Type.String()),
  thinking: _typebox.Type.Optional(_typebox.Type.String()),
  deliver: _typebox.Type.Optional(_typebox.Type.Boolean()),
  attachments: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.Unknown())),
  channel: _typebox.Type.Optional(_typebox.Type.String()),
  replyChannel: _typebox.Type.Optional(_typebox.Type.String()),
  accountId: _typebox.Type.Optional(_typebox.Type.String()),
  replyAccountId: _typebox.Type.Optional(_typebox.Type.String()),
  threadId: _typebox.Type.Optional(_typebox.Type.String()),
  groupId: _typebox.Type.Optional(_typebox.Type.String()),
  groupChannel: _typebox.Type.Optional(_typebox.Type.String()),
  groupSpace: _typebox.Type.Optional(_typebox.Type.String()),
  timeout: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  lane: _typebox.Type.Optional(_typebox.Type.String()),
  extraSystemPrompt: _typebox.Type.Optional(_typebox.Type.String()),
  idempotencyKey: _primitives.NonEmptyString,
  label: _typebox.Type.Optional(_primitives.SessionLabelString),
  spawnedBy: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const AgentIdentityParamsSchema = exports.AgentIdentityParamsSchema = _typebox.Type.Object({
  agentId: _typebox.Type.Optional(_primitives.NonEmptyString),
  sessionKey: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const AgentIdentityResultSchema = exports.AgentIdentityResultSchema = _typebox.Type.Object({
  agentId: _primitives.NonEmptyString,
  name: _typebox.Type.Optional(_primitives.NonEmptyString),
  avatar: _typebox.Type.Optional(_primitives.NonEmptyString)
}, { additionalProperties: false });
const AgentWaitParamsSchema = exports.AgentWaitParamsSchema = _typebox.Type.Object({
  runId: _primitives.NonEmptyString,
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 }))
}, { additionalProperties: false });
const WakeParamsSchema = exports.WakeParamsSchema = _typebox.Type.Object({
  mode: _typebox.Type.Union([_typebox.Type.Literal("now"), _typebox.Type.Literal("next-heartbeat")]),
  text: _primitives.NonEmptyString
}, { additionalProperties: false }); /* v9-24270db6b96b40a0 */
