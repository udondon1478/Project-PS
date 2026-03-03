"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.validateJsonSchemaValue = validateJsonSchemaValue;var _ajv = _interopRequireDefault(require("ajv"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
const ajv = new _ajv.default({
  allErrors: true,
  strict: false,
  removeAdditional: false
});
const schemaCache = new Map();
function formatAjvErrors(errors) {
  if (!errors || errors.length === 0) {
    return ["invalid config"];
  }
  return errors.map((error) => {
    const path = error.instancePath?.replace(/^\//, "").replace(/\//g, ".") || "<root>";
    const message = error.message ?? "invalid";
    return `${path}: ${message}`;
  });
}
function validateJsonSchemaValue(params) {
  let cached = schemaCache.get(params.cacheKey);
  if (!cached || cached.schema !== params.schema) {
    const validate = ajv.compile(params.schema);
    cached = { validate, schema: params.schema };
    schemaCache.set(params.cacheKey, cached);
  }
  const ok = cached.validate(params.value);
  if (ok) {
    return { ok: true };
  }
  return { ok: false, errors: formatAjvErrors(cached.validate.errors) };
} /* v9-1a2a65c6f0550730 */
