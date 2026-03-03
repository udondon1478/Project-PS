"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.InternalHooksSchema = exports.InternalHookHandlerSchema = exports.HooksGmailSchema = exports.HookMappingSchema = void 0;var _zod = require("zod");
const HookMappingSchema = exports.HookMappingSchema = _zod.z.
object({
  id: _zod.z.string().optional(),
  match: _zod.z.
  object({
    path: _zod.z.string().optional(),
    source: _zod.z.string().optional()
  }).
  optional(),
  action: _zod.z.union([_zod.z.literal("wake"), _zod.z.literal("agent")]).optional(),
  wakeMode: _zod.z.union([_zod.z.literal("now"), _zod.z.literal("next-heartbeat")]).optional(),
  name: _zod.z.string().optional(),
  sessionKey: _zod.z.string().optional(),
  messageTemplate: _zod.z.string().optional(),
  textTemplate: _zod.z.string().optional(),
  deliver: _zod.z.boolean().optional(),
  allowUnsafeExternalContent: _zod.z.boolean().optional(),
  channel: _zod.z.
  union([
  _zod.z.literal("last"),
  _zod.z.literal("whatsapp"),
  _zod.z.literal("telegram"),
  _zod.z.literal("discord"),
  _zod.z.literal("slack"),
  _zod.z.literal("signal"),
  _zod.z.literal("imessage"),
  _zod.z.literal("msteams")]
  ).
  optional(),
  to: _zod.z.string().optional(),
  model: _zod.z.string().optional(),
  thinking: _zod.z.string().optional(),
  timeoutSeconds: _zod.z.number().int().positive().optional(),
  transform: _zod.z.
  object({
    module: _zod.z.string(),
    export: _zod.z.string().optional()
  }).
  strict().
  optional()
}).
strict().
optional();
const InternalHookHandlerSchema = exports.InternalHookHandlerSchema = _zod.z.
object({
  event: _zod.z.string(),
  module: _zod.z.string(),
  export: _zod.z.string().optional()
}).
strict();
const HookConfigSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  env: _zod.z.record(_zod.z.string(), _zod.z.string()).optional()
}).
strict();
const HookInstallRecordSchema = _zod.z.
object({
  source: _zod.z.union([_zod.z.literal("npm"), _zod.z.literal("archive"), _zod.z.literal("path")]),
  spec: _zod.z.string().optional(),
  sourcePath: _zod.z.string().optional(),
  installPath: _zod.z.string().optional(),
  version: _zod.z.string().optional(),
  installedAt: _zod.z.string().optional(),
  hooks: _zod.z.array(_zod.z.string()).optional()
}).
strict();
const InternalHooksSchema = exports.InternalHooksSchema = _zod.z.
object({
  enabled: _zod.z.boolean().optional(),
  handlers: _zod.z.array(InternalHookHandlerSchema).optional(),
  entries: _zod.z.record(_zod.z.string(), HookConfigSchema).optional(),
  load: _zod.z.
  object({
    extraDirs: _zod.z.array(_zod.z.string()).optional()
  }).
  strict().
  optional(),
  installs: _zod.z.record(_zod.z.string(), HookInstallRecordSchema).optional()
}).
strict().
optional();
const HooksGmailSchema = exports.HooksGmailSchema = _zod.z.
object({
  account: _zod.z.string().optional(),
  label: _zod.z.string().optional(),
  topic: _zod.z.string().optional(),
  subscription: _zod.z.string().optional(),
  pushToken: _zod.z.string().optional(),
  hookUrl: _zod.z.string().optional(),
  includeBody: _zod.z.boolean().optional(),
  maxBytes: _zod.z.number().int().positive().optional(),
  renewEveryMinutes: _zod.z.number().int().positive().optional(),
  allowUnsafeExternalContent: _zod.z.boolean().optional(),
  serve: _zod.z.
  object({
    bind: _zod.z.string().optional(),
    port: _zod.z.number().int().positive().optional(),
    path: _zod.z.string().optional()
  }).
  strict().
  optional(),
  tailscale: _zod.z.
  object({
    mode: _zod.z.union([_zod.z.literal("off"), _zod.z.literal("serve"), _zod.z.literal("funnel")]).optional(),
    path: _zod.z.string().optional(),
    target: _zod.z.string().optional()
  }).
  strict().
  optional(),
  model: _zod.z.string().optional(),
  thinking: _zod.z.
  union([
  _zod.z.literal("off"),
  _zod.z.literal("minimal"),
  _zod.z.literal("low"),
  _zod.z.literal("medium"),
  _zod.z.literal("high")]
  ).
  optional()
}).
strict().
optional(); /* v9-99fb5e07d390f230 */
