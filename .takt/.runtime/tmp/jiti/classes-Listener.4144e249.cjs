"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.WebhooksUpdateListener = exports.VoiceStateUpdateListener = exports.VoiceServerUpdateListener = exports.VoiceChannelEffectSendListener = exports.UserUpdateListener = exports.TypingStartListener = exports.ThreadUpdateListener = exports.ThreadMembersUpdateListener = exports.ThreadMemberUpdateListener = exports.ThreadListSyncListener = exports.ThreadDeleteListener = exports.ThreadCreateListener = exports.SubscriptionUpdateListener = exports.SubscriptionDeleteListener = exports.SubscriptionCreateListener = exports.StageInstanceUpdateListener = exports.StageInstanceDeleteListener = exports.StageInstanceCreateListener = exports.ResumedListener = exports.ReadyListener = exports.QuestUserEnrollmentListener = exports.PresenceUpdateListener = exports.MessageUpdateListener = exports.MessageReactionRemoveListener = exports.MessageReactionRemoveEmojiListener = exports.MessageReactionRemoveAllListener = exports.MessageReactionAddListener = exports.MessagePollVoteRemoveListener = exports.MessagePollVoteAddListener = exports.MessageDeleteListener = exports.MessageDeleteBulkListener = exports.MessageCreateListener = exports.InviteDeleteListener = exports.InviteCreateListener = exports.InteractionCreateListener = exports.IntegrationUpdateListener = exports.IntegrationDeleteListener = exports.IntegrationCreateListener = exports.GuildUpdateListener = exports.GuildUnavailableListener = exports.GuildStickersUpdateListener = exports.GuildSoundboardSoundsUpdateListener = exports.GuildSoundboardSoundUpdateListener = exports.GuildSoundboardSoundDeleteListener = exports.GuildSoundboardSoundCreateListener = exports.GuildScheduledEventUserRemoveListener = exports.GuildScheduledEventUserAddListener = exports.GuildScheduledEventUpdateListener = exports.GuildScheduledEventDeleteListener = exports.GuildScheduledEventCreateListener = exports.GuildRoleUpdateListener = exports.GuildRoleDeleteListener = exports.GuildRoleCreateListener = exports.GuildMembersChunkListener = exports.GuildMemberUpdateListener = exports.GuildMemberRemoveListener = exports.GuildMemberAddListener = exports.GuildIntegrationsUpdateListener = exports.GuildEmojisUpdateListener = exports.GuildDeleteListener = exports.GuildCreateListener = exports.GuildBanRemoveListener = exports.GuildBanAddListener = exports.GuildAvailableListener = exports.GuildAuditLogEntryCreateListener = exports.EntitlementUpdateListener = exports.EntitlementDeleteListener = exports.EntitlementCreateListener = exports.ChannelUpdateListener = exports.ChannelPinsUpdateListener = exports.ChannelDeleteListener = exports.ChannelCreateListener = exports.AutoModerationRuleUpdateListener = exports.AutoModerationRuleDeleteListener = exports.AutoModerationRuleCreateListener = exports.AutoModerationActionExecutionListener = exports.ApplicationCommandPermissionsUpdateListener = exports.ApplicationAuthorizedListener = void 0;var _v = require("discord-api-types/v10");
var _BaseListener = require("../abstracts/BaseListener.js");
var _channelFactory = require("../functions/channelFactory.js");
var _Guild = require("../structures/Guild.js");
var _GuildMember = require("../structures/GuildMember.js");
var _GuildThreadChannel = require("../structures/GuildThreadChannel.js");
var _Message = require("../structures/Message.js");
var _Role = require("../structures/Role.js");
var _ThreadMember = require("../structures/ThreadMember.js");
var _User = require("../structures/User.js");
var _index = require("../types/index.js");
class GuildAvailableListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildAvailable;
}exports.GuildAvailableListener = GuildAvailableListener;
class GuildUnavailableListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildUnavailable;
}exports.GuildUnavailableListener = GuildUnavailableListener;
class ApplicationAuthorizedListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.ApplicationAuthorized;
  parseRawData(data, client) {
    const guild = data.guild ? new _Guild.Guild(client, data.guild) : undefined;
    const user = new _User.User(client, data.user);
    const { guild: _, user: __, ...restData } = data;
    return {
      guild,
      user,
      rawGuild: data.guild,
      rawUser: data.user,
      ...restData
    };
  }
}exports.ApplicationAuthorizedListener = ApplicationAuthorizedListener;
class EntitlementCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.EntitlementCreate;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const user = data.user_id ? new _User.User(client, data.user_id) : undefined;
    return {
      guild,
      user,
      ...data
    };
  }
}exports.EntitlementCreateListener = EntitlementCreateListener;
class QuestUserEnrollmentListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.QuestUserEnrollment;
  parseRawData(data) {
    return data;
  }
}exports.QuestUserEnrollmentListener = QuestUserEnrollmentListener;
class ApplicationCommandPermissionsUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.ApplicationCommandPermissionsUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.ApplicationCommandPermissionsUpdateListener = ApplicationCommandPermissionsUpdateListener;
class AutoModerationActionExecutionListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.AutoModerationActionExecution;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const user = new _User.User(client, data.user_id);
    const message = data.message_id ?
    new _Message.Message(client, {
      id: data.message_id,
      channelId: data.channel_id
    }) :
    undefined;
    return {
      guild,
      user,
      message,
      ...data
    };
  }
}exports.AutoModerationActionExecutionListener = AutoModerationActionExecutionListener;
class AutoModerationRuleCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.AutoModerationRuleCreate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const creator = new _User.User(client, data.creator_id);
    return { guild, creator, ...data };
  }
}exports.AutoModerationRuleCreateListener = AutoModerationRuleCreateListener;
class AutoModerationRuleDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.AutoModerationRuleDelete;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const creator = new _User.User(client, data.creator_id);
    return { guild, creator, ...data };
  }
}exports.AutoModerationRuleDeleteListener = AutoModerationRuleDeleteListener;
class AutoModerationRuleUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.AutoModerationRuleUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const creator = new _User.User(client, data.creator_id);
    return { guild, creator, ...data };
  }
}exports.AutoModerationRuleUpdateListener = AutoModerationRuleUpdateListener;
class ChannelCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.ChannelCreate;
  parseRawData(data, client) {
    const rawChannel = data;
    // biome-ignore lint/style/noNonNullAssertion: channelFactory will always return a channel
    const channel = (0, _channelFactory.channelFactory)(client, rawChannel);
    return {
      channel,
      rawChannel,
      ...data
    };
  }
}exports.ChannelCreateListener = ChannelCreateListener;
class ChannelDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.ChannelDelete;
  parseRawData(data, client) {
    const rawChannel = data;
    // biome-ignore lint/style/noNonNullAssertion: channelFactory will always return a channel
    const channel = (0, _channelFactory.channelFactory)(client, rawChannel);
    return {
      channel,
      rawChannel,
      ...data
    };
  }
}exports.ChannelDeleteListener = ChannelDeleteListener;
class ChannelPinsUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.ChannelPinsUpdate;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const channel = (0, _channelFactory.channelFactory)(client, {
      id: data.channel_id,
      type: _v.ChannelType.GuildText
    });
    return {
      guild,
      channel,
      ...data
    };
  }
}exports.ChannelPinsUpdateListener = ChannelPinsUpdateListener;
class ChannelUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.ChannelUpdate;
  parseRawData(data, client) {
    const rawChannel = data;
    // biome-ignore lint/style/noNonNullAssertion: channelFactory will always return a channel
    const channel = (0, _channelFactory.channelFactory)(client, rawChannel);
    return {
      rawChannel,
      channel,
      ...data
    };
  }
}exports.ChannelUpdateListener = ChannelUpdateListener;
class EntitlementDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.EntitlementDelete;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const user = data.user_id ? new _User.User(client, data.user_id) : undefined;
    return {
      guild,
      user,
      ...data
    };
  }
}exports.EntitlementDeleteListener = EntitlementDeleteListener;
class EntitlementUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.EntitlementUpdate;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const user = data.user_id ? new _User.User(client, data.user_id) : undefined;
    return {
      guild,
      user,
      ...data
    };
  }
}exports.EntitlementUpdateListener = EntitlementUpdateListener;
class GuildAuditLogEntryCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildAuditLogEntryCreate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const user = new _User.User(client, data.user_id || "");
    const target = data.target_id ?
    new _User.User(client, data.target_id) :
    undefined;
    return {
      guild,
      user,
      target,
      ...data
    };
  }
}exports.GuildAuditLogEntryCreateListener = GuildAuditLogEntryCreateListener;
class GuildBanAddListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildBanAdd;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const user = new _User.User(client, data.user);
    return {
      ...data,
      guild,
      rawUser: data.user,
      user
    };
  }
}exports.GuildBanAddListener = GuildBanAddListener;
class GuildBanRemoveListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildBanRemove;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const user = new _User.User(client, data.user);
    return {
      ...data,
      user,
      guild,
      rawUser: data.user
    };
  }
}exports.GuildBanRemoveListener = GuildBanRemoveListener;
class GuildCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildCreate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data);
    return {
      guild,
      ...data
    };
  }
}exports.GuildCreateListener = GuildCreateListener;
class GuildDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildDelete;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.id);
    return {
      guild,
      ...data
    };
  }
}exports.GuildDeleteListener = GuildDeleteListener;
class GuildEmojisUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildEmojisUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.GuildEmojisUpdateListener = GuildEmojisUpdateListener;
class GuildIntegrationsUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildIntegrationsUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.GuildIntegrationsUpdateListener = GuildIntegrationsUpdateListener;
class GuildMemberAddListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildMemberAdd;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const member = new _GuildMember.GuildMember(client, data, guild);
    return {
      guild,
      member,
      ...data
    };
  }
}exports.GuildMemberAddListener = GuildMemberAddListener;
class GuildMemberRemoveListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildMemberRemove;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const user = new _User.User(client, data.user);
    return {
      ...data,
      guild,
      user,
      rawUser: data.user
    };
  }
}exports.GuildMemberRemoveListener = GuildMemberRemoveListener;
class GuildMemberUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildMemberUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const memberData = {
      ...data,
      joined_at: data.joined_at ?? new Date().toISOString(),
      deaf: false,
      mute: false,
      flags: data.flags ?? 0,
      user: {
        ...data.user,
        global_name: data.user.global_name ?? null
      }
    };
    const member = new _GuildMember.GuildMember(client, memberData, guild);
    return {
      guild,
      member,
      rawMember: data,
      ...data
    };
  }
}exports.GuildMemberUpdateListener = GuildMemberUpdateListener;
class GuildMembersChunkListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildMembersChunk;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const guildMembers = data.members.map((member) => {
      return new _GuildMember.GuildMember(client, member, guild);
    });
    return {
      ...data,
      guild,
      rawMembers: data.members,
      members: guildMembers
    };
  }
}exports.GuildMembersChunkListener = GuildMembersChunkListener;
class GuildRoleCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildRoleCreate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const role = new _Role.Role(client, data.role, data.guild_id);
    return {
      ...data,
      guild,
      rawRole: data.role,
      role
    };
  }
}exports.GuildRoleCreateListener = GuildRoleCreateListener;
class GuildRoleDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildRoleDelete;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const role = new _Role.Role(client, data.role_id, data.guild_id);
    return {
      ...data,
      guild,
      role
    };
  }
}exports.GuildRoleDeleteListener = GuildRoleDeleteListener;
class GuildRoleUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildRoleUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const role = new _Role.Role(client, data.role, data.guild_id);
    return {
      ...data,
      guild,
      rawRole: data.role,
      role
    };
  }
}exports.GuildRoleUpdateListener = GuildRoleUpdateListener;
class GuildScheduledEventCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildScheduledEventCreate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const creator = data.creator ? new _User.User(client, data.creator) : undefined;
    return {
      ...data,
      guild,
      rawCreator: data.creator,
      creator
    };
  }
}exports.GuildScheduledEventCreateListener = GuildScheduledEventCreateListener;
class GuildScheduledEventDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildScheduledEventDelete;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.GuildScheduledEventDeleteListener = GuildScheduledEventDeleteListener;
class GuildScheduledEventUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildScheduledEventUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.GuildScheduledEventUpdateListener = GuildScheduledEventUpdateListener;
class GuildScheduledEventUserAddListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildScheduledEventUserAdd;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const user = new _User.User(client, data.user_id);
    return {
      guild,
      user,
      ...data
    };
  }
}exports.GuildScheduledEventUserAddListener = GuildScheduledEventUserAddListener;
class GuildScheduledEventUserRemoveListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildScheduledEventUserRemove;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const user = new _User.User(client, data.user_id);
    return {
      guild,
      user,
      ...data
    };
  }
}exports.GuildScheduledEventUserRemoveListener = GuildScheduledEventUserRemoveListener;
class GuildSoundboardSoundCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildSoundboardSoundCreate;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    return {
      ...data,
      guild
    };
  }
}exports.GuildSoundboardSoundCreateListener = GuildSoundboardSoundCreateListener;
class GuildSoundboardSoundDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildSoundboardSoundDelete;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.GuildSoundboardSoundDeleteListener = GuildSoundboardSoundDeleteListener;
class GuildSoundboardSoundUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildSoundboardSoundUpdate;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    return {
      guild,
      ...data
    };
  }
}exports.GuildSoundboardSoundUpdateListener = GuildSoundboardSoundUpdateListener;
class GuildSoundboardSoundsUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildSoundboardSoundsUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.GuildSoundboardSoundsUpdateListener = GuildSoundboardSoundsUpdateListener;
class GuildStickersUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildStickersUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.GuildStickersUpdateListener = GuildStickersUpdateListener;
class GuildUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.GuildUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data);
    return {
      guild,
      ...data
    };
  }
}exports.GuildUpdateListener = GuildUpdateListener;
class IntegrationCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.IntegrationCreate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const user = data.user ? new _User.User(client, data.user) : undefined;
    return {
      guild,
      user,
      rawUser: data.user,
      ...data
    };
  }
}exports.IntegrationCreateListener = IntegrationCreateListener;
class IntegrationDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.IntegrationDelete;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const application = data.application_id ?
    new _User.User(client, data.application_id) :
    undefined;
    return {
      guild,
      application,
      ...data
    };
  }
}exports.IntegrationDeleteListener = IntegrationDeleteListener;
class IntegrationUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.IntegrationUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.IntegrationUpdateListener = IntegrationUpdateListener;
class InteractionCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.InteractionCreate;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const user = data.user ? new _User.User(client, data.user) : undefined;
    return {
      guild,
      user,
      rawUser: data.user,
      ...data
    };
  }
}exports.InteractionCreateListener = InteractionCreateListener;
class InviteCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.InviteCreate;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const inviter = data.inviter ? new _User.User(client, data.inviter) : undefined;
    const targetUser = data.target_user ?
    new _User.User(client, data.target_user) :
    undefined;
    return {
      guild,
      inviter,
      targetUser,
      rawInviter: data.inviter,
      rawTargetUser: data.target_user,
      ...data
    };
  }
}exports.InviteCreateListener = InviteCreateListener;
class InviteDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.InviteDelete;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const channel = guild ? guild.fetchChannel(data.channel_id) : undefined;
    return {
      guild,
      channel,
      rawChannel: data.channel_id,
      ...data
    };
  }
}exports.InviteDeleteListener = InviteDeleteListener;
class MessageCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.MessageCreate;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const member = guild && data.member ?
    new _GuildMember.GuildMember(client, {
      ...data.member,
      user: data.author
    }, guild) :
    undefined;
    const author = new _User.User(client, data.author);
    const message = new _Message.Message(client, data);
    return {
      ...data,
      guild,
      member,
      author,
      message,
      rawMessage: data,
      rawMember: data.member,
      rawAuthor: data.author
    };
  }
}exports.MessageCreateListener = MessageCreateListener;
class MessageDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.MessageDelete;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const message = new _Message.Message(client, {
      id: data.id,
      channelId: data.channel_id
    });
    return {
      guild,
      message,
      ...data
    };
  }
}exports.MessageDeleteListener = MessageDeleteListener;
class MessageDeleteBulkListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.MessageDeleteBulk;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const messages = data.ids.map((id) => new _Message.Message(client, {
      id,
      channelId: data.channel_id
    }));
    return {
      guild,
      messages,
      ...data
    };
  }
}exports.MessageDeleteBulkListener = MessageDeleteBulkListener;
class MessageReactionAddListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.MessageReactionAdd;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const member = guild && data.member ?
    new _GuildMember.GuildMember(client, data.member, guild) :
    undefined;
    const user = new _User.User(client, data.user_id);
    const message = new _Message.Message(client, {
      id: data.message_id,
      channelId: data.channel_id
    });
    const { user_id, ...restData } = data;
    return {
      ...restData,
      guild,
      member,
      rawMember: data.member,
      user,
      message
    };
  }
}exports.MessageReactionAddListener = MessageReactionAddListener;
class MessageReactionRemoveListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.MessageReactionRemove;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const user = new _User.User(client, data.user_id);
    const message = new _Message.Message(client, {
      id: data.message_id,
      channelId: data.channel_id
    });
    const { user_id, ...restData } = data;
    return {
      ...restData,
      guild,
      user,
      message
    };
  }
}exports.MessageReactionRemoveListener = MessageReactionRemoveListener;
class MessageReactionRemoveAllListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.MessageReactionRemoveAll;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const message = new _Message.Message(client, {
      id: data.message_id,
      channelId: data.channel_id
    });
    return {
      guild,
      message,
      ...data
    };
  }
}exports.MessageReactionRemoveAllListener = MessageReactionRemoveAllListener;
class MessageReactionRemoveEmojiListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.MessageReactionRemoveEmoji;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const message = new _Message.Message(client, {
      id: data.message_id,
      channelId: data.channel_id
    });
    return {
      guild,
      message,
      ...data
    };
  }
}exports.MessageReactionRemoveEmojiListener = MessageReactionRemoveEmojiListener;
class MessageUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.MessageUpdate;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const message = new _Message.Message(client, data);
    return {
      guild,
      message,
      ...data
    };
  }
}exports.MessageUpdateListener = MessageUpdateListener;
class PresenceUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.PresenceUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const user = new _User.User(client, data.user.id);
    return {
      ...data,
      guild,
      user
    };
  }
}exports.PresenceUpdateListener = PresenceUpdateListener;
class ReadyListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.Ready;
  parseRawData(data, client) {
    const user = new _User.User(client, data.user);
    return {
      ...data,
      rawUser: data.user,
      user
    };
  }
}exports.ReadyListener = ReadyListener;
class ResumedListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.Resumed;
  parseRawData(data) {
    return data;
  }
}exports.ResumedListener = ResumedListener;
class StageInstanceCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.StageInstanceCreate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.StageInstanceCreateListener = StageInstanceCreateListener;
class StageInstanceDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.StageInstanceDelete;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.StageInstanceDeleteListener = StageInstanceDeleteListener;
class StageInstanceUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.StageInstanceUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.StageInstanceUpdateListener = StageInstanceUpdateListener;
class SubscriptionCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.SubscriptionCreate;
  parseRawData(data, client) {
    const user = data.user_id ? new _User.User(client, data.user_id) : undefined;
    return {
      ...data,
      user
    };
  }
}exports.SubscriptionCreateListener = SubscriptionCreateListener;
class SubscriptionDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.SubscriptionDelete;
  parseRawData(data, client) {
    const user = data.user_id ? new _User.User(client, data.user_id) : undefined;
    return {
      ...data,
      user
    };
  }
}exports.SubscriptionDeleteListener = SubscriptionDeleteListener;
class SubscriptionUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.SubscriptionUpdate;
  parseRawData(data, client) {
    const user = data.user_id ? new _User.User(client, data.user_id) : undefined;
    return {
      ...data,
      user
    };
  }
}exports.SubscriptionUpdateListener = SubscriptionUpdateListener;
class ThreadCreateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.ThreadCreate;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const thread = new _GuildThreadChannel.GuildThreadChannel(client, data);
    return {
      guild,
      thread,
      ...data
    };
  }
}exports.ThreadCreateListener = ThreadCreateListener;
class ThreadDeleteListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.ThreadDelete;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.ThreadDeleteListener = ThreadDeleteListener;
class ThreadListSyncListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.ThreadListSync;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const threads = data.threads.map((thread) => new _GuildThreadChannel.GuildThreadChannel(client, thread));
    const members = data.members.map((member) => {
      return new _ThreadMember.ThreadMember(client, member, data.guild_id);
    });
    return {
      ...data,
      guild,
      threads,
      members,
      rawMembers: data.members,
      rawThreads: data.threads
    };
  }
}exports.ThreadListSyncListener = ThreadListSyncListener;
class ThreadMemberUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.ThreadMemberUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    if (!data.id)
    throw new Error("Thread ID not provided in payload when docs specified it would be");
    const thread = new _GuildThreadChannel.GuildThreadChannel(client, data.id);
    const member = data.member ?
    new _ThreadMember.ThreadMember(client, data, data.guild_id) :
    undefined;
    return {
      ...data,
      guild,
      thread,
      member
    };
  }
}exports.ThreadMemberUpdateListener = ThreadMemberUpdateListener;
class ThreadMembersUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.ThreadMembersUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    if (!data.id)
    throw new Error("Thread ID not provided in payload when docs specified it would be");
    const thread = new _GuildThreadChannel.GuildThreadChannel(client, data.id);
    const addedMembers = data.added_members?.map((member) => new _ThreadMember.ThreadMember(client, member, data.guild_id));
    const removedMembers = data.removed_member_ids?.map((id) => new _User.User(client, id));
    return {
      guild,
      thread,
      addedMembers,
      removedMembers,
      ...data
    };
  }
}exports.ThreadMembersUpdateListener = ThreadMembersUpdateListener;
class ThreadUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.ThreadUpdate;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    if (!data.id)
    throw new Error("Thread ID not provided in payload when docs specified it would be");
    const thread = new _GuildThreadChannel.GuildThreadChannel(client, data.id);
    return {
      guild,
      thread,
      ...data
    };
  }
}exports.ThreadUpdateListener = ThreadUpdateListener;
class TypingStartListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.TypingStart;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const member = guild && data.member ?
    new _GuildMember.GuildMember(client, data.member, guild) :
    undefined;
    const user = new _User.User(client, data.user_id);
    return {
      guild,
      member,
      user,
      rawMember: data.member,
      ...data
    };
  }
}exports.TypingStartListener = TypingStartListener;
class UserUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.UserUpdate;
  parseRawData(data, client) {
    const user = new _User.User(client, data);
    return {
      user,
      ...data
    };
  }
}exports.UserUpdateListener = UserUpdateListener;
class VoiceServerUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.VoiceServerUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      guild,
      ...data
    };
  }
}exports.VoiceServerUpdateListener = VoiceServerUpdateListener;
class VoiceStateUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.VoiceStateUpdate;
  parseRawData(data, client) {
    const guild = "guild_id" in data && typeof data.guild_id === "string" ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const member = guild && data.member ?
    new _GuildMember.GuildMember(client, data.member, guild) :
    undefined;
    return {
      ...data,
      rawMember: data.member,
      guild,
      member
    };
  }
}exports.VoiceStateUpdateListener = VoiceStateUpdateListener;
class WebhooksUpdateListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.WebhooksUpdate;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    return {
      ...data,
      guild
    };
  }
}exports.WebhooksUpdateListener = WebhooksUpdateListener;
class MessagePollVoteAddListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.MessagePollVoteAdd;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const user = new _User.User(client, data.user_id);
    const message = new _Message.Message(client, {
      id: data.message_id,
      channelId: data.channel_id
    });
    return {
      guild,
      user,
      message,
      ...data
    };
  }
}exports.MessagePollVoteAddListener = MessagePollVoteAddListener;
class MessagePollVoteRemoveListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.MessagePollVoteRemove;
  parseRawData(data, client) {
    const guild = data.guild_id ?
    new _Guild.Guild(client, data.guild_id) :
    undefined;
    const user = new _User.User(client, data.user_id);
    const message = new _Message.Message(client, {
      id: data.message_id,
      channelId: data.channel_id
    });
    return {
      guild,
      user,
      message,
      ...data
    };
  }
}exports.MessagePollVoteRemoveListener = MessagePollVoteRemoveListener;
class VoiceChannelEffectSendListener extends _BaseListener.BaseListener {
  type = _index.ListenerEvent.VoiceChannelEffectSend;
  parseRawData(data, client) {
    const guild = new _Guild.Guild(client, data.guild_id);
    const user = new _User.User(client, data.user_id);
    return {
      guild,
      user,
      ...data
    };
  }
}exports.VoiceChannelEffectSendListener = VoiceChannelEffectSendListener; /* v9-a9c473526c795401 */
