"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.channelTargetSchema = channelTargetSchema;exports.channelTargetsSchema = channelTargetsSchema;exports.optionalStringEnum = optionalStringEnum;exports.stringEnum = stringEnum;var _typebox = require("@sinclair/typebox");
var _channelTarget = require("../../infra/outbound/channel-target.js");
// NOTE: Avoid Type.Union([Type.Literal(...)]) which compiles to anyOf.
// Some providers reject anyOf in tool schemas; a flat string enum is safer.
function stringEnum(values, options = {}) {
  return _typebox.Type.Unsafe({
    type: "string",
    enum: [...values],
    ...options
  });
}
function optionalStringEnum(values, options = {}) {
  return _typebox.Type.Optional(stringEnum(values, options));
}
function channelTargetSchema(options) {
  return _typebox.Type.String({
    description: options?.description ?? _channelTarget.CHANNEL_TARGET_DESCRIPTION
  });
}
function channelTargetsSchema(options) {
  return _typebox.Type.Array(channelTargetSchema({ description: options?.description ?? _channelTarget.CHANNEL_TARGETS_DESCRIPTION }));
} /* v9-6246b69c8057eaa2 */
