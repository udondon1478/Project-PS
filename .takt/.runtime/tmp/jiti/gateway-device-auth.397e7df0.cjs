"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.buildDeviceAuthPayload = buildDeviceAuthPayload;function buildDeviceAuthPayload(params) {
  const version = params.version ?? (params.nonce ? "v2" : "v1");
  const scopes = params.scopes.join(",");
  const token = params.token ?? "";
  const base = [
  version,
  params.deviceId,
  params.clientId,
  params.clientMode,
  params.role,
  scopes,
  String(params.signedAtMs),
  token];

  if (version === "v2") {
    base.push(params.nonce ?? "");
  }
  return base.join("|");
} /* v9-57d4e84fd8ac43b2 */
