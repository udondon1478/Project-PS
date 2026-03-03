"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.loggingState = void 0;const loggingState = exports.loggingState = {
  cachedLogger: null,
  cachedSettings: null,
  cachedConsoleSettings: null,
  overrideSettings: null,
  consolePatched: false,
  forceConsoleToStderr: false,
  consoleTimestampPrefix: false,
  consoleSubsystemFilter: null,
  resolvingConsoleSettings: false,
  rawConsole: null
}; /* v9-3fb14e6144702b0d */
