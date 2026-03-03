"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.GuildAnnouncementChannel = void 0;var _v = require("discord-api-types/v10");
var _BaseGuildTextChannel = require("../abstracts/BaseGuildTextChannel.js");
/**
 * Represents a guild announcement channel.
 */
class GuildAnnouncementChannel extends _BaseGuildTextChannel.BaseGuildTextChannel {
  /**
   * The position of the channel in the channel list.
   */
  get position() {
    if (!this.rawData)
    return undefined;
    return this.rawData.position;
  }
  /**
   * Set the position of the channel
   * @param position The new position of the channel
   */
  async setPosition(position) {
    await this.client.rest.patch(_v.Routes.channel(this.id), {
      body: {
        position
      }
    });
    this.setField("position", position);
  }
  async follow(targetChannel) {
    await this.client.rest.put(_v.Routes.channelFollowers(this.id), {
      body: {
        webhook_channel_id: typeof targetChannel === "string" ? targetChannel : targetChannel.id
      }
    });
  }
}exports.GuildAnnouncementChannel = GuildAnnouncementChannel; /* v9-0f2ffb692c966b16 */
