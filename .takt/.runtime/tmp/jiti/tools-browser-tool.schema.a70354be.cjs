"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.BrowserToolSchema = void 0;var _typebox = require("@sinclair/typebox");
var _typebox2 = require("../schema/typebox.js");
const BROWSER_ACT_KINDS = [
"click",
"type",
"press",
"hover",
"drag",
"select",
"fill",
"resize",
"wait",
"evaluate",
"close"];

const BROWSER_TOOL_ACTIONS = [
"status",
"start",
"stop",
"profiles",
"tabs",
"open",
"focus",
"close",
"snapshot",
"screenshot",
"navigate",
"console",
"pdf",
"upload",
"dialog",
"act"];

const BROWSER_TARGETS = ["sandbox", "host", "node"];
const BROWSER_SNAPSHOT_FORMATS = ["aria", "ai"];
const BROWSER_SNAPSHOT_MODES = ["efficient"];
const BROWSER_SNAPSHOT_REFS = ["role", "aria"];
const BROWSER_IMAGE_TYPES = ["png", "jpeg"];
// NOTE: Using a flattened object schema instead of Type.Union([Type.Object(...), ...])
// because Claude API on Vertex AI rejects nested anyOf schemas as invalid JSON Schema.
// The discriminator (kind) determines which properties are relevant; runtime validates.
const BrowserActSchema = _typebox.Type.Object({
  kind: (0, _typebox2.stringEnum)(BROWSER_ACT_KINDS),
  // Common fields
  targetId: _typebox.Type.Optional(_typebox.Type.String()),
  ref: _typebox.Type.Optional(_typebox.Type.String()),
  // click
  doubleClick: _typebox.Type.Optional(_typebox.Type.Boolean()),
  button: _typebox.Type.Optional(_typebox.Type.String()),
  modifiers: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String())),
  // type
  text: _typebox.Type.Optional(_typebox.Type.String()),
  submit: _typebox.Type.Optional(_typebox.Type.Boolean()),
  slowly: _typebox.Type.Optional(_typebox.Type.Boolean()),
  // press
  key: _typebox.Type.Optional(_typebox.Type.String()),
  // drag
  startRef: _typebox.Type.Optional(_typebox.Type.String()),
  endRef: _typebox.Type.Optional(_typebox.Type.String()),
  // select
  values: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String())),
  // fill - use permissive array of objects
  fields: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.Object({}, { additionalProperties: true }))),
  // resize
  width: _typebox.Type.Optional(_typebox.Type.Number()),
  height: _typebox.Type.Optional(_typebox.Type.Number()),
  // wait
  timeMs: _typebox.Type.Optional(_typebox.Type.Number()),
  textGone: _typebox.Type.Optional(_typebox.Type.String()),
  // evaluate
  fn: _typebox.Type.Optional(_typebox.Type.String())
});
// IMPORTANT: OpenAI function tool schemas must have a top-level `type: "object"`.
// A root-level `Type.Union([...])` compiles to `{ anyOf: [...] }` (no `type`),
// which OpenAI rejects ("Invalid schema ... type: None"). Keep this schema an object.
const BrowserToolSchema = exports.BrowserToolSchema = _typebox.Type.Object({
  action: (0, _typebox2.stringEnum)(BROWSER_TOOL_ACTIONS),
  target: (0, _typebox2.optionalStringEnum)(BROWSER_TARGETS),
  node: _typebox.Type.Optional(_typebox.Type.String()),
  profile: _typebox.Type.Optional(_typebox.Type.String()),
  targetUrl: _typebox.Type.Optional(_typebox.Type.String()),
  targetId: _typebox.Type.Optional(_typebox.Type.String()),
  limit: _typebox.Type.Optional(_typebox.Type.Number()),
  maxChars: _typebox.Type.Optional(_typebox.Type.Number()),
  mode: (0, _typebox2.optionalStringEnum)(BROWSER_SNAPSHOT_MODES),
  snapshotFormat: (0, _typebox2.optionalStringEnum)(BROWSER_SNAPSHOT_FORMATS),
  refs: (0, _typebox2.optionalStringEnum)(BROWSER_SNAPSHOT_REFS),
  interactive: _typebox.Type.Optional(_typebox.Type.Boolean()),
  compact: _typebox.Type.Optional(_typebox.Type.Boolean()),
  depth: _typebox.Type.Optional(_typebox.Type.Number()),
  selector: _typebox.Type.Optional(_typebox.Type.String()),
  frame: _typebox.Type.Optional(_typebox.Type.String()),
  labels: _typebox.Type.Optional(_typebox.Type.Boolean()),
  fullPage: _typebox.Type.Optional(_typebox.Type.Boolean()),
  ref: _typebox.Type.Optional(_typebox.Type.String()),
  element: _typebox.Type.Optional(_typebox.Type.String()),
  type: (0, _typebox2.optionalStringEnum)(BROWSER_IMAGE_TYPES),
  level: _typebox.Type.Optional(_typebox.Type.String()),
  paths: _typebox.Type.Optional(_typebox.Type.Array(_typebox.Type.String())),
  inputRef: _typebox.Type.Optional(_typebox.Type.String()),
  timeoutMs: _typebox.Type.Optional(_typebox.Type.Number()),
  accept: _typebox.Type.Optional(_typebox.Type.Boolean()),
  promptText: _typebox.Type.Optional(_typebox.Type.String()),
  request: _typebox.Type.Optional(BrowserActSchema)
}); /* v9-4978f7e5b1c59881 */
