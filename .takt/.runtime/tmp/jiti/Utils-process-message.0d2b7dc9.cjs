"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.cleanMessage = void 0;exports.decryptEventResponse = decryptEventResponse;exports.decryptPollVote = decryptPollVote;exports.shouldIncrementChatUnread = exports.isRealMessage = exports.getChatId = exports.default = void 0;var _index = require("../../WAProto/index.js");
var _index2 = require("../Types/index.js");
var _messages = require("../Utils/messages.js");
var _index3 = require("../WABinary/index.js");
var _crypto = require("./crypto.js");
var _generics = require("./generics.js");
var _history = require("./history.js");
const REAL_MSG_STUB_TYPES = new Set([
_index2.WAMessageStubType.CALL_MISSED_GROUP_VIDEO,
_index2.WAMessageStubType.CALL_MISSED_GROUP_VOICE,
_index2.WAMessageStubType.CALL_MISSED_VIDEO,
_index2.WAMessageStubType.CALL_MISSED_VOICE]
);
const REAL_MSG_REQ_ME_STUB_TYPES = new Set([_index2.WAMessageStubType.GROUP_PARTICIPANT_ADD]);
/** Cleans a received message to further processing */
const cleanMessage = (message, meId, meLid) => {
  // ensure remoteJid and participant doesn't have device or agent in it
  if ((0, _index3.isHostedPnUser)(message.key.remoteJid) || (0, _index3.isHostedLidUser)(message.key.remoteJid)) {
    message.key.remoteJid = (0, _index3.jidEncode)((0, _index3.jidDecode)(message.key?.remoteJid)?.user, (0, _index3.isHostedPnUser)(message.key.remoteJid) ? 's.whatsapp.net' : 'lid');
  } else
  {
    message.key.remoteJid = (0, _index3.jidNormalizedUser)(message.key.remoteJid);
  }
  if ((0, _index3.isHostedPnUser)(message.key.participant) || (0, _index3.isHostedLidUser)(message.key.participant)) {
    message.key.participant = (0, _index3.jidEncode)((0, _index3.jidDecode)(message.key.participant)?.user, (0, _index3.isHostedPnUser)(message.key.participant) ? 's.whatsapp.net' : 'lid');
  } else
  {
    message.key.participant = (0, _index3.jidNormalizedUser)(message.key.participant);
  }
  const content = (0, _messages.normalizeMessageContent)(message.message);
  // if the message has a reaction, ensure fromMe & remoteJid are from our perspective
  if (content?.reactionMessage) {
    normaliseKey(content.reactionMessage.key);
  }
  if (content?.pollUpdateMessage) {
    normaliseKey(content.pollUpdateMessage.pollCreationMessageKey);
  }
  function normaliseKey(msgKey) {
    // if the reaction is from another user
    // we've to correctly map the key to this user's perspective
    if (!message.key.fromMe) {
      // if the sender believed the message being reacted to is not from them
      // we've to correct the key to be from them, or some other participant
      msgKey.fromMe = !msgKey.fromMe ?
      (0, _index3.areJidsSameUser)(msgKey.participant || msgKey.remoteJid, meId) ||
      (0, _index3.areJidsSameUser)(msgKey.participant || msgKey.remoteJid, meLid) :
      // if the message being reacted to, was from them
      // fromMe automatically becomes false
      false;
      // set the remoteJid to being the same as the chat the message came from
      // TODO: investigate inconsistencies
      msgKey.remoteJid = message.key.remoteJid;
      // set participant of the message
      msgKey.participant = msgKey.participant || message.key.participant;
    }
  }
};
// TODO: target:audit AUDIT THIS FUNCTION AGAIN
exports.cleanMessage = cleanMessage;const isRealMessage = (message) => {
  const normalizedContent = (0, _messages.normalizeMessageContent)(message.message);
  const hasSomeContent = !!(0, _messages.getContentType)(normalizedContent);
  return (!!normalizedContent ||
  REAL_MSG_STUB_TYPES.has(message.messageStubType) ||
  REAL_MSG_REQ_ME_STUB_TYPES.has(message.messageStubType)) &&
  hasSomeContent &&
  !normalizedContent?.protocolMessage &&
  !normalizedContent?.reactionMessage &&
  !normalizedContent?.pollUpdateMessage;
};exports.isRealMessage = isRealMessage;
const shouldIncrementChatUnread = (message) => !message.key.fromMe && !message.messageStubType;
/**
 * Get the ID of the chat from the given key.
 * Typically -- that'll be the remoteJid, but for broadcasts, it'll be the participant
 */exports.shouldIncrementChatUnread = shouldIncrementChatUnread;
