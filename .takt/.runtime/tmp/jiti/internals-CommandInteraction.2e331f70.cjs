"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.CommandInteraction = void 0;var _v = require("discord-api-types/v10");
var _BaseInteraction = require("../abstracts/BaseInteraction.js");
var _Message = require("../structures/Message.js");
var _User = require("../structures/User.js");
var _OptionsHandler = require("./OptionsHandler.js");
/**
 * Represents a command interaction
 */
class CommandInteraction extends _BaseInteraction.BaseInteraction {
  /**
   * This is the options of the commands, parsed from the interaction data.
   * It will not have any options in it if the command is not a ChatInput command.
   */
  options;
  constructor({ client, data, defaults, processingCommand }) {
    super(client, data, defaults);
    if (data.type !== _v.InteractionType.ApplicationCommand) {
      throw new Error("Invalid interaction type was used to create this class");
    }
    this.options = new _OptionsHandler.OptionsHandler({
      client,
      options: data.data.type === _v.ApplicationCommandType.ChatInput ?
      data.data.options ?? [] :
      [],
      interactionData: this.rawData.
      data,
      definitions: processingCommand?.options ?? [],
      guildId: data.guild_id
    });
  }
  get targetMessage() {
    const interactionData = this.rawData.data;
    if (interactionData.type !== _v.ApplicationCommandType.Message ||
    !("resolved" in interactionData)) {
      return null;
    }
    const { target_id: targetId, resolved } = interactionData;
    if (!resolved?.messages)
    return null;
    const rawMessage = targetId ?
    resolved.messages[targetId] :
    Object.values(resolved.messages)[0];
    return rawMessage ? new _Message.Message(this.client, rawMessage) : null;
  }
  get targetUser() {
    const interactionData = this.rawData.data;
    if (interactionData.type !== _v.ApplicationCommandType.User ||
    !("resolved" in interactionData)) {
      return null;
    }
    const { target_id: targetId, resolved } = interactionData;
    if (!resolved?.users)
    return null;
    const rawUser = targetId ?
    resolved.users[targetId] :
    Object.values(resolved.users)[0];
    return rawUser ? new _User.User(this.client, rawUser) : null;
  }
}exports.CommandInteraction = CommandInteraction; /* v9-b1470475539ea2a0 */
