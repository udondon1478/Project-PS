"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.GuildTextChannel = void 0;var _v = require("discord-api-types/v10");
var _BaseGuildTextChannel = require("../abstracts/BaseGuildTextChannel.js");
class GuildTextChannel extends _BaseGuildTextChannel.BaseGuildTextChannel {
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
   * The default auto archive duration of threads in the channel.
   */
  get defaultAutoArchiveDuration() {
    if (!this.rawData)
    return undefined;
    return this.rawData.default_auto_archive_duration ?? null;
  }
  /**
   * The default thread rate limit per user of the channel.
   */
  get defaultThreadRateLimitPerUser() {
    if (!this.rawData)
    return undefined;
    return this.rawData.default_thread_rate_limit_per_user ?? null;
  }
}exports.GuildTextChannel = GuildTextChannel; /* v9-2dd5387df437349b */
