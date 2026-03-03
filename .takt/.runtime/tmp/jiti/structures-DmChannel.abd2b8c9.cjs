"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DmChannel = void 0;var _v = require("discord-api-types/v10");
var _BaseChannel = require("../abstracts/BaseChannel.js");
var _index = require("../utils/index.js");
var _Message = require("./Message.js");
/**
 * Represents a DM between two users.
 */
class DmChannel extends _BaseChannel.BaseChannel {
  /**
   * The name of the channel. This is always null for DM channels.
   */
  get name() {
    if (!this.rawData)
    return undefined;
    return null;
  }
  /**
   * Send a message to the channel
   */
  async send(message) {
    const data = await this.client.rest.post(_v.Routes.channelMessages(this.id), {
      body: (0, _index.serializePayload)(message)
    });
    return new _Message.Message(this.client, data);
  }
  /**
   * Trigger a typing indicator in the channel (this will expire after 10 seconds)
   */
  async triggerTyping() {
    await this.client.rest.post(_v.Routes.channelTyping(this.id), {});
  }
}exports.DmChannel = DmChannel; /* v9-4977be5f49f1f933 */
