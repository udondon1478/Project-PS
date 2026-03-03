"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.UserMessageComponent = void 0;var _piTui = require("@mariozechner/pi-tui");
var _theme = require("../theme/theme.js");
/**
 * Component that renders a user message
 */
class UserMessageComponent extends _piTui.Container {
  constructor(text, markdownTheme = (0, _theme.getMarkdownTheme)()) {
    super();
    this.addChild(new _piTui.Spacer(1));
    this.addChild(new _piTui.Markdown(text, 1, 1, markdownTheme, {
      bgColor: (text) => _theme.theme.bg("userMessageBg", text),
      color: (text) => _theme.theme.fg("userMessageText", text)
    }));
  }
}exports.UserMessageComponent = UserMessageComponent; /* v9-be8dcb140669c36a */
