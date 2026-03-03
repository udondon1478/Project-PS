"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _index = require("../Defaults/index.js");
var _communities = require("./communities.js");
// export the last socket layer
const makeWASocket = (config) => {
  const newConfig = {
    ..._index.DEFAULT_CONNECTION_CONFIG,
    ...config
  };
  // If the user hasn't provided their own history sync function,
  // let's create a default one that respects the syncFullHistory flag.
  // TODO: Change
  if (config.shouldSyncHistoryMessage === undefined) {
    newConfig.shouldSyncHistoryMessage = () => !!newConfig.syncFullHistory;
  }
  return (0, _communities.makeCommunitiesSocket)(newConfig);
};var _default = exports.default =
makeWASocket; /* v9-5149e30717f863d1 */
