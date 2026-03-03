"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.LineConfigSchema = void 0;var _zod = require("zod");
const DmPolicySchema = _zod.z.enum(["open", "allowlist", "pairing", "disabled"]);
const GroupPolicySchema = _zod.z.enum(["open", "allowlist", "disabled"]);
const LineGroupConfigSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  allowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  requireMention: _zod.z.boolean().optional(),
  systemPrompt: _zod.z.string().optional(),
  skills: _zod.z.array(_zod.z.string()).optional()
}).
strict();
const LineAccountConfigSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  channelAccessToken: _zod.z.string().optional(),
  channelSecret: _zod.z.string().optional(),
  tokenFile: _zod.z.string().optional(),
  secretFile: _zod.z.string().optional(),
  name: _zod.z.string().optional(),
  allowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  groupAllowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  dmPolicy: DmPolicySchema.optional().default("pairing"),
  groupPolicy: GroupPolicySchema.optional().default("allowlist"),
  mediaMaxMb: _zod.z.number().optional(),
  webhookPath: _zod.z.string().optional(),
  groups: _zod.z.record(_zod.z.string(), LineGroupConfigSchema.optional()).optional()
}).
strict();
const LineConfigSchema = exports.LineConfigSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  channelAccessToken: _zod.z.string().optional(),
  channelSecret: _zod.z.string().optional(),
  tokenFile: _zod.z.string().optional(),
  secretFile: _zod.z.string().optional(),
  name: _zod.z.string().optional(),
  allowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  groupAllowFrom: _zod.z.array(_zod.z.union([_zod.z.string(), _zod.z.number()])).optional(),
  dmPolicy: DmPolicySchema.optional().default("pairing"),
  groupPolicy: GroupPolicySchema.optional().default("allowlist"),
  mediaMaxMb: _zod.z.number().optional(),
  webhookPath: _zod.z.string().optional(),
  accounts: _zod.z.record(_zod.z.string(), LineAccountConfigSchema.optional()).optional(),
  groups: _zod.z.record(_zod.z.string(), LineGroupConfigSchema.optional()).optional()
}).
strict(); /* v9-4753d29a4d549834 */
