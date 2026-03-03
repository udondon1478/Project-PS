"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.GuildCategoryChannel = void 0;var _v = require("discord-api-types/v10");
var _BaseGuildChannel = require("../abstracts/BaseGuildChannel.js");
/**
 * Represents a guild category channel.
 */
class GuildCategoryChannel extends _BaseGuildChannel.BaseGuildChannel {
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
  /**
   * You cannot send a message to a category channel, so this method throws an error
   */
  async send() {
    throw new Error("Category channels cannot be sent to");
  }
}exports.GuildCategoryChannel = GuildCategoryChannel; /* v9-be8a2fa96b7f84ff */
