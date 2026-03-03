"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.channelFactory = void 0;var _v = require("discord-api-types/v10");
var _DmChannel = require("../structures/DmChannel.js");
var _GroupDmChannel = require("../structures/GroupDmChannel.js");
var _GuildAnnouncementChannel = require("../structures/GuildAnnouncementChannel.js");
var _GuildCategoryChannel = require("../structures/GuildCategoryChannel.js");
var _GuildForumChannel = require("../structures/GuildForumChannel.js");
var _GuildMediaChannel = require("../structures/GuildMediaChannel.js");
var _GuildStageOrVoiceChannel = require("../structures/GuildStageOrVoiceChannel.js");
var _GuildTextChannel = require("../structures/GuildTextChannel.js");
var _GuildThreadChannel = require("../structures/GuildThreadChannel.js");
const channelFactory = (client, channelData) => {
  switch (channelData.type) {
    case _v.ChannelType.DM:
      return new _DmChannel.DmChannel(client, channelData);
    case _v.ChannelType.GroupDM:
      return new _GroupDmChannel.GroupDmChannel(client, channelData);
    case _v.ChannelType.GuildText:
      return new _GuildTextChannel.GuildTextChannel(client, channelData);
    case _v.ChannelType.GuildVoice:
      return new _GuildStageOrVoiceChannel.GuildVoiceChannel(client, channelData);
    case _v.ChannelType.GuildCategory:
      return new _GuildCategoryChannel.GuildCategoryChannel(client, channelData);
    case _v.ChannelType.GuildAnnouncement:
      return new _GuildAnnouncementChannel.GuildAnnouncementChannel(client, channelData);
    case _v.ChannelType.AnnouncementThread:
    case _v.ChannelType.PublicThread:
    case _v.ChannelType.PrivateThread:
      return new _GuildThreadChannel.GuildThreadChannel(client, channelData);
    case _v.ChannelType.GuildStageVoice:
      return new _GuildStageOrVoiceChannel.GuildStageChannel(client, channelData);
    case _v.ChannelType.GuildForum:
      return new _GuildForumChannel.GuildForumChannel(client, channelData);
    case _v.ChannelType.GuildMedia:
      return new _GuildMediaChannel.GuildMediaChannel(client, channelData);
    default:
      return null;
  }
};exports.channelFactory = channelFactory; /* v9-29368dd8344b833c */
