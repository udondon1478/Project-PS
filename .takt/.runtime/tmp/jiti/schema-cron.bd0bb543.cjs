"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.CronUpdateParamsSchema = exports.CronStatusParamsSchema = exports.CronScheduleSchema = exports.CronRunsParamsSchema = exports.CronRunParamsSchema = exports.CronRunLogEntrySchema = exports.CronRemoveParamsSchema = exports.CronPayloadSchema = exports.CronPayloadPatchSchema = exports.CronListParamsSchema = exports.CronJobStateSchema = exports.CronJobSchema = exports.CronJobPatchSchema = exports.CronIsolationSchema = exports.CronAddParamsSchema = void 0;var _typebox = require("@sinclair/typebox");
var _primitives = require("./primitives.js");
const CronScheduleSchema = exports.CronScheduleSchema = _typebox.Type.Union([
_typebox.Type.Object({
  kind: _typebox.Type.Literal("at"),
  atMs: _typebox.Type.Integer({ minimum: 0 })
}, { additionalProperties: false }),
_typebox.Type.Object({
  kind: _typebox.Type.Literal("every"),
  everyMs: _typebox.Type.Integer({ minimum: 1 }),
  anchorMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 }))
}, { additionalProperties: false }),
_typebox.Type.Object({
  kind: _typebox.Type.Literal("cron"),
  expr: _primitives.NonEmptyString,
  tz: _typebox.Type.Optional(_typebox.Type.String())
}, { additionalProperties: false })]
);
const CronPayloadSchema = exports.CronPayloadSchema = _typebox.Type.Union([
_typebox.Type.Object({
  kind: _typebox.Type.Literal("systemEvent"),
  text: _primitives.NonEmptyString
}, { additionalProperties: false }),
_typebox.Type.Object({
  kind: _typebox.Type.Literal("agentTurn"),
  message: _primitives.NonEmptyString,
  model: _typebox.Type.Optional(_typebox.Type.String()),
  thinking: _typebox.Type.Optional(_typebox.Type.String()),
  timeoutSeconds: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1 })),
  deliver: _typebox.Type.Optional(_typebox.Type.Boolean()),
  channel: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("last"), _primitives.NonEmptyString])),
  to: _typebox.Type.Optional(_typebox.Type.String()),
  bestEffortDeliver: _typebox.Type.Optional(_typebox.Type.Boolean())
}, { additionalProperties: false })]
);
const CronPayloadPatchSchema = exports.CronPayloadPatchSchema = _typebox.Type.Union([
_typebox.Type.Object({
  kind: _typebox.Type.Literal("systemEvent"),
  text: _typebox.Type.Optional(_primitives.NonEmptyString)
}, { additionalProperties: false }),
_typebox.Type.Object({
  kind: _typebox.Type.Literal("agentTurn"),
  message: _typebox.Type.Optional(_primitives.NonEmptyString),
  model: _typebox.Type.Optional(_typebox.Type.String()),
  thinking: _typebox.Type.Optional(_typebox.Type.String()),
  timeoutSeconds: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1 })),
  deliver: _typebox.Type.Optional(_typebox.Type.Boolean()),
  channel: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("last"), _primitives.NonEmptyString])),
  to: _typebox.Type.Optional(_typebox.Type.String()),
  bestEffortDeliver: _typebox.Type.Optional(_typebox.Type.Boolean())
}, { additionalProperties: false })]
);
const CronIsolationSchema = exports.CronIsolationSchema = _typebox.Type.Object({
  postToMainPrefix: _typebox.Type.Optional(_typebox.Type.String()),
  postToMainMode: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("summary"), _typebox.Type.Literal("full")])),
  postToMainMaxChars: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 }))
}, { additionalProperties: false });
const CronJobStateSchema = exports.CronJobStateSchema = _typebox.Type.Object({
  nextRunAtMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  runningAtMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  lastRunAtMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  lastStatus: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("ok"), _typebox.Type.Literal("error"), _typebox.Type.Literal("skipped")])),
  lastError: _typebox.Type.Optional(_typebox.Type.String()),
  lastDurationMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 }))
}, { additionalProperties: false });
const CronJobSchema = exports.CronJobSchema = _typebox.Type.Object({
  id: _primitives.NonEmptyString,
  agentId: _typebox.Type.Optional(_primitives.NonEmptyString),
  name: _primitives.NonEmptyString,
  description: _typebox.Type.Optional(_typebox.Type.String()),
  enabled: _typebox.Type.Boolean(),
  deleteAfterRun: _typebox.Type.Optional(_typebox.Type.Boolean()),
  createdAtMs: _typebox.Type.Integer({ minimum: 0 }),
  updatedAtMs: _typebox.Type.Integer({ minimum: 0 }),
  schedule: CronScheduleSchema,
  sessionTarget: _typebox.Type.Union([_typebox.Type.Literal("main"), _typebox.Type.Literal("isolated")]),
  wakeMode: _typebox.Type.Union([_typebox.Type.Literal("next-heartbeat"), _typebox.Type.Literal("now")]),
  payload: CronPayloadSchema,
  isolation: _typebox.Type.Optional(CronIsolationSchema),
  state: CronJobStateSchema
}, { additionalProperties: false });
const CronListParamsSchema = exports.CronListParamsSchema = _typebox.Type.Object({
  includeDisabled: _typebox.Type.Optional(_typebox.Type.Boolean())
}, { additionalProperties: false });
const CronStatusParamsSchema = exports.CronStatusParamsSchema = _typebox.Type.Object({}, { additionalProperties: false });
const CronAddParamsSchema = exports.CronAddParamsSchema = _typebox.Type.Object({
  name: _primitives.NonEmptyString,
  agentId: _typebox.Type.Optional(_typebox.Type.Union([_primitives.NonEmptyString, _typebox.Type.Null()])),
  description: _typebox.Type.Optional(_typebox.Type.String()),
  enabled: _typebox.Type.Optional(_typebox.Type.Boolean()),
  deleteAfterRun: _typebox.Type.Optional(_typebox.Type.Boolean()),
  schedule: CronScheduleSchema,
  sessionTarget: _typebox.Type.Union([_typebox.Type.Literal("main"), _typebox.Type.Literal("isolated")]),
  wakeMode: _typebox.Type.Union([_typebox.Type.Literal("next-heartbeat"), _typebox.Type.Literal("now")]),
  payload: CronPayloadSchema,
  isolation: _typebox.Type.Optional(CronIsolationSchema)
}, { additionalProperties: false });
const CronJobPatchSchema = exports.CronJobPatchSchema = _typebox.Type.Object({
  name: _typebox.Type.Optional(_primitives.NonEmptyString),
  agentId: _typebox.Type.Optional(_typebox.Type.Union([_primitives.NonEmptyString, _typebox.Type.Null()])),
  description: _typebox.Type.Optional(_typebox.Type.String()),
  enabled: _typebox.Type.Optional(_typebox.Type.Boolean()),
  deleteAfterRun: _typebox.Type.Optional(_typebox.Type.Boolean()),
  schedule: _typebox.Type.Optional(CronScheduleSchema),
  sessionTarget: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("main"), _typebox.Type.Literal("isolated")])),
  wakeMode: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("next-heartbeat"), _typebox.Type.Literal("now")])),
  payload: _typebox.Type.Optional(CronPayloadPatchSchema),
  isolation: _typebox.Type.Optional(CronIsolationSchema),
  state: _typebox.Type.Optional(_typebox.Type.Partial(CronJobStateSchema))
}, { additionalProperties: false });
const CronUpdateParamsSchema = exports.CronUpdateParamsSchema = _typebox.Type.Union([
_typebox.Type.Object({
  id: _primitives.NonEmptyString,
  patch: CronJobPatchSchema
}, { additionalProperties: false }),
_typebox.Type.Object({
  jobId: _primitives.NonEmptyString,
  patch: CronJobPatchSchema
}, { additionalProperties: false })]
);
const CronRemoveParamsSchema = exports.CronRemoveParamsSchema = _typebox.Type.Union([
_typebox.Type.Object({
  id: _primitives.NonEmptyString
}, { additionalProperties: false }),
_typebox.Type.Object({
  jobId: _primitives.NonEmptyString
}, { additionalProperties: false })]
);
const CronRunParamsSchema = exports.CronRunParamsSchema = _typebox.Type.Union([
_typebox.Type.Object({
  id: _primitives.NonEmptyString,
  mode: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("due"), _typebox.Type.Literal("force")]))
}, { additionalProperties: false }),
_typebox.Type.Object({
  jobId: _primitives.NonEmptyString,
  mode: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("due"), _typebox.Type.Literal("force")]))
}, { additionalProperties: false })]
);
const CronRunsParamsSchema = exports.CronRunsParamsSchema = _typebox.Type.Union([
_typebox.Type.Object({
  id: _primitives.NonEmptyString,
  limit: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1, maximum: 5000 }))
}, { additionalProperties: false }),
_typebox.Type.Object({
  jobId: _primitives.NonEmptyString,
  limit: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 1, maximum: 5000 }))
}, { additionalProperties: false })]
);
const CronRunLogEntrySchema = exports.CronRunLogEntrySchema = _typebox.Type.Object({
  ts: _typebox.Type.Integer({ minimum: 0 }),
  jobId: _primitives.NonEmptyString,
  action: _typebox.Type.Literal("finished"),
  status: _typebox.Type.Optional(_typebox.Type.Union([_typebox.Type.Literal("ok"), _typebox.Type.Literal("error"), _typebox.Type.Literal("skipped")])),
  error: _typebox.Type.Optional(_typebox.Type.String()),
  summary: _typebox.Type.Optional(_typebox.Type.String()),
  runAtMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  durationMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 })),
  nextRunAtMs: _typebox.Type.Optional(_typebox.Type.Integer({ minimum: 0 }))
}, { additionalProperties: false }); /* v9-e9c7fd01819e3f2b */
