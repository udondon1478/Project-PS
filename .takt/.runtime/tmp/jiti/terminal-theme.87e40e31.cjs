"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.theme = exports.isRich = exports.colorize = void 0;var _chalk = _interopRequireWildcard(require("chalk"));
var _palette = require("./palette.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
const hasForceColor = typeof process.env.FORCE_COLOR === "string" &&
process.env.FORCE_COLOR.trim().length > 0 &&
process.env.FORCE_COLOR.trim() !== "0";
const baseChalk = process.env.NO_COLOR && !hasForceColor ? new _chalk.Chalk({ level: 0 }) : _chalk.default;
const hex = (value) => baseChalk.hex(value);
const theme = exports.theme = {
  accent: hex(_palette.LOBSTER_PALETTE.accent),
  accentBright: hex(_palette.LOBSTER_PALETTE.accentBright),
  accentDim: hex(_palette.LOBSTER_PALETTE.accentDim),
  info: hex(_palette.LOBSTER_PALETTE.info),
  success: hex(_palette.LOBSTER_PALETTE.success),
  warn: hex(_palette.LOBSTER_PALETTE.warn),
  error: hex(_palette.LOBSTER_PALETTE.error),
  muted: hex(_palette.LOBSTER_PALETTE.muted),
  heading: baseChalk.bold.hex(_palette.LOBSTER_PALETTE.accent),
  command: hex(_palette.LOBSTER_PALETTE.accentBright),
  option: hex(_palette.LOBSTER_PALETTE.warn)
};
const isRich = () => Boolean(baseChalk.level > 0);exports.isRich = isRich;
const colorize = (rich, color, value) => rich ? color(value) : value;exports.colorize = colorize; /* v9-1a07639a3860c649 */
