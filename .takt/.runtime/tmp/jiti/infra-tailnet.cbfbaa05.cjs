"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.listTailnetAddresses = listTailnetAddresses;exports.pickPrimaryTailnetIPv4 = pickPrimaryTailnetIPv4;exports.pickPrimaryTailnetIPv6 = pickPrimaryTailnetIPv6;var _nodeOs = _interopRequireDefault(require("node:os"));function _interopRequireDefault(e) {return e && e.__esModule ? e : { default: e };}
function isTailnetIPv4(address) {
  const parts = address.split(".");
  if (parts.length !== 4) {
    return false;
  }
  const octets = parts.map((p) => Number.parseInt(p, 10));
  if (octets.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return false;
  }
  // Tailscale IPv4 range: 100.64.0.0/10
  // https://tailscale.com/kb/1015/100.x-addresses
  const [a, b] = octets;
  return a === 100 && b >= 64 && b <= 127;
}
function isTailnetIPv6(address) {
  // Tailscale IPv6 ULA prefix: fd7a:115c:a1e0::/48
  // (stable across tailnets; nodes get per-device suffixes)
  const normalized = address.trim().toLowerCase();
  return normalized.startsWith("fd7a:115c:a1e0:");
}
function listTailnetAddresses() {
  const ipv4 = [];
  const ipv6 = [];
  const ifaces = _nodeOs.default.networkInterfaces();
  for (const entries of Object.values(ifaces)) {
    if (!entries) {
      continue;
    }
    for (const e of entries) {
      if (!e || e.internal) {
        continue;
      }
      const address = e.address?.trim();
      if (!address) {
        continue;
      }
      if (isTailnetIPv4(address)) {
        ipv4.push(address);
      }
      if (isTailnetIPv6(address)) {
        ipv6.push(address);
      }
    }
  }
  return { ipv4: [...new Set(ipv4)], ipv6: [...new Set(ipv6)] };
}
function pickPrimaryTailnetIPv4() {
  return listTailnetAddresses().ipv4[0];
}
function pickPrimaryTailnetIPv6() {
  return listTailnetAddresses().ipv6[0];
} /* v9-4a03c7401bd2c8d2 */
