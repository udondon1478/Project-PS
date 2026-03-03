"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.parseStreamingJson = parseStreamingJson;var _partialJson = require("partial-json");
/**
 * Attempts to parse potentially incomplete JSON during streaming.
 * Always returns a valid object, even if the JSON is incomplete.
 *
 * @param partialJson The partial JSON string from streaming
 * @returns Parsed object or empty object if parsing fails
 */
function parseStreamingJson(partialJson) {
  if (!partialJson || partialJson.trim() === "") {
    return {};
  }
  // Try standard parsing first (fastest for complete JSON)
  try {
    return JSON.parse(partialJson);
  }
  catch {
    // Try partial-json for incomplete JSON
    try {
      const result = (0, _partialJson.parse)(partialJson);
      return result ?? {};
    }
    catch {
      // If all parsing fails, return empty object
      return {};
    }
  }
} /* v9-f1f4c89bc2c91be5 */
