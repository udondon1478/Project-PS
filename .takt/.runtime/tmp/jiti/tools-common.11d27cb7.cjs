"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createActionGate = createActionGate;exports.imageResult = imageResult;exports.imageResultFromFile = imageResultFromFile;exports.jsonResult = jsonResult;exports.readNumberParam = readNumberParam;exports.readReactionParams = readReactionParams;exports.readStringArrayParam = readStringArrayParam;exports.readStringOrNumberParam = readStringOrNumberParam;exports.readStringParam = readStringParam;var _promises = _interopRequireDefault(require("node:fs/promises"));
var _mime = require("../../media/mime.js");
var _toolImages = require("../tool-images.js");function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function createActionGate(actions) {
  return (key, defaultValue = true) => {
    const value = actions?.[key];
    if (value === undefined) {
      return defaultValue;
    }
    return value !== false;
  };
}
function readStringParam(params, key, options = {}) {
  const { required = false, trim = true, label = key, allowEmpty = false } = options;
  const raw = params[key];
  if (typeof raw !== "string") {
    if (required) {
      throw new Error(`${label} required`);
    }
    return undefined;
  }
  const value = trim ? raw.trim() : raw;
  if (!value && !allowEmpty) {
    if (required) {
      throw new Error(`${label} required`);
    }
    return undefined;
  }
  return value;
}
function readStringOrNumberParam(params, key, options = {}) {
  const { required = false, label = key } = options;
  const raw = params[key];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  if (typeof raw === "string") {
    const value = raw.trim();
    if (value) {
      return value;
    }
  }
  if (required) {
    throw new Error(`${label} required`);
  }
  return undefined;
}
function readNumberParam(params, key, options = {}) {
  const { required = false, label = key, integer = false } = options;
  const raw = params[key];
  let value;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    value = raw;
  } else
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed) {
      const parsed = Number.parseFloat(trimmed);
      if (Number.isFinite(parsed)) {
        value = parsed;
      }
    }
  }
  if (value === undefined) {
    if (required) {
      throw new Error(`${label} required`);
    }
    return undefined;
  }
  return integer ? Math.trunc(value) : value;
}
function readStringArrayParam(params, key, options = {}) {
  const { required = false, label = key } = options;
  const raw = params[key];
  if (Array.isArray(raw)) {
    const values = raw.
    filter((entry) => typeof entry === "string").
    map((entry) => entry.trim()).
    filter(Boolean);
    if (values.length === 0) {
      if (required) {
        throw new Error(`${label} required`);
      }
      return undefined;
    }
    return values;
  }
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) {
      if (required) {
        throw new Error(`${label} required`);
      }
      return undefined;
    }
    return [value];
  }
  if (required) {
    throw new Error(`${label} required`);
  }
  return undefined;
}
function readReactionParams(params, options) {
  const emojiKey = options.emojiKey ?? "emoji";
  const removeKey = options.removeKey ?? "remove";
  const remove = typeof params[removeKey] === "boolean" ? params[removeKey] : false;
  const emoji = readStringParam(params, emojiKey, {
    required: true,
    allowEmpty: true
  });
  if (remove && !emoji) {
    throw new Error(options.removeErrorMessage);
  }
  return { emoji, remove, isEmpty: !emoji };
}
function jsonResult(payload) {
  return {
    content: [
    {
      type: "text",
      text: JSON.stringify(payload, null, 2)
    }],

    details: payload
  };
}
async function imageResult(params) {
  const content = [
  {
    type: "text",
    text: params.extraText ?? `MEDIA:${params.path}`
  },
  {
    type: "image",
    data: params.base64,
    mimeType: params.mimeType
  }];

  const result = {
    content,
    details: { path: params.path, ...params.details }
  };
  return await (0, _toolImages.sanitizeToolResultImages)(result, params.label);
}
async function imageResultFromFile(params) {
  const buf = await _promises.default.readFile(params.path);
  const mimeType = (await (0, _mime.detectMime)({ buffer: buf.slice(0, 256) })) ?? "image/png";
  return await imageResult({
    label: params.label,
    path: params.path,
    base64: buf.toString("base64"),
    mimeType,
    extraText: params.extraText,
    details: params.details
  });
} /* v9-b9f0f8ed90faa07a */
