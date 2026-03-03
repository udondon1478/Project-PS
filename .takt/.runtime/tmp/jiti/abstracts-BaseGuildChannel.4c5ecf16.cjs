"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.BaseGuildChannel = void 0;var _v = require("discord-api-types/v10");
var _Guild = require("../structures/Guild.js");
var _Message = require("../structures/Message.js");
var _index = require("../utils/index.js");
var _BaseChannel = require("./BaseChannel.js");
class BaseGuildChannel extends _BaseChannel.BaseChannel {
  /**
   * The name of the channel.
   */
  get name() {
    if (!this.rawData)
    return undefined;
    return this.rawData.name;
  }
  /**
   * The ID of the guild this channel is in
   */
  get guildId() {
    if (!this.rawData)
    return undefined;
    return this.rawData.guild_id;
  }
  /**
   * The ID of the parent category for the channel.
   */
  get parentId() {
    if (!this.rawData)
    return undefined;
    return this.rawData.parent_id ?? null;
  }
  /**
   * Whether the channel is marked as nsfw.
   */
  get nsfw() {
    if (!this.rawData)
    return undefined;
    return this.rawData.nsfw ?? false;
  }
  /**
   * The guild this channel is in
   */
  get guild() {
    if (!this.rawData)
    return undefined;
    if (!this.guildId)
    throw new Error("Cannot get guild without guild ID");
    return new _Guild.Guild(this.client, this.guildId);
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
   * Set the parent ID of the channel
   * @param parent The new category channel or ID to set
   */
  async setParent(parent) {
    if (typeof parent === "string") {
      await this.client.rest.patch(_v.Routes.channel(this.id), {
        body: {
          parent_id: parent
        }
      });
      this.setField("parent_id", parent);
    } else
    {
      await this.client.rest.patch(_v.Routes.channel(this.id), {
        body: {
          parent_id: parent.id
        }
      });
      this.setField("parent_id", parent.id);
    }
  }
  /**
   * Set whether the channel is nsfw
   * @param nsfw The new nsfw status of the channel
   */
  async setNsfw(nsfw) {
    await this.client.rest.patch(_v.Routes.channel(this.id), {
      body: {
        nsfw
      }
    });
    this.setField("nsfw", nsfw);
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
   * Get the invites for the channel
   */
  async getInvites() {
    return await this.client.rest.get(_v.Routes.channelInvites(this.id));
  }
  /**
   * Create an invite for the channel
   */
  async createInvite(options) {
    return await this.client.rest.post(_v.Routes.channelInvites(this.id), {
      body: { ...options }
    });
  }
  /**
   * Trigger a typing indicator in the channel (this will expire after 10 seconds)
   */
  async triggerTyping() {
    await this.client.rest.post(_v.Routes.channelTyping(this.id), {});
  }
}exports.BaseGuildChannel = BaseGuildChannel; /* v9-4509dae12c3e1a55 */
