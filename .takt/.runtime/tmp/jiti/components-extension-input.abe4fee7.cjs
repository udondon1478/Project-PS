"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ExtensionInputComponent = void 0;


var _piTui = require("@mariozechner/pi-tui");
var _theme = require("../theme/theme.js");
var _countdownTimer = require("./countdown-timer.js");
var _dynamicBorder = require("./dynamic-border.js");
var _keybindingHints = require("./keybinding-hints.js"); /**
 * Simple text input component for extensions.
 */class ExtensionInputComponent extends _piTui.Container {input;
  onSubmitCallback;
  onCancelCallback;
  titleText;
  baseTitle;
  countdown;
  // Focusable implementation - propagate to input for IME cursor positioning
  _focused = false;
  get focused() {
    return this._focused;
  }
  set focused(value) {
    this._focused = value;
    this.input.focused = value;
  }
  constructor(title, _placeholder, onSubmit, onCancel, opts) {
    super();
    this.onSubmitCallback = onSubmit;
    this.onCancelCallback = onCancel;
    this.baseTitle = title;
    this.addChild(new _dynamicBorder.DynamicBorder());
    this.addChild(new _piTui.Spacer(1));
    this.titleText = new _piTui.Text(_theme.theme.fg("accent", title), 1, 0);
    this.addChild(this.titleText);
    this.addChild(new _piTui.Spacer(1));
    if (opts?.timeout && opts.timeout > 0 && opts.tui) {
      this.countdown = new _countdownTimer.CountdownTimer(opts.timeout, opts.tui, (s) => this.titleText.setText(_theme.theme.fg("accent", `${this.baseTitle} (${s}s)`)), () => this.onCancelCallback());
    }
    this.input = new _piTui.Input();
    this.addChild(this.input);
    this.addChild(new _piTui.Spacer(1));
    this.addChild(new _piTui.Text(`${(0, _keybindingHints.keyHint)("selectConfirm", "submit")}  ${(0, _keybindingHints.keyHint)("selectCancel", "cancel")}`, 1, 0));
    this.addChild(new _piTui.Spacer(1));
    this.addChild(new _dynamicBorder.DynamicBorder());
  }
  handleInput(keyData) {
    const kb = (0, _piTui.getEditorKeybindings)();
    if (kb.matches(keyData, "selectConfirm") || keyData === "\n") {
      this.onSubmitCallback(this.input.getValue());
    } else
    if (kb.matches(keyData, "selectCancel")) {
      this.onCancelCallback();
    } else
    {
      this.input.handleInput(keyData);
    }
  }
  dispose() {
    this.countdown?.dispose();
  }
}exports.ExtensionInputComponent = ExtensionInputComponent; /* v9-ac72b6cba1e0a791 */
