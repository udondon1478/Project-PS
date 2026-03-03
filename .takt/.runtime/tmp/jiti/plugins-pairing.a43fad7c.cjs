"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getPairingAdapter = getPairingAdapter;exports.listPairingChannels = listPairingChannels;exports.notifyPairingApproved = notifyPairingApproved;exports.requirePairingAdapter = requirePairingAdapter;exports.resolvePairingChannel = resolvePairingChannel;var _index = require("./index.js");
function listPairingChannels() {
  // Channel docking: pairing support is declared via plugin.pairing.
  return (0, _index.listChannelPlugins)().
  filter((plugin) => plugin.pairing).
  map((plugin) => plugin.id);
}
function getPairingAdapter(channelId) {
  const plugin = (0, _index.getChannelPlugin)(channelId);
  return plugin?.pairing ?? null;
}
function requirePairingAdapter(channelId) {
  const adapter = getPairingAdapter(channelId);
  if (!adapter) {
    throw new Error(`Channel ${channelId} does not support pairing`);
  }
  return adapter;
}
function resolvePairingChannel(raw) {
  const value = (typeof raw === "string" ?
  raw :
  typeof raw === "number" || typeof raw === "boolean" ?
  String(raw) :
  "").
  trim().
  toLowerCase();
  const normalized = (0, _index.normalizeChannelId)(value);
  const channels = listPairingChannels();
  if (!normalized || !channels.includes(normalized)) {
    throw new Error(`Invalid channel: ${value || "(empty)"} (expected one of: ${channels.join(", ")})`);
  }
  return normalized;
}
async function notifyPairingApproved(params) {
  // Extensions may provide adapter directly to bypass ESM module isolation
  const adapter = params.pairingAdapter ?? requirePairingAdapter(params.channelId);
  if (!adapter.notifyApproval) {
    return;
  }
  await adapter.notifyApproval({
    cfg: params.cfg,
    id: params.id,
    runtime: params.runtime
  });
} /* v9-a11bc535756d6739 */