const getChatId = ({ remoteJid, participant, fromMe }) => {
  if ((0, _index3.isJidBroadcast)(remoteJid) && !(0, _index3.isJidStatusBroadcast)(remoteJid) && !fromMe) {
    return participant;
  }
  return remoteJid;
};
/**
 * Decrypt a poll vote
 * @param vote encrypted vote
 * @param ctx additional info about the poll required for decryption
 * @returns list of SHA256 options
 */exports.getChatId = getChatId;
function decryptPollVote({ encPayload, encIv }, { pollCreatorJid, pollMsgId, pollEncKey, voterJid }) {
  const sign = Buffer.concat([
  toBinary(pollMsgId),
  toBinary(pollCreatorJid),
  toBinary(voterJid),
  toBinary('Poll Vote'),
  new Uint8Array([1])]
  );
  const key0 = (0, _crypto.hmacSign)(pollEncKey, new Uint8Array(32), 'sha256');
  const decKey = (0, _crypto.hmacSign)(sign, key0, 'sha256');
  const aad = toBinary(`${pollMsgId}\u0000${voterJid}`);
  const decrypted = (0, _crypto.aesDecryptGCM)(encPayload, decKey, encIv, aad);
  return _index.proto.Message.PollVoteMessage.decode(decrypted);
  function toBinary(txt) {
    return Buffer.from(txt);
  }
}
/**
 * Decrypt an event response
 * @param response encrypted event response
 * @param ctx additional info about the event required for decryption
 * @returns event response message
 */
