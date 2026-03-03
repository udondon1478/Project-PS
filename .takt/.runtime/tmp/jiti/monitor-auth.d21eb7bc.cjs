"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isSlackSenderAllowListed = isSlackSenderAllowListed;exports.resolveSlackEffectiveAllowFrom = resolveSlackEffectiveAllowFrom;var _pairingStore = require("../../pairing/pairing-store.js");
var _allowList = require("./allow-list.js");
async function resolveSlackEffectiveAllowFrom(ctx) {
  const storeAllowFrom = await (0, _pairingStore.readChannelAllowFromStore)("slack").catch(() => []);
  const allowFrom = (0, _allowList.normalizeAllowList)([...ctx.allowFrom, ...storeAllowFrom]);
  const allowFromLower = (0, _allowList.normalizeAllowListLower)(allowFrom);
  return { allowFrom, allowFromLower };
}
function isSlackSenderAllowListed(params) {
  const { allowListLower, senderId, senderName } = params;
  return allowListLower.length === 0 ||
  (0, _allowList.allowListMatches)({
    allowList: allowListLower,
    id: senderId,
    name: senderName
  });
} /* v9-c7633b14a8f8dd63 */
