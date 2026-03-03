"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.appKey = appKey;exports.appKeyHint = appKeyHint;exports.editorKey = editorKey;exports.keyHint = keyHint;exports.rawKeyHint = rawKeyHint;


var _piTui = require("@mariozechner/pi-tui");
var _theme = require("../theme/theme.js"); /**
 * Utilities for formatting keybinding hints in the UI.
 */ /**
 * Format keys array as display string (e.g., ["ctrl+c", "escape"] -> "ctrl+c/escape").
 */function formatKeys(keys) {
  if (keys.length === 0)
  return "";
  if (keys.length === 1)
  return keys[0];
  return keys.join("/");
}
/**
 * Get display string for an editor action.
 */
function editorKey(action) {
  return formatKeys((0, _piTui.getEditorKeybindings)().getKeys(action));
}
/**
 * Get display string for an app action.
 */
function appKey(keybindings, action) {
  return formatKeys(keybindings.getKeys(action));
}
/**
 * Format a keybinding hint with consistent styling: dim key, muted description.
 * Looks up the key from editor keybindings automatically.
 *
 * @param action - Editor action name (e.g., "selectConfirm", "expandTools")
 * @param description - Description text (e.g., "to expand", "cancel")
 * @returns Formatted string with dim key and muted description
 */
function keyHint(action, description) {
  return _theme.theme.fg("dim", editorKey(action)) + _theme.theme.fg("muted", ` ${description}`);
}
/**
 * Format a keybinding hint for app-level actions.
 * Requires the KeybindingsManager instance.
 *
 * @param keybindings - KeybindingsManager instance
 * @param action - App action name (e.g., "interrupt", "externalEditor")
 * @param description - Description text
 * @returns Formatted string with dim key and muted description
 */
function appKeyHint(keybindings, action, description) {
  return _theme.theme.fg("dim", appKey(keybindings, action)) + _theme.theme.fg("muted", ` ${description}`);
}
/**
 * Format a raw key string with description (for non-configurable keys like ↑↓).
 *
 * @param key - Raw key string
 * @param description - Description text
 * @returns Formatted string with dim key and muted description
 */
function rawKeyHint(key, description) {
  return _theme.theme.fg("dim", key) + _theme.theme.fg("muted", ` ${description}`);
} /* v9-b9ef3627aefba93b */
