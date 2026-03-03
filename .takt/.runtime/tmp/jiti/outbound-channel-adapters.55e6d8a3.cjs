"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getChannelMessageAdapter = getChannelMessageAdapter;const DEFAULT_ADAPTER = {
  supportsEmbeds: false
};
const DISCORD_ADAPTER = {
  supportsEmbeds: true,
  buildCrossContextEmbeds: (originLabel) => [
  {
    description: `From ${originLabel}`
  }]

};
function getChannelMessageAdapter(channel) {
  if (channel === "discord") {
    return DISCORD_ADAPTER;
  }
  return DEFAULT_ADAPTER;
} /* v9-4bdc9ec2e30d50c3 */
