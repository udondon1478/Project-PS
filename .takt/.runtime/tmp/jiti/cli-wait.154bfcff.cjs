"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.waitForever = waitForever;function waitForever() {
  // Keep event loop alive via an unref'ed interval plus a pending promise.
  const interval = setInterval(() => {}, 1_000_000);
  interval.unref();
  return new Promise(() => {

    /* never resolve */});
} /* v9-53b8d6144263a66f */
