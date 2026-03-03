"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.SkillsUpdateParamsSchema = exports.SkillsStatusParamsSchema = exports.SkillsInstallParamsSchema = exports.SkillsBinsResultSchema = exports.SkillsBinsParamsSchema = exports.ModelsListResultSchema = exports.ModelsListParamsSchema = exports.ModelChoiceSchema = exports.AgentsListResultSchema = exports.AgentsListParamsSchema = exports.AgentSummarySchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
const ModelChoiceSchema = exports.ModelChoiceSchema = _typebox.Type.Object({
  id: _primitives.NonEmptyString,
  name: _primitives.NonEmptyString,
  provider: _primitives.NonEmptyString,
  contextWindow: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1 })),
  reasoning: _typebox.Type.Optional(_typebox.Type.Boolean())
}, { additionalProperties: false });
const AgentSummarySchema = exports.AgentSummarySchema = _typebox.Type.Object({
  id: _primitives.NonEmptyString,
  name: _typebox.Type.Optional(_primitives.NonEmptyString),
  identity: _typebox.Type.Optional(_typebox.Type.Object({
    name: _typebox.Type.Optional(_primitives.NonEmptyString),
    theme: _typebox.Type.Optional(_primitives.NonEmptyString),
    emoji: _typebox.Type.Optional(_primitives.NonEmptyString),
    avatar: _typebox.Type.Optional(_primitives.NonEmptyString),
    avatarUrl: _typebox.Type.Optional(_primitives.NonEmptyString)
  }, { additionalProperties: false }))
}, { additionalProperties: false });
const AgentsListParamsSchema = exports.AgentsListParamsSchema = _typebox.Type.Object({}, { additionalProperties: false });
const AgentsListResultSchema = exports.AgentsListResultSchema = _typebox.Type.Object({
  defaultId: _primitives.NonEmptyString,
  mainKey: _primitives.NonEmptyString,
  scope: _typebox.Type.Union([_typebox.Type.Literal("per-sender"), _typebox.Type.Literal("global")]),
  agents: _typebox.Type.Array(AgentSummarySchema)
}, { additionalProperties: false });
const ModelsListParamsSchema = exports.ModelsListParamsSchema = _typebox.Type.Object({}, { additionalProperties: false });
const ModelsListResultSchema = exports.ModelsListResultSchema = _typebox.Type.Object({
  models: _typebox.Type.Array(ModelChoiceSchema)
}, { additionalProperties: false });
const SkillsStatusParamsSchema = exports.SkillsStatusParamsSchema = _typebox.Type.Object({}, { additionalProperties: false });
const SkillsBinsParamsSchema = exports.SkillsBinsParamsSchema = _typebox.Type.Object({}, { additionalProperties: false });
const SkillsBinsResultSchema = exports.SkillsBinsResultSchema = _typebox.Type.Object({
  bins: _typebox.Type.Array(_primitives.NonEmptyString)
}, { additionalProperties: false });
const SkillsInstallParamsSchema = exports.SkillsInstallParamsSchema = _typebox.Type.Object({
  name: _primitives.NonEmptyString,
  installId: _primitives.NonEmptyString,
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1000 }))
}, { additionalProperties: false });
const SkillsUpdateParamsSchema = exports.SkillsUpdateParamsSchema = _typebox.Type.Object({
  skillKey: _primitives.NonEmptyString,
  enabled: _typebox.Type.Optional(_typebox.Type.Boolean()),
  apiKey: _typebox.Type.Optional(_typebox.Type.String()),
  env: _typebox.Type.Optional(_typebox.Type.Record(_primitives.NonEmptyString, _typebox.Type.String()))
}, { additionalProperties: false }); /* v9-65c6cb84ca84688c */
