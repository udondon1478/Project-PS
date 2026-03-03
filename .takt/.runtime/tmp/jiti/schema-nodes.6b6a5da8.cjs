"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.NodeRenameParamsSchema = exports.NodePairVerifyParamsSchema = exports.NodePairRequestParamsSchema = exports.NodePairRejectParamsSchema = exports.NodePairListParamsSchema = exports.NodePairApproveParamsSchema = exports.NodeListParamsSchema = exports.NodeInvokeResultParamsSchema = exports.NodeInvokeRequestEventSchema = exports.NodeInvokeParamsSchema = exports.NodeEventParamsSchema = exports.NodeDescribeParamsSchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
const NodePairRequestParamsSchema = exports.NodePairRequestParamsSchema = _typebox.Type.Object({
  nodeId: _primitives.NonEmptyString,
  displayName: _typebox.Type.Optional(_primitives.NonEmptyString),
  platform: _typebox.Type.Optional(_primitives.NonEmptyString),
  version: _typebox.Type.Optional(_primitives.NonEmptyString),
  coreVersion: _typebox.Type.Optional(_primitives.NonEmptyString),
  uiVersion: _typebox.Type.Optional(_primitives.NonEmptyString),
  deviceFamily: _typebox.Type.Optional(_primitives.NonEmptyString),
  modelIdentifier: _typebox.Type.Optional(_primitives.NonEmptyString),
  caps: _typebox.Type.Optional(_typebox.Type.Array(_primitives.NonEmptyString)),
  commands: _typebox.Type.Optional(_typebox.Type.Array(_primitives.NonEmptyString)),
  remoteIp: _typebox.Type.Optional(_primitives.NonEmptyString),
  silent: _typebox.Type.Optional(_typebox.Type.Boolean())
}, { additionalProperties: false });
const NodePairListParamsSchema = exports.NodePairListParamsSchema = _typebox.Type.Object({}, { additionalProperties: false });
const NodePairApproveParamsSchema = exports.NodePairApproveParamsSchema = _typebox.Type.Object({ requestId: _primitives.NonEmptyString }, { additionalProperties: false });
const NodePairRejectParamsSchema = exports.NodePairRejectParamsSchema = _typebox.Type.Object({ requestId: _primitives.NonEmptyString }, { additionalProperties: false });
const NodePairVerifyParamsSchema = exports.NodePairVerifyParamsSchema = _typebox.Type.Object({ nodeId: _primitives.NonEmptyString, token: _primitives.NonEmptyString }, { additionalProperties: false });
const NodeRenameParamsSchema = exports.NodeRenameParamsSchema = _typebox.Type.Object({ nodeId: _primitives.NonEmptyString, displayName: _primitives.NonEmptyString }, { additionalProperties: false });
const NodeListParamsSchema = exports.NodeListParamsSchema = _typebox.Type.Object({}, { additionalProperties: false });
const NodeDescribeParamsSchema = exports.NodeDescribeParamsSchema = _typebox.Type.Object({ nodeId: _primitives.NonEmptyString }, { additionalProperties: false });
const NodeInvokeParamsSchema = exports.NodeInvokeParamsSchema = _typebox.Type.Object({
  nodeId: _primitives.NonEmptyString,
  command: _primitives.NonEmptyString,
  params: _typebox.Type.Optional(_typebox.Type.Unknown()),
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  idempotencyKey: _primitives.NonEmptyString
}, { additionalProperties: false });
const NodeInvokeResultParamsSchema = exports.NodeInvokeResultParamsSchema = _typebox.Type.Object({
  id: _primitives.NonEmptyString,
  nodeId: _primitives.NonEmptyString,
  ok: _typebox.Type.Boolean(),
  payload: _typebox.Type.Optional(_typebox.Type.Unknown()),
  payloadJSON: _typebox.Type.Optional(_typebox.Type.String()),
  error: _typebox.Type.Optional(_typebox.Type.Object({
    code: _typebox.Type.Optional(_primitives.NonEmptyString),
    message: _typebox.Type.Optional(_primitives.NonEmptyString)
  }, { additionalProperties: false }))
}, { additionalProperties: false });
const NodeEventParamsSchema = exports.NodeEventParamsSchema = _typebox.Type.Object({
  event: _primitives.NonEmptyString,
  payload: _typebox.Type.Optional(_typebox.Type.Unknown()),
  payloadJSON: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const NodeInvokeRequestEventSchema = exports.NodeInvokeRequestEventSchema = _typebox.Type.Object({
  id: _primitives.NonEmptyString,
  nodeId: _primitives.NonEmptyString,
  command: _primitives.NonEmptyString,
  paramsJSON: _typebox.Type.Optional(_typebox.Type.String()),
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  idempotencyKey: _typebox.Type.Optional(_primitives.NonEmptyString)
}, { additionalProperties: false }); /* v9-1652da280e9bf211 */