function decryptEventResponse({ encPayload, encIv }, { eventCreatorJid, eventMsgId, eventEncKey, responderJid }) {
  const sign = Buffer.concat([
  toBinary(eventMsgId),
  toBinary(eventCreatorJid),
  toBinary(responderJid),
  toBinary('Event Response'),
  new Uint8Array([1])]
  );
  const key0 = (0, _crypto.hmacSign)(eventEncKey, new Uint8Array(32), 'sha256');
  const decKey = (0, _crypto.hmacSign)(sign, key0, 'sha256');
  const aad = toBinary(`${eventMsgId}\u0000${responderJid}`);
  const decrypted = (0, _crypto.aesDecryptGCM)(encPayload, decKey, encIv, aad);
  return _index.proto.Message.EventResponseMessage.decode(decrypted);
  function toBinary(txt) {
    return Buffer.from(txt);
  }
}
const processMessage = async (message, { shouldProcessHistoryMsg, placeholderResendCache, ev, creds, signalRepository, keyStore, logger, options, getMessage }) => {
  const meId = creds.me.id;
  const { accountSettings } = creds;
  const chat = { id: (0, _index3.jidNormalizedUser)(getChatId(message.key)) };
  const isRealMsg = isRealMessage(message);
  if (isRealMsg) {
    chat.messages = [{ message }];
    chat.conversationTimestamp = (0, _generics.toNumber)(message.messageTimestamp);
    // only increment unread count if not CIPHERTEXT and from another person
    if (shouldIncrementChatUnread(message)) {
      chat.unreadCount = (chat.unreadCount || 0) + 1;
    }
  }
  const content = (0, _messages.normalizeMessageContent)(message.message);
  // unarchive chat if it's a real message, or someone reacted to our message
  // and we've the unarchive chats setting on
  if ((isRealMsg || content?.reactionMessage?.key?.fromMe) && accountSettings?.unarchiveChats) {
    chat.archived = false;
    chat.readOnly = false;
  }
  const protocolMsg = content?.protocolMessage;
  if (protocolMsg) {
    switch (protocolMsg.type) {
      case _index.proto.Message.ProtocolMessage.Type.HISTORY_SYNC_NOTIFICATION:
        const histNotification = protocolMsg.historySyncNotification;
        const process = shouldProcessHistoryMsg;
        const isLatest = !creds.processedHistoryMessages?.length;
        logger?.info({
          histNotification,
          process,
          id: message.key.id,
          isLatest
        }, 'got history notification');
        if (process) {
          // TODO: investigate
          if (histNotification.syncType !== _index.proto.HistorySync.HistorySyncType.ON_DEMAND) {
            ev.emit('creds.update', {
              processedHistoryMessages: [
              ...(creds.processedHistoryMessages || []),
              { key: message.key, messageTimestamp: message.messageTimestamp }]

            });
          }
          const data = await (0, _history.downloadAndProcessHistorySyncNotification)(histNotification, options);
          ev.emit('messaging-history.set', {
            ...data,
            isLatest: histNotification.syncType !== _index.proto.HistorySync.HistorySyncType.ON_DEMAND ? isLatest : undefined,
            peerDataRequestSessionId: histNotification.peerDataRequestSessionId
          });
        }
        break;
      case _index.proto.Message.ProtocolMessage.Type.APP_STATE_SYNC_KEY_SHARE:
        const keys = protocolMsg.appStateSyncKeyShare.keys;
        if (keys?.length) {
          let newAppStateSyncKeyId = '';
          await keyStore.transaction(async () => {
            const newKeys = [];
            for (const { keyData, keyId } of keys) {
              const strKeyId = Buffer.from(keyId.keyId).toString('base64');
              newKeys.push(strKeyId);
              await keyStore.set({ 'app-state-sync-key': { [strKeyId]: keyData } });
              newAppStateSyncKeyId = strKeyId;
            }
            logger?.info({ newAppStateSyncKeyId, newKeys }, 'injecting new app state sync keys');
          }, meId);
          ev.emit('creds.update', { myAppStateKeyId: newAppStateSyncKeyId });
        } else
        {
          logger?.info({ protocolMsg }, 'recv app state sync with 0 keys');
        }
        break;
      case _index.proto.Message.ProtocolMessage.Type.REVOKE:
        ev.emit('messages.update', [
        {
          key: {
            ...message.key,
            id: protocolMsg.key.id
          },
          update: { message: null, messageStubType: _index2.WAMessageStubType.REVOKE, key: message.key }
        }]
        );
        break;
      case _index.proto.Message.ProtocolMessage.Type.EPHEMERAL_SETTING:
        Object.assign(chat, {
          ephemeralSettingTimestamp: (0, _generics.toNumber)(message.messageTimestamp),
          ephemeralExpiration: protocolMsg.ephemeralExpiration || null
        });
        break;
      case _index.proto.Message.ProtocolMessage.Type.PEER_DATA_OPERATION_REQUEST_RESPONSE_MESSAGE:
        const response = protocolMsg.peerDataOperationRequestResponseMessage;
        if (response) {
          await placeholderResendCache?.del(response.stanzaId);
          // TODO: IMPLEMENT HISTORY SYNC ETC (sticker uploads etc.).
          const { peerDataOperationResult } = response;
          for (const result of peerDataOperationResult) {
            const { placeholderMessageResendResponse: retryResponse } = result;
            //eslint-disable-next-line max-depth
            if (retryResponse) {
              const webMessageInfo = _index.proto.WebMessageInfo.decode(retryResponse.webMessageInfoBytes);
              // wait till another upsert event is available, don't want it to be part of the PDO response message
              // TODO: parse through proper message handling utilities (to add relevant key fields)
              setTimeout(() => {
                ev.emit('messages.upsert', {
                  messages: [webMessageInfo],
                  type: 'notify',
                  requestId: response.stanzaId
                });
              }, 500);
            }
          }
        }
        break;
      case _index.proto.Message.ProtocolMessage.Type.MESSAGE_EDIT:
        ev.emit('messages.update', [
        {
          // flip the sender / fromMe properties because they're in the perspective of the sender
          key: { ...message.key, id: protocolMsg.key?.id },
          update: {
            message: {
              editedMessage: {
                message: protocolMsg.editedMessage
              }
            },
            messageTimestamp: protocolMsg.timestampMs ?
            Math.floor((0, _generics.toNumber)(protocolMsg.timestampMs) / 1000) :
            message.messageTimestamp
          }
        }]
        );
        break;
      case _index.proto.Message.ProtocolMessage.Type.LID_MIGRATION_MAPPING_SYNC:
        const encodedPayload = protocolMsg.lidMigrationMappingSyncMessage?.encodedMappingPayload;
        const { pnToLidMappings, chatDbMigrationTimestamp } = _index.proto.LIDMigrationMappingSyncPayload.decode(encodedPayload);
        logger?.debug({ pnToLidMappings, chatDbMigrationTimestamp }, 'got lid mappings and chat db migration timestamp');
        const pairs = [];
        for (const { pn, latestLid, assignedLid } of pnToLidMappings) {
          const lid = latestLid || assignedLid;
          pairs.push({ lid: `${lid}@lid`, pn: `${pn}@s.whatsapp.net` });
        }
        await signalRepository.lidMapping.storeLIDPNMappings(pairs);
        if (pairs.length) {
          for (const { pn, lid } of pairs) {
            await signalRepository.migrateSession(pn, lid);
          }
        }
    }
  } else
  if (content?.reactionMessage) {
    const reaction = {
      ...content.reactionMessage,
      key: message.key
    };
    ev.emit('messages.reaction', [
    {
      reaction,
      key: content.reactionMessage?.key
    }]
    );
  } else
  if (content?.encEventResponseMessage) {
    const encEventResponse = content.encEventResponseMessage;
    const creationMsgKey = encEventResponse.eventCreationMessageKey;
    // we need to fetch the event creation message to get the event enc key
    const eventMsg = await getMessage(creationMsgKey);
    if (eventMsg) {
      try {
        const meIdNormalised = (0, _index3.jidNormalizedUser)(meId);
        // all jids need to be PN
        const eventCreatorKey = creationMsgKey.participant || creationMsgKey.remoteJid;
        const eventCreatorPn = (0, _index3.isLidUser)(eventCreatorKey) ?
        await signalRepository.lidMapping.getPNForLID(eventCreatorKey) :
        eventCreatorKey;
        const eventCreatorJid = (0, _generics.getKeyAuthor)({ remoteJid: (0, _index3.jidNormalizedUser)(eventCreatorPn), fromMe: meIdNormalised === eventCreatorPn }, meIdNormalised);
        const responderJid = (0, _generics.getKeyAuthor)(message.key, meIdNormalised);
        const eventEncKey = eventMsg?.messageContextInfo?.messageSecret;
        if (!eventEncKey) {
          logger?.warn({ creationMsgKey }, 'event response: missing messageSecret for decryption');
        } else
        {
          const responseMsg = decryptEventResponse(encEventResponse, {
            eventEncKey,
            eventCreatorJid,
            eventMsgId: creationMsgKey.id,
            responderJid
          });
          const eventResponse = {
            eventResponseMessageKey: message.key,
            senderTimestampMs: responseMsg.timestampMs,
            response: responseMsg
          };
          ev.emit('messages.update', [
          {
            key: creationMsgKey,
            update: {
              eventResponses: [eventResponse]
            }
          }]
          );
        }
      }
      catch (err) {
        logger?.warn({ err, creationMsgKey }, 'failed to decrypt event response');
      }
    } else
    {
      logger?.warn({ creationMsgKey }, 'event creation message not found, cannot decrypt response');
    }
  } else
  if (message.messageStubType) {
    const jid = message.key?.remoteJid;
    //let actor = whatsappID (message.participant)
    let participants;
    const emitParticipantsUpdate = (action) => ev.emit('group-participants.update', {
      id: jid,
      author: message.key.participant,
      authorPn: message.key.participantAlt,
      participants,
      action
    });
    const emitGroupUpdate = (update) => {
      ev.emit('groups.update', [
      { id: jid, ...update, author: message.key.participant ?? undefined, authorPn: message.key.participantAlt }]
      );
    };
    const emitGroupRequestJoin = (participant, action, method) => {
      ev.emit('group.join-request', {
        id: jid,
        author: message.key.participant,
        authorPn: message.key.participantAlt,
        participant: participant.lid,
        participantPn: participant.pn,
        action,
        method: method
      });
    };
    const participantsIncludesMe = () => participants.find((jid) => (0, _index3.areJidsSameUser)(meId, jid.phoneNumber)); // ADD SUPPORT FOR LID
    switch (message.messageStubType) {
      case _index2.WAMessageStubType.GROUP_PARTICIPANT_CHANGE_NUMBER:
        participants = message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        emitParticipantsUpdate('modify');
        break;
      case _index2.WAMessageStubType.GROUP_PARTICIPANT_LEAVE:
      case _index2.WAMessageStubType.GROUP_PARTICIPANT_REMOVE:
        participants = message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        emitParticipantsUpdate('remove');
        // mark the chat read only if you left the group
        if (participantsIncludesMe()) {
          chat.readOnly = true;
        }
        break;
      case _index2.WAMessageStubType.GROUP_PARTICIPANT_ADD:
      case _index2.WAMessageStubType.GROUP_PARTICIPANT_INVITE:
      case _index2.WAMessageStubType.GROUP_PARTICIPANT_ADD_REQUEST_JOIN:
        participants = message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        if (participantsIncludesMe()) {
          chat.readOnly = false;
        }
        emitParticipantsUpdate('add');
        break;
      case _index2.WAMessageStubType.GROUP_PARTICIPANT_DEMOTE:
        participants = message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        emitParticipantsUpdate('demote');
        break;
      case _index2.WAMessageStubType.GROUP_PARTICIPANT_PROMOTE:
        participants = message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        emitParticipantsUpdate('promote');
        break;
      case _index2.WAMessageStubType.GROUP_CHANGE_ANNOUNCE:
        const announceValue = message.messageStubParameters?.[0];
        emitGroupUpdate({ announce: announceValue === 'true' || announceValue === 'on' });
        break;
      case _index2.WAMessageStubType.GROUP_CHANGE_RESTRICT:
        const restrictValue = message.messageStubParameters?.[0];
        emitGroupUpdate({ restrict: restrictValue === 'true' || restrictValue === 'on' });
        break;
      case _index2.WAMessageStubType.GROUP_CHANGE_SUBJECT:
        const name = message.messageStubParameters?.[0];
        chat.name = name;
        emitGroupUpdate({ subject: name });
        break;
      case _index2.WAMessageStubType.GROUP_CHANGE_DESCRIPTION:
        const description = message.messageStubParameters?.[0];
        chat.description = description;
        emitGroupUpdate({ desc: description });
        break;
      case _index2.WAMessageStubType.GROUP_CHANGE_INVITE_LINK:
        const code = message.messageStubParameters?.[0];
        emitGroupUpdate({ inviteCode: code });
        break;
      case _index2.WAMessageStubType.GROUP_MEMBER_ADD_MODE:
        const memberAddValue = message.messageStubParameters?.[0];
        emitGroupUpdate({ memberAddMode: memberAddValue === 'all_member_add' });
        break;
      case _index2.WAMessageStubType.GROUP_MEMBERSHIP_JOIN_APPROVAL_MODE:
        const approvalMode = message.messageStubParameters?.[0];
        emitGroupUpdate({ joinApprovalMode: approvalMode === 'on' });
        break;
      case _index2.WAMessageStubType.GROUP_MEMBERSHIP_JOIN_APPROVAL_REQUEST_NON_ADMIN_ADD: // TODO: Add other events
        const participant = JSON.parse(message.messageStubParameters?.[0]);
        const action = message.messageStubParameters?.[1];
        const method = message.messageStubParameters?.[2];
        emitGroupRequestJoin(participant, action, method);
        break;
    }
  } /*  else if(content?.pollUpdateMessage) {
    const creationMsgKey = content.pollUpdateMessage.pollCreationMessageKey!
    // we need to fetch the poll creation message to get the poll enc key
    // TODO: make standalone, remove getMessage reference
    // TODO: Remove entirely
    const pollMsg = await getMessage(creationMsgKey)
    if(pollMsg) {
        const meIdNormalised = jidNormalizedUser(meId)
        const pollCreatorJid = getKeyAuthor(creationMsgKey, meIdNormalised)
        const voterJid = getKeyAuthor(message.key, meIdNormalised)
        const pollEncKey = pollMsg.messageContextInfo?.messageSecret!
         try {
            const voteMsg = decryptPollVote(
                content.pollUpdateMessage.vote!,
                {
                    pollEncKey,
                    pollCreatorJid,
                    pollMsgId: creationMsgKey.id!,
                    voterJid,
                }
            )
            ev.emit('messages.update', [
                {
                    key: creationMsgKey,
                    update: {
                        pollUpdates: [
                            {
                                pollUpdateMessageKey: message.key,
                                vote: voteMsg,
                                senderTimestampMs: (content.pollUpdateMessage.senderTimestampMs! as Long).toNumber(),
                            }
                        ]
                    }
                }
            ])
        } catch(err) {
            logger?.warn(
                { err, creationMsgKey },
                'failed to decrypt poll vote'
            )
        }
    } else {
        logger?.warn(
            { creationMsgKey },
            'poll creation message not found, cannot decrypt update'
        )
    }
    } */

  if (Object.keys(chat).length > 1) {
    ev.emit('chats.update', [chat]);
  }
};var _default = exports.default =
processMessage; /* v9-eeb391cd1800c4a7 */
