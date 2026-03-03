"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = stripAnsi;var _ansiRegex = _interopRequireDefault(require("ansi-regex"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}

const regex = (0, _ansiRegex.default)();

function stripAnsi(string) {
  if (typeof string !== 'string') {
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  }

  // Even though the regex is global, we don't need to reset the `.lastIndex`
  // because unlike `.exec()` and `.test()`, `.replace()` does it automatically
  // and doing it manually has a performance penalty.
  return string.replace(regex, '');
} /* v9-a6fc9ab578293c89 */
