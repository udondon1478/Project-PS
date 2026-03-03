"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Loader = void 0;var _text = require("./text.js");
/**
 * Loader component that updates every 80ms with spinning animation
 */
class Loader extends _text.Text {
  spinnerColorFn;
  messageColorFn;
  message;
  frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  currentFrame = 0;
  intervalId = null;
  ui = null;
  constructor(ui, spinnerColorFn, messageColorFn, message = "Loading...") {
    super("", 1, 0);
    this.spinnerColorFn = spinnerColorFn;
    this.messageColorFn = messageColorFn;
    this.message = message;
    this.ui = ui;
    this.start();
  }
  render(width) {
    return ["", ...super.render(width)];
  }
  start() {
    this.updateDisplay();
    this.intervalId = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.updateDisplay();
    }, 80);
  }
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  setMessage(message) {
    this.message = message;
    this.updateDisplay();
  }
  updateDisplay() {
    const frame = this.frames[this.currentFrame];
    this.setText(`${this.spinnerColorFn(frame)} ${this.messageColorFn(this.message)}`);
    if (this.ui) {
      this.ui.requestRender();
    }
  }
}exports.Loader = Loader; /* v9-638f49745c00146c */
