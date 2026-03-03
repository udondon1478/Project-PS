"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.OAuthSelectorComponent = void 0;var _piAi = require("@mariozechner/pi-ai");
var _piTui = require("@mariozechner/pi-tui");
var _theme = require("../theme/theme.js");
var _dynamicBorder = require("./dynamic-border.js");
/**
 * Component that renders an OAuth provider selector
 */
class OAuthSelectorComponent extends _piTui.Container {
  listContainer;
  allProviders = [];
  selectedIndex = 0;
  mode;
  authStorage;
  onSelectCallback;
  onCancelCallback;
  constructor(mode, authStorage, onSelect, onCancel) {
    super();
    this.mode = mode;
    this.authStorage = authStorage;
    this.onSelectCallback = onSelect;
    this.onCancelCallback = onCancel;
    // Load all OAuth providers
    this.loadProviders();
    // Add top border
    this.addChild(new _dynamicBorder.DynamicBorder());
    this.addChild(new _piTui.Spacer(1));
    // Add title
    const title = mode === "login" ? "Select provider to login:" : "Select provider to logout:";
    this.addChild(new _piTui.TruncatedText(_theme.theme.bold(title)));
    this.addChild(new _piTui.Spacer(1));
    // Create list container
    this.listContainer = new _piTui.Container();
    this.addChild(this.listContainer);
    this.addChild(new _piTui.Spacer(1));
    // Add bottom border
    this.addChild(new _dynamicBorder.DynamicBorder());
    // Initial render
    this.updateList();
  }
  loadProviders() {
    this.allProviders = (0, _piAi.getOAuthProviders)();
  }
  updateList() {
    this.listContainer.clear();
    for (let i = 0; i < this.allProviders.length; i++) {
      const provider = this.allProviders[i];
      if (!provider)
      continue;
      const isSelected = i === this.selectedIndex;
      // Check if user is logged in for this provider
      const credentials = this.authStorage.get(provider.id);
      const isLoggedIn = credentials?.type === "oauth";
      const statusIndicator = isLoggedIn ? _theme.theme.fg("success", " ✓ logged in") : "";
      let line = "";
      if (isSelected) {
        const prefix = _theme.theme.fg("accent", "→ ");
        const text = _theme.theme.fg("accent", provider.name);
        line = prefix + text + statusIndicator;
      } else
      {
        const text = `  ${provider.name}`;
        line = text + statusIndicator;
      }
      this.listContainer.addChild(new _piTui.TruncatedText(line, 0, 0));
    }
    // Show "no providers" if empty
    if (this.allProviders.length === 0) {
      const message = this.mode === "login" ? "No OAuth providers available" : "No OAuth providers logged in. Use /login first.";
      this.listContainer.addChild(new _piTui.TruncatedText(_theme.theme.fg("muted", `  ${message}`), 0, 0));
    }
  }
  handleInput(keyData) {
    const kb = (0, _piTui.getEditorKeybindings)();
    // Up arrow
    if (kb.matches(keyData, "selectUp")) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateList();
    }
    // Down arrow
    else if (kb.matches(keyData, "selectDown")) {
      this.selectedIndex = Math.min(this.allProviders.length - 1, this.selectedIndex + 1);
      this.updateList();
    }
    // Enter
    else if (kb.matches(keyData, "selectConfirm")) {
      const selectedProvider = this.allProviders[this.selectedIndex];
      if (selectedProvider) {
        this.onSelectCallback(selectedProvider.id);
      }
    }
    // Escape or Ctrl+C
    else if (kb.matches(keyData, "selectCancel")) {
      this.onCancelCallback();
    }
  }
}exports.OAuthSelectorComponent = OAuthSelectorComponent; /* v9-ef3dc8053bf7cf47 */
