"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.WizardStepSchema = exports.WizardStepOptionSchema = exports.WizardStatusResultSchema = exports.WizardStatusParamsSchema = exports.WizardStartResultSchema = exports.WizardStartParamsSchema = exports.WizardNextResultSchema = exports.WizardNextParamsSchema = exports.WizardCancelParamsSchema = exports.WizardAnswerSchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
const WizardStartParamsSchema = exports.WizardStartParamsSchema = _typebox.Type.Object({
  mode: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("local"), _typebox.Type.Literal("remote")])),
  workspace: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const WizardAnswerSchema = exports.WizardAnswerSchema = _typebox.Type.Object({
  stepId: _primitives.NonEmptyString,
  value: _typebox.Type.Optional(_typebox.Type.Unknown())
}, { additionalProperties: false });
const WizardNextParamsSchema = exports.WizardNextParamsSchema = _typebox.Type.Object({
  sessionId: _primitives.NonEmptyString,
  answer: _typebox.Type.Optional(WizardAnswerSchema)
}, { additionalProperties: false });
const WizardCancelParamsSchema = exports.WizardCancelParamsSchema = _typebox.Type.Object({
  sessionId: _primitives.NonEmptyString
}, { additionalProperties: false });
const WizardStatusParamsSchema = exports.WizardStatusParamsSchema = _typebox.Type.Object({
  sessionId: _primitives.NonEmptyString
}, { additionalProperties: false });
const WizardStepOptionSchema = exports.WizardStepOptionSchema = _typebox.Type.Object({
  value: _typebox.Type.Unknown(),
  label: _primitives.NonEmptyString,
  hint: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const WizardStepSchema = exports.WizardStepSchema = _typebox.Type.Object({
  id: _primitives.NonEmptyString,
  type: _typebox.Type.Union([
  _typebox.Type.Literal("note"),
  _typebox.Type.Literal("select"),
  _typebox.Type.Literal("text"),
  _typebox.Type.Literal("confirm"),
  _typebox.Type.Literal("multiselect"),
  _typebox.Type.Literal("progress"),
  _typebox.Type.Literal("action")]
  ),
  title: _typebox.Type.Optional(_typebox.Type.String()),
  message: _typebox.Type.Optional(_typebox.Type.String()),
  options: _typebox.Type.Optional(_typebox.Type.Array(WizardStepOptionSchema)),
  initialValue: _typebox.Type.Optional(_typebox.Type.Unknown()),
  placeholder: _typebox.Type.Optional(_typebox.Type.String()),
  sensitive: _typebox.Type.Optional(_typebox.Type.Boolean()),
  executor: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("gateway"), _typebox.Type.Literal("client")]))
}, { additionalProperties: false });
const WizardNextResultSchema = exports.WizardNextResultSchema = _typebox.Type.Object({
  done: _typebox.Type.Boolean(),
  step: _typebox.Type.Optional(WizardStepSchema),
  status: _typebox.Type.Optional(_typebox.Type.Union([
  _typebox.Type.Literal("running"),
  _typebox.Type.Literal("done"),
  _typebox.Type.Literal("cancelled"),
  _typebox.Type.Literal("error")]
  )),
  error: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const WizardStartResultSchema = exports.WizardStartResultSchema = _typebox.Type.Object({
  sessionId: _primitives.NonEmptyString,
  done: _typebox.Type.Boolean(),
  step: _typebox.Type.Optional(WizardStepSchema),
  status: _typebox.Type.Optional(_typebox.Type.Union([
  _typebox.Type.Literal("running"),
  _typebox.Type.Literal("done"),
  _typebox.Type.Literal("cancelled"),
  _typebox.Type.Literal("error")]
  )),
  error: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false });
const WizardStatusResultSchema = exports.WizardStatusResultSchema = _typebox.Type.Object({
  status: _typebox.Type.Union([
  _typebox.Type.Literal("running"),
  _typebox.Type.Literal("done"),
  _typebox.Type.Literal("cancelled"),
  _typebox.Type.Literal("error")]
  ),
  error: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false }); /* v9-b58bd93332676590 */
