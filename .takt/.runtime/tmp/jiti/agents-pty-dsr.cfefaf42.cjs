"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildCursorPositionResponse = buildCursorPositionResponse;exports.stripDsrRequests = stripDsrRequests;const ESC = String.fromCharCode(0x1b);
const DSR_PATTERN = new RegExp(`${ESC}\\[\\??6n`, "g");
function stripDsrRequests(input) {
  let requests = 0;
  const cleaned = input.replace(DSR_PATTERN, () => {
    requests += 1;
    return "";
  });
  return { cleaned, requests };
}
function buildCursorPositionResponse(row = 1, col = 1) {
  return `\x1b[${row};${col}R`;
} /* v9-4ec45cb2808b3610 */
