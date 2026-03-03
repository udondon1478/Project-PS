"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.UpdateRunParamsSchema = exports.ConfigUiHintSchema = exports.ConfigSetParamsSchema = exports.ConfigSchemaResponseSchema = exports.ConfigSchemaParamsSchema = exports.ConfigPatchParamsSchema = exports.ConfigGetParamsSchema = exports.ConfigApplyParamsSchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
const ConfigGetParamsSchema = exports.ConfigGetParamsSchema = _typebox.Type.Object({}, { additionalProperties: false });
const ConfigSetParamsSchema = exports.ConfigSetParamsSchema = _typebox.Type.Object({
  raw: _primitives.NonEmptyString,
  baseHash: _typebox.Type.Optional(_primitives.NonEmptyString)
}, { additionalProperties: false });
const ConfigApplyParamsSchema = exports.ConfigApplyParamsSchema = _typebox.Type.Object({
  raw: _primitives.NonEmptyString,
  baseHash: _typebox.Type.Optional(_primitives.NonEmptyString),
  sessionKey: _typebox.Type.Optional(_typebox.Type.String()),
  note: _typebox.Type.Optional(_typebox.Type.String()),
  restartDelayMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 }))
}, { additionalProperties: false });
const ConfigPatchParamsSchema = exports.ConfigPatchParamsSchema = _typebox.Type.Object({
  raw: _primitives.NonEmptyString,
  baseHash: _typebox.Type.Optional(_primitives.NonEmptyString),
  sessionKey: _typebox.Type.Optional(_typebox.Type.String()),
  note: _typebox.Type.Optional(_typebox.Type.String()),
  restartDelayMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 }))
}, { additionalProperties: false });
const ConfigSchemaParamsSchema = exports.ConfigSchemaParamsSchema = _typebox.Type.Object({}, { additionalProperties: false });
const UpdateRunParamsSchema = exports.UpdateRunParamsSchema = _typebox.Type.Object({
  sessionKey: _typebox.Type.Optional(_typebox.Type.String()),
  note: _typebox.Type.Optional(_typebox.Type.String()),
  restartDelayMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1 }))
}, { additionalProperties: false });
const ConfigUiHintSchema = exports.ConfigUiHintSchema = _typebox.Type.Object({
  label: _typebox.Type.Optional(_typebox.Type.String()),
  help: _typebox.Type.Optional(_typebox.Type.String()),
  group: _typebox.Type.Optional(_typebox.Type.String()),
  order: _typebox.Type.Optional(_typebox.Type.Integer()),
  advanced: _typebox.Type.Optional(_typebox.Type.Boolean()),
  sensitive: _typebox.Type.Optional(_typebox.Type.Boolean()),
  placeholder: _typebox.Type.Optional(_typebox.Type.String()),
  itemTemplate: _typebox.Type.Optional(_typebox.Type.Unknown())
}, { additionalProperties: false });
const ConfigSchemaResponseSchema = exports.ConfigSchemaResponseSchema = _typebox.Type.Object({
  schema: _typebox.Type.Unknown(),
  uiHints: _typebox.Type.Record(_typebox.Type.String(), ConfigUiHintSchema),
  version: _primitives.NonEmptyString,
  generatedAt: _primitives.NonEmptyString
}, { additionalProperties: false }); /* v9-4a81620a6f74a854 */
