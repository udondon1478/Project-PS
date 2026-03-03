"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.GuildForumChannel = void 0;var _GuildThreadOnlyChannel = require("../abstracts/GuildThreadOnlyChannel.js");
/**
 * Represents a guild forum channel.
 */
class GuildForumChannel extends _GuildThreadOnlyChannel.GuildThreadOnlyChannel {
  /**
   * The default forum layout of the channel.
   */
  get defaultForumLayout() {
    if (!this.rawData)
    return undefined;
    return this.rawData.default_forum_layout;
  }
}exports.GuildForumChannel = GuildForumChannel; /* v9-58b9800178cd785f */
