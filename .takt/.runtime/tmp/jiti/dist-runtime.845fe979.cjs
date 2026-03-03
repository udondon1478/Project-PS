"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.defaultRuntime = void 0;var _progressLine = require("./terminal/progress-line.js");
const defaultRuntime = exports.defaultRuntime = {
  log: (...args) => {
    (0, _progressLine.clearActiveProgressLine)();
    console.log(...args);
  },
  error: (...args) => {
    (0, _progressLine.clearActiveProgressLine)();
    console.error(...args);
  },
  exit: (code) => {
    process.exit(code);
    throw new Error("unreachable"); // satisfies tests when mocked
  }
}; /* v9-a68db7b558365039 */
