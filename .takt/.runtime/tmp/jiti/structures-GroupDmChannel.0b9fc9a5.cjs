"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.GroupDmChannel = void 0;var _v = require("discord-api-types/v10");
var _BaseChannel = require("../abstracts/BaseChannel.js");
var _index = require("../utils/index.js");
var _Message = require("./Message.js");
var _User = require("./User.js");
/**
 * Represents a group DM channel.
 */
class GroupDmChannel extends _BaseChannel.BaseChannel {
  /**
   * The name of the channel.
   */
  get name() {
    if (!this.rawData)
    return undefined;
    return this.rawData.name;
  }
  /**
   * The recipients of the channel.
   */
  get recipients() {
    if (!this.rawData)
    return undefined;
    const recipients = this.rawData.recipients ?? [];
    return recipients.map((u) => new _User.User(this.client, u));
  }
  /**
   * The ID of the application that created the channel, if it was created by a bot.
   */
  get applicationId() {
    if (!this.rawData)
    return undefined;
    return this.rawData.application_id ?? null;
  }
  /**
   * The icon hash of the channel.
   */
  get icon() {
    if (!this.rawData)
    return undefined;
    return this.rawData.icon ?? null;
  }
  /**
   * Get the URL of the channel's icon with default settings (png format)
   */
  get iconUrl() {
    if (!this.rawData)
    return undefined;
    return (0, _index.buildCDNUrl)(`https://cdn.discordapp.com/channel-icons/${this.id}`, this.icon);
  }
  /**
   * Get the URL of the channel's icon with custom format and size options
   * @param options Optional format and size parameters
   * @returns The icon URL or null if no icon is set
   */
  getIconUrl(options) {
    if (!this.rawData)
    return undefined;
    return (0, _index.buildCDNUrl)(`https://cdn.discordapp.com/channel-icons/${this.id}`, this.icon, options);
  }
  /**
   * The ID of the user who created the channel.
   */
  get ownerId() {
    if (!this.rawData)
    return undefined;
    return this.rawData.owner_id ?? null;
  }
  /**
   * The ID of the last message sent in the channel.
   *
   * @remarks
   * This might not always resolve to a message. The ID still stays a part of the channel's data, even if the message is deleted.
   */
  get lastMessageId() {
    if (!this.rawData)
    return undefined;
    return this.rawData.last_message_id ?? null;
  }
  /**
   * Whether the channel is managed by an Oauth2 application.
   */
  get managed() {
    if (!this.rawData)
    return undefined;
    return this.rawData.managed ?? false;
  }
  /**
   * Get the owner of the channel.
   */
  get owner() {
    if (!this.ownerId)
    throw new Error("Cannot get owner without owner ID");
    return new _User.User(this.client, this.ownerId);
  }
  /**
   * The last message sent in the channel.
   *
   * @remarks
   * This might not always resolve to a message. The ID still stays a part of the channel's data, even if the message is deleted.
   * This will always return a partial message, so you can use {@link Message.fetch} to get the full message data.
   *
   */
  get lastMessage() {
    if (!this.lastMessageId)
    return null;
    return new _Message.Message(this.client, {
      id: this.lastMessageId,
      channelId: this.id
    });
  }
  /**
   * Set the name of the channel
   * @param name The new name of the channel
   */
  async setName(name) {
    await this.client.rest.patch(_v.Routes.channel(this.id), {
      body: {
        name
      }
    });
    this.setField("name", name);
  }
  /**
   * Trigger a typing indicator in the channel (this will expire after 10 seconds)
   */
  async triggerTyping() {
    await this.client.rest.post(_v.Routes.channelTyping(this.id), {});
  }
}exports.GroupDmChannel = GroupDmChannel; /* v9-c94d21f59c0c11eb */
