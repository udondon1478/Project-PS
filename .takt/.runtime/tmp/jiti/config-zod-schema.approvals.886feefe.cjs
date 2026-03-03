"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ApprovalsSchema = void 0;var _zod = require("zod");
const ExecApprovalForwardTargetSchema = _zod.z.
object({
  channel: _zod.z.string().min(1),
  to: _zod.z.string().min(1),
  accountId: _zod.z.string().optional(),
  threadId: _zod.z.union([_zod.z.string(), _zod.z.number()]).optional()
}).
strict();
const ExecApprovalForwardingSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  mode: _zod.z.union([_zod.z.literal("session"), _zod.z.literal("targets"), _zod.z.literal("both")]).optional(),
  agentFilter: _zod.z.array(_zod.z.string()).optional(),
  sessionFilter: _zod.z.array(_zod.z.string()).optional(),
  targets: _zod.z.array(ExecApprovalForwardTargetSchema).optional()
}).
strict().
optional();
const ApprovalsSchema = exports.ApprovalsSchema = _zod.z.
object({
  exec: ExecApprovalForwardingSchema
}).
strict().
optional(); /* v9-863a8396062f67c2 */
