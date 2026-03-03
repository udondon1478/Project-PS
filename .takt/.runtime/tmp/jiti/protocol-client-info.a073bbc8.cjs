"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.GATEWAY_CLIENT_NAMES = exports.GATEWAY_CLIENT_MODES = exports.GATEWAY_CLIENT_IDS = void 0;exports.normalizeGatewayClientId = normalizeGatewayClientId;exports.normalizeGatewayClientMode = normalizeGatewayClientMode;exports.normalizeGatewayClientName = normalizeGatewayClientName;const GATEWAY_CLIENT_IDS = exports.GATEWAY_CLIENT_IDS = {
  WEBCHAT_UI: "webchat-ui",
  CONTROL_UI: "openclaw-control-ui",
  WEBCHAT: "webchat",
  CLI: "cli",
  GATEWAY_CLIENT: "gateway-client",
  MACOS_APP: "openclaw-macos",
  IOS_APP: "openclaw-ios",
  ANDROID_APP: "openclaw-android",
  NODE_HOST: "node-host",
  TEST: "test",
  FINGERPRINT: "fingerprint",
  PROBE: "openclaw-probe"
};
// Back-compat naming (internal): these values are IDs, not display names.
const GATEWAY_CLIENT_NAMES = exports.GATEWAY_CLIENT_NAMES = GATEWAY_CLIENT_IDS;
const GATEWAY_CLIENT_MODES = exports.GATEWAY_CLIENT_MODES = {
  WEBCHAT: "webchat",
  CLI: "cli",
  UI: "ui",
  BACKEND: "backend",
  NODE: "node",
  PROBE: "probe",
  TEST: "test"
};
const GATEWAY_CLIENT_ID_SET = new Set(Object.values(GATEWAY_CLIENT_IDS));
const GATEWAY_CLIENT_MODE_SET = new Set(Object.values(GATEWAY_CLIENT_MODES));
function normalizeGatewayClientId(raw) {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return GATEWAY_CLIENT_ID_SET.has(normalized) ?
  normalized :
  undefined;
}
function normalizeGatewayClientName(raw) {
  return normalizeGatewayClientId(raw);
}
function normalizeGatewayClientMode(raw) {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return GATEWAY_CLIENT_MODE_SET.has(normalized) ?
  normalized :
  undefined;
} /* v9-62ea42993d9e4e43 */
