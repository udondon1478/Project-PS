"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.GuildVoiceChannel = exports.GuildStageOrVoiceChannel = exports.GuildStageChannel = void 0;var _v = require("discord-api-types/v10");
var _BaseGuildChannel = require("../abstracts/BaseGuildChannel.js");
class GuildStageOrVoiceChannel extends _BaseGuildChannel.BaseGuildChannel {
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
   * The bitrate of the channel.
   */
  get bitrate() {
    if (!this.rawData)
    return undefined;
    return this.rawData.bitrate;
  }
  /**
   * The user limit of the channel.
   */
  get userLimit() {
    if (!this.rawData)
    return undefined;
    return this.rawData.user_limit;
  }
  /**
   * The RTC region of the channel.
   * This is automatic when set to `null`.
   */
  get rtcRegion() {
    if (!this.rawData)
    return undefined;
    return this.rawData.rtc_region ?? null;
  }
  /**
   * The video quality mode of the channel.
   * 1 when not present.
   */
  get videoQualityMode() {
    if (!this.rawData)
    return undefined;
    return this.rawData.video_quality_mode ?? _v.VideoQualityMode.Auto;
  }
}exports.GuildStageOrVoiceChannel = GuildStageOrVoiceChannel;
class GuildStageChannel extends GuildStageOrVoiceChannel {}exports.GuildStageChannel = GuildStageChannel;

class GuildVoiceChannel extends GuildStageOrVoiceChannel {}exports.GuildVoiceChannel = GuildVoiceChannel; /* v9-77f63131ac4d0181 */
