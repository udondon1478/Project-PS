"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.whatsappOutboundLog = exports.whatsappLog = exports.whatsappInboundLog = exports.whatsappHeartbeatLog = void 0;var _subsystem = require("../../logging/subsystem.js");
const whatsappLog = exports.whatsappLog = (0, _subsystem.createSubsystemLogger)("gateway/channels/whatsapp");
const whatsappInboundLog = exports.whatsappInboundLog = whatsappLog.child("inbound");
const whatsappOutboundLog = exports.whatsappOutboundLog = whatsappLog.child("outbound");
const whatsappHeartbeatLog = exports.whatsappHeartbeatLog = whatsappLog.child("heartbeat"); /* v9-651b0039eadd9edd */
