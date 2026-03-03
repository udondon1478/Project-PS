"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.WebLoginWaitParamsSchema = exports.WebLoginStartParamsSchema = exports.TalkModeParamsSchema = exports.ChannelsStatusResultSchema = exports.ChannelsStatusParamsSchema = exports.ChannelsLogoutParamsSchema = exports.ChannelUiMetaSchema = exports.ChannelAccountSnapshotSchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
const TalkModeParamsSchema = exports.TalkModeParamsSchema = _typebox.Type.Object({
  enabled: _typebox.Type.Boolean(),
  phase: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const ChannelsStatusParamsSchema = exports.ChannelsStatusParamsSchema = _typebox.Type.Object({
  probe: _typebox.Type.Optional(_typebox.Type.Boolean()),
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 }))
}, { additionalProperties: false });
// Channel docking: channels.status is intentionally schema-light so new
// channels can ship without protocol updates.
const ChannelAccountSnapshotSchema = exports.ChannelAccountSnapshotSchema = _typebox.Type.Object({
  accountId: _primitives.NonEmptyString,
  name: _typebox.Type.Optional(_typebox.Type.String()),
  enabled: _typebox.Type.Optional(_typebox.Type.Boolean()),
  configured: _typebox.Type.Optional(_typebox.Type.Boolean()),
  linked: _typebox.Type.Optional(_typebox.Type.Boolean()),
  running: _typebox.Type.Optional(_typebox.Type.Boolean()),
  connected: _typebox.Type.Optional(_typebox.Type.Boolean()),
  reconnectAttempts: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  lastConnectedAt: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  lastError: _typebox.Type.Optional(_typebox.Type.String()),
  lastStartAt: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  lastStopAt: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  lastInboundAt: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  lastOutboundAt: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  lastProbeAt: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  mode: _typebox.Type.Optional(_typebox.Type.String()),
  dmPolicy: _typebox.Type.Optional(_typebox.Type.String()),
  allowFrom: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String())),
  tokenSource: _typebox.Type.Optional(_typebox.Type.String()),
  botTokenSource: _typebox.Type.Optional(_typebox.Type.String()),
  appTokenSource: _typebox.Type.Optional(_typebox.Type.String()),
  baseUrl: _typebox.Type.Optional(_typebox.Type.String()),
  allowUnmentionedGroups: _typebox.Type.Optional(_typebox.Type.Boolean()),
  cliPath: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.String(), _typebox.Type.Null()])),
  dbPath: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.String(), _typebox.Type.Null()])),
  port: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Integer({ minimum: 0 }), _typebox.Type.Null()])),
  probe: _typebox.Type.Optional(_typebox.Type.Unknown()),
  audit: _typebox.Type.Optional(_typebox.Type.Unknown()),
  application: _typebox.Type.Optional(_typebox.Type.Unknown())
}, { additionalProperties: true });
const ChannelUiMetaSchema = exports.ChannelUiMetaSchema = _typebox.Type.Object({
  id: _primitives.NonEmptyString,
  label: _primitives.NonEmptyString,
  detailLabel: _primitives.NonEmptyString,
  systemImage: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const ChannelsStatusResultSchema = exports.ChannelsStatusResultSchema = _typebox.Type.Object({
  ts: _typebox.Type.Integer({ minimum: 0 }),
  channelOrder: _typebox.Type.Array(_primitives.NonEmptyString),
  channelLabels: _typebox.Type.Record(_primitives.NonEmptyString, _primitives.NonEmptyString),
  channelDetailLabels: _typebox.Type.Optional(_typebox.Type.Record(_primitives.NonEmptyString, _primitives.NonEmptyString)),
  channelSystemImages: _typebox.Type.Optional(_typebox.Type.Record(_primitives.NonEmptyString, _primitives.NonEmptyString)),
  channelMeta: _typebox.Type.Optional(_typebox.Type.Array(ChannelUiMetaSchema)),
  channels: _typebox.Type.Record(_primitives.NonEmptyString, _typebox.Type.Unknown()),
  channelAccounts: _typebox.Type.Record(_primitives.NonEmptyString, _typebox.Type.Array(ChannelAccountSnapshotSchema)),
  channelDefaultAccountId: _typebox.Type.Record(_primitives.NonEmptyString, _primitives.NonEmptyString)
}, { additionalProperties: false });
const ChannelsLogoutParamsSchema = exports.ChannelsLogoutParamsSchema = _typebox.Type.Object({
  channel: _primitives.NonEmptyString,
  accountId: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const WebLoginStartParamsSchema = exports.WebLoginStartParamsSchema = _typebox.Type.Object({
  force: _typebox.Type.Optional(_typebox.Type.Boolean()),
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  verbose: _typebox.Type.Optional(_typebox.Type.Boolean()),
  accountId: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const WebLoginWaitParamsSchema = exports.WebLoginWaitParamsSchema = _typebox.Type.Object({
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  accountId: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false }); /* v9-dfaa7e0c8510794f */
