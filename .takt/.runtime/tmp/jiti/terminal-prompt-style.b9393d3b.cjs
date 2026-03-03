"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.stylePromptTitle = exports.stylePromptMessage = exports.stylePromptHint = void 0;var _theme = require("./theme.js");
const stylePromptMessage = (message) => (0, _theme.isRich)() ? _theme.theme.accent(message) : message;exports.stylePromptMessage = stylePromptMessage;
const stylePromptTitle = (title) => title && (0, _theme.isRich)() ? _theme.theme.heading(title) : title;exports.stylePromptTitle = stylePromptTitle;
const stylePromptHint = (hint) => hint && (0, _theme.isRich)() ? _theme.theme.muted(hint) : hint;exports.stylePromptHint = stylePromptHint; /* v9-3a08d5663a731424 */
