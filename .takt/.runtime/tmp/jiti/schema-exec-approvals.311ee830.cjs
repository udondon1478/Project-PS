"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ExecApprovalsSnapshotSchema = exports.ExecApprovalsSetParamsSchema = exports.ExecApprovalsNodeSetParamsSchema = exports.ExecApprovalsNodeGetParamsSchema = exports.ExecApprovalsGetParamsSchema = exports.ExecApprovalsFileSchema = exports.ExecApprovalsDefaultsSchema = exports.ExecApprovalsAllowlistEntrySchema = exports.ExecApprovalsAgentSchema = exports.ExecApprovalResolveParamsSchema = exports.ExecApprovalRequestParamsSchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
const ExecApprovalsAllowlistEntrySchema = exports.ExecApprovalsAllowlistEntrySchema = _typebox.Type.Object({
  id: _typebox.Type.Optional(_primitives.NonEmptyString),
  pattern: _typebox.Type.String(),
  lastUsedAt: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  lastUsedCommand: _typebox.Type.Optional(_typebox.Type.String()),
  lastResolvedPath: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const ExecApprovalsDefaultsSchema = exports.ExecApprovalsDefaultsSchema = _typebox.Type.Object({
  security: _typebox.Type.Optional(_typebox.Type.String()),
  ask: _typebox.Type.Optional(_typebox.Type.String()),
  askFallback: _typebox.Type.Optional(_typebox.Type.String()),
  autoAllowSkills: _typebox.Type.Optional(_typebox.Type.Boolean())
}, { additionalProperties: false });
const ExecApprovalsAgentSchema = exports.ExecApprovalsAgentSchema = _typebox.Type.Object({
  security: _typebox.Type.Optional(_typebox.Type.String()),
  ask: _typebox.Type.Optional(_typebox.Type.String()),
  askFallback: _typebox.Type.Optional(_typebox.Type.String()),
  autoAllowSkills: _typebox.Type.Optional(_typebox.Type.Boolean()),
  allowlist: _typebox.Type.Optional(_typebox.Type.Array(ExecApprovalsAllowlistEntrySchema))
}, { additionalProperties: false });
const ExecApprovalsFileSchema = exports.ExecApprovalsFileSchema = _typebox.Type.Object({
  version: _typebox.Type.Literal(1),
  socket: _typebox.Type.Optional(_typebox.Type.Object({
    path: _typebox.Type.Optional(_typebox.Type.String()),
    token: _typebox.Type.Optional(_typebox.Type.String())
  }, { additionalProperties: false })),
  defaults: _typebox.Type.Optional(ExecApprovalsDefaultsSchema),
  agents: _typebox.Type.Optional(_typebox.Type.Record(_typebox.Type.String(), ExecApprovalsAgentSchema))
}, { additionalProperties: false });
const ExecApprovalsSnapshotSchema = exports.ExecApprovalsSnapshotSchema = _typebox.Type.Object({
  path: _primitives.NonEmptyString,
  exists: _typebox.Type.Boolean(),
  hash: _primitives.NonEmptyString,
  file: ExecApprovalsFileSchema
}, { additionalProperties: false });
const ExecApprovalsGetParamsSchema = exports.ExecApprovalsGetParamsSchema = _typebox.Type.Object({}, { additionalProperties: false });
const ExecApprovalsSetParamsSchema = exports.ExecApprovalsSetParamsSchema = _typebox.Type.Object({
  file: ExecApprovalsFileSchema,
  baseHash: _typebox.Type.Optional(_primitives.NonEmptyString)
}, { additionalProperties: false });
const ExecApprovalsNodeGetParamsSchema = exports.ExecApprovalsNodeGetParamsSchema = _typebox.Type.Object({
  nodeId: _primitives.NonEmptyString
}, { additionalProperties: false });
const ExecApprovalsNodeSetParamsSchema = exports.ExecApprovalsNodeSetParamsSchema = _typebox.Type.Object({
  nodeId: _primitives.NonEmptyString,
  file: ExecApprovalsFileSchema,
  baseHash: _typebox.Type.Optional(_primitives.NonEmptyString)
}, { additionalProperties: false });
const ExecApprovalRequestParamsSchema = exports.ExecApprovalRequestParamsSchema = _typebox.Type.Object({
  id: _typebox.Type.Optional(_primitives.NonEmptyString),
  command: _primitives.NonEmptyString,
  cwd: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.String(), _typebox.Type.Null()])),
  host: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.String(), _typebox.Type.Null()])),
  security: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.String(), _typebox.Type.Null()])),
  ask: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.String(), _typebox.Type.Null()])),
  agentId: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.String(), _typebox.Type.Null()])),
  resolvedPath: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.String(), _typebox.Type.Null()])),
  sessionKey: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.String(), _typebox.Type.Null()])),
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1 }))
}, { additionalProperties: false });
const ExecApprovalResolveParamsSchema = exports.ExecApprovalResolveParamsSchema = _typebox.Type.Object({
  id: _primitives.NonEmptyString,
  decision: _primitives.NonEmptyString
}, { additionalProperties: false }); /* v9-07416b2fd49abfda */
