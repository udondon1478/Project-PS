"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ChannelHeartbeatVisibilitySchema = void 0;var _zod = require("zod");
const ChannelHeartbeatVisibilitySchema = exports.ChannelHeartbeatVisibilitySchema = _zod.z.
object({
  showOk: _zod.z.boolean().optional(),
  showAlerts: _zod.z.boolean().optional(),
  useIndicator: _zod.z.boolean().optional()
}).
strict().
optional(); /* v9-2aa0580bc7071c96 */
