"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.deliverReplies = deliverReplies;exports.resolveMedia = resolveMedia;var _grammy = require("grammy");
var _chunk = require("../../auto-reply/chunk.js");
var _globals = require("../../globals.js");
var _errors = require("../../infra/errors.js");
var _constants = require("../../media/constants.js");
var _fetch = require("../../media/fetch.js");
var _mime = require("../../media/mime.js");
var _store = require("../../media/store.js");
var _media = require("../../web/media.js");
var _apiLogging = require("../api-logging.js");
var _caption = require("../caption.js");
var _format = require("../format.js");
var _send = require("../send.js");
var _stickerCache = require("../sticker-cache.js");
var _voice = require("../voice.js");
var _helpers = require("./helpers.js");
const PARSE_ERR_RE = /can't parse entities|parse entities|find end of the entity/i;
const VOICE_FORBIDDEN_RE = /VOICE_MESSAGES_FORBIDDEN/;
async function deliverReplies(params) {
  const { replies, chatId, runtime, bot, replyToMode, textLimit, thread, linkPreview, replyQuoteText } = params;
  const chunkMode = params.chunkMode ?? "length";
  let hasReplied = false;
  let hasDelivered = false;
  const markDelivered = () => {
    hasDelivered = true;
  };
  const chunkText = (markdown) => {
    const markdownChunks = chunkMode === "newline" ?
    (0, _chunk.chunkMarkdownTextWithMode)(markdown, textLimit, chunkMode) :
    [markdown];
    const chunks = [];
    for (const chunk of markdownChunks) {
      const nested = (0, _format.markdownToTelegramChunks)(chunk, textLimit, { tableMode: params.tableMode });
      if (!nested.length && chunk) {
        chunks.push({
          html: (0, _format.markdownToTelegramHtml)(chunk, { tableMode: params.tableMode }),
          text: chunk
        });
        continue;
      }
      chunks.push(...nested);
    }
    return chunks;
  };
  for (const reply of replies) {
    const hasMedia = Boolean(reply?.mediaUrl) || (reply?.mediaUrls?.length ?? 0) > 0;
    if (!reply?.text && !hasMedia) {
      if (reply?.audioAsVoice) {
        (0, _globals.logVerbose)("telegram reply has audioAsVoice without media/text; skipping");
        continue;
      }
      runtime.error?.((0, _globals.danger)("reply missing text/media"));
      continue;
    }
    const replyToId = replyToMode === "off" ? undefined : (0, _helpers.resolveTelegramReplyId)(reply.replyToId);
    const mediaList = reply.mediaUrls?.length ?
    reply.mediaUrls :
    reply.mediaUrl ?
    [reply.mediaUrl] :
    [];
    const telegramData = reply.channelData?.telegram;
    const replyMarkup = (0, _send.buildInlineKeyboard)(telegramData?.buttons);
    if (mediaList.length === 0) {
      const chunks = chunkText(reply.text || "");
      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        if (!chunk) {
          continue;
        }
        // Only attach buttons to the first chunk.
        const shouldAttachButtons = i === 0 && replyMarkup;
        await sendTelegramText(bot, chatId, chunk.html, runtime, {
          replyToMessageId: replyToId && (replyToMode === "all" || !hasReplied) ? replyToId : undefined,
          replyQuoteText,
          thread,
          textMode: "html",
          plainText: chunk.text,
          linkPreview,
          replyMarkup: shouldAttachButtons ? replyMarkup : undefined
        });
        markDelivered();
        if (replyToId && !hasReplied) {
          hasReplied = true;
        }
      }
      continue;
    }
    // media with optional caption on first item
    let first = true;
    // Track if we need to send a follow-up text message after media
    // (when caption exceeds Telegram's 1024-char limit)
    let pendingFollowUpText;
    for (const mediaUrl of mediaList) {
      const isFirstMedia = first;
      const media = await (0, _media.loadWebMedia)(mediaUrl);
      const kind = (0, _constants.mediaKindFromMime)(media.contentType ?? undefined);
      const isGif = (0, _mime.isGifMedia)({
        contentType: media.contentType,
        fileName: media.fileName
      });
      const fileName = media.fileName ?? (isGif ? "animation.gif" : "file");
      const file = new _grammy.InputFile(media.buffer, fileName);
      // Caption only on first item; if text exceeds limit, defer to follow-up message.
      const { caption, followUpText } = (0, _caption.splitTelegramCaption)(isFirstMedia ? reply.text ?? undefined : undefined);
      const htmlCaption = caption ?
      (0, _format.renderTelegramHtmlText)(caption, { tableMode: params.tableMode }) :
      undefined;
      if (followUpText) {
        pendingFollowUpText = followUpText;
      }
      first = false;
      const replyToMessageId = replyToId && (replyToMode === "all" || !hasReplied) ? replyToId : undefined;
      const shouldAttachButtonsToMedia = isFirstMedia && replyMarkup && !followUpText;
      const mediaParams = {
        caption: htmlCaption,
        ...(htmlCaption ? { parse_mode: "HTML" } : {}),
        ...(shouldAttachButtonsToMedia ? { reply_markup: replyMarkup } : {}),
        ...buildTelegramSendParams({
          replyToMessageId,
          replyQuoteText,
          thread
        })
      };
      if (isGif) {
        await (0, _apiLogging.withTelegramApiErrorLogging)({
          operation: "sendAnimation",
          runtime,
          fn: () => bot.api.sendAnimation(chatId, file, { ...mediaParams })
        });
        markDelivered();
      } else
      if (kind === "image") {
        await (0, _apiLogging.withTelegramApiErrorLogging)({
          operation: "sendPhoto",
          runtime,
          fn: () => bot.api.sendPhoto(chatId, file, { ...mediaParams })
        });
        markDelivered();
      } else
      if (kind === "video") {
        await (0, _apiLogging.withTelegramApiErrorLogging)({
          operation: "sendVideo",
          runtime,
          fn: () => bot.api.sendVideo(chatId, file, { ...mediaParams })
        });
        markDelivered();
      } else
      if (kind === "audio") {
        const { useVoice } = (0, _voice.resolveTelegramVoiceSend)({
          wantsVoice: reply.audioAsVoice === true, // default false (backward compatible)
          contentType: media.contentType,
          fileName,
          logFallback: _globals.logVerbose
        });
        if (useVoice) {
          // Voice message - displays as round playable bubble (opt-in via [[audio_as_voice]])
          // Switch typing indicator to record_voice before sending.
          await params.onVoiceRecording?.();
          try {
            await (0, _apiLogging.withTelegramApiErrorLogging)({
              operation: "sendVoice",
              runtime,
              shouldLog: (err) => !isVoiceMessagesForbidden(err),
              fn: () => bot.api.sendVoice(chatId, file, { ...mediaParams })
            });
            markDelivered();
          }
          catch (voiceErr) {
            // Fall back to text if voice messages are forbidden in this chat.
            // This happens when the recipient has Telegram Premium privacy settings
            // that block voice messages (Settings > Privacy > Voice Messages).
            if (isVoiceMessagesForbidden(voiceErr)) {
              const fallbackText = reply.text;
              if (!fallbackText || !fallbackText.trim()) {
                throw voiceErr;
              }
              (0, _globals.logVerbose)("telegram sendVoice forbidden (recipient has voice messages blocked in privacy settings); falling back to text");
              hasReplied = await sendTelegramVoiceFallbackText({
                bot,
                chatId,
                runtime,
                text: fallbackText,
                chunkText,
                replyToId,
                replyToMode,
                hasReplied,
                thread,
                linkPreview,
                replyMarkup,
                replyQuoteText
              });
              markDelivered();
              // Skip this media item; continue with next.
              continue;
            }
            throw voiceErr;
          }
        } else
        {
          // Audio file - displays with metadata (title, duration) - DEFAULT
          await (0, _apiLogging.withTelegramApiErrorLogging)({
            operation: "sendAudio",
            runtime,
            fn: () => bot.api.sendAudio(chatId, file, { ...mediaParams })
          });
          markDelivered();
        }
      } else
      {
        await (0, _apiLogging.withTelegramApiErrorLogging)({
          operation: "sendDocument",
          runtime,
          fn: () => bot.api.sendDocument(chatId, file, { ...mediaParams })
        });
        markDelivered();
      }
      if (replyToId && !hasReplied) {
        hasReplied = true;
      }
      // Send deferred follow-up text right after the first media item.
      // Chunk it in case it's extremely long (same logic as text-only replies).
      if (pendingFollowUpText && isFirstMedia) {
        const chunks = chunkText(pendingFollowUpText);
        for (let i = 0; i < chunks.length; i += 1) {
          const chunk = chunks[i];
          const replyToMessageIdFollowup = replyToId && (replyToMode === "all" || !hasReplied) ? replyToId : undefined;
          await sendTelegramText(bot, chatId, chunk.html, runtime, {
            replyToMessageId: replyToMessageIdFollowup,
            thread,
            textMode: "html",
            plainText: chunk.text,
            linkPreview,
            replyMarkup: i === 0 ? replyMarkup : undefined
          });
          markDelivered();
          if (replyToId && !hasReplied) {
            hasReplied = true;
          }
        }
        pendingFollowUpText = undefined;
      }
    }
  }
  return { delivered: hasDelivered };
}
async function resolveMedia(ctx, maxBytes, token, proxyFetch) {
  const msg = ctx.message;
  // Handle stickers separately - only static stickers (WEBP) are supported
  if (msg.sticker) {
    const sticker = msg.sticker;
    // Skip animated (TGS) and video (WEBM) stickers - only static WEBP supported
    if (sticker.is_animated || sticker.is_video) {
      (0, _globals.logVerbose)("telegram: skipping animated/video sticker (only static stickers supported)");
      return null;
    }
    if (!sticker.file_id) {
      return null;
    }
    try {
      const file = await ctx.getFile();
      if (!file.file_path) {
        (0, _globals.logVerbose)("telegram: getFile returned no file_path for sticker");
        return null;
      }
      const fetchImpl = proxyFetch ?? globalThis.fetch;
      if (!fetchImpl) {
        (0, _globals.logVerbose)("telegram: fetch not available for sticker download");
        return null;
      }
      const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const fetched = await (0, _fetch.fetchRemoteMedia)({
        url,
        fetchImpl,
        filePathHint: file.file_path
      });
      const originalName = fetched.fileName ?? file.file_path;
      const saved = await (0, _store.saveMediaBuffer)(fetched.buffer, fetched.contentType, "inbound", maxBytes, originalName);
      // Check sticker cache for existing description
      const cached = sticker.file_unique_id ? (0, _stickerCache.getCachedSticker)(sticker.file_unique_id) : null;
      if (cached) {
        (0, _globals.logVerbose)(`telegram: sticker cache hit for ${sticker.file_unique_id}`);
        const fileId = sticker.file_id ?? cached.fileId;
        const emoji = sticker.emoji ?? cached.emoji;
        const setName = sticker.set_name ?? cached.setName;
        if (fileId !== cached.fileId || emoji !== cached.emoji || setName !== cached.setName) {
          // Refresh cached sticker metadata on hits so sends/searches use latest file_id.
          (0, _stickerCache.cacheSticker)({
            ...cached,
            fileId,
            emoji,
            setName
          });
        }
        return {
          path: saved.path,
          contentType: saved.contentType,
          placeholder: "<media:sticker>",
          stickerMetadata: {
            emoji,
            setName,
            fileId,
            fileUniqueId: sticker.file_unique_id,
            cachedDescription: cached.description
          }
        };
      }
      // Cache miss - return metadata for vision processing
      return {
        path: saved.path,
        contentType: saved.contentType,
        placeholder: "<media:sticker>",
        stickerMetadata: {
          emoji: sticker.emoji ?? undefined,
          setName: sticker.set_name ?? undefined,
          fileId: sticker.file_id,
          fileUniqueId: sticker.file_unique_id
        }
      };
    }
    catch (err) {
      (0, _globals.logVerbose)(`telegram: failed to process sticker: ${String(err)}`);
      return null;
    }
  }
  const m = msg.photo?.[msg.photo.length - 1] ??
  msg.video ??
  msg.video_note ??
  msg.document ??
  msg.audio ??
  msg.voice;
  if (!m?.file_id) {
    return null;
  }
  const file = await ctx.getFile();
  if (!file.file_path) {
    throw new Error("Telegram getFile returned no file_path");
  }
  const fetchImpl = proxyFetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("fetch is not available; set channels.telegram.proxy in config");
  }
  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  const fetched = await (0, _fetch.fetchRemoteMedia)({
    url,
    fetchImpl,
    filePathHint: file.file_path
  });
  const originalName = fetched.fileName ?? file.file_path;
  const saved = await (0, _store.saveMediaBuffer)(fetched.buffer, fetched.contentType, "inbound", maxBytes, originalName);
  let placeholder = "<media:document>";
  if (msg.photo) {
    placeholder = "<media:image>";
  } else
  if (msg.video) {
    placeholder = "<media:video>";
  } else
  if (msg.video_note) {
    placeholder = "<media:video>";
  } else
  if (msg.audio || msg.voice) {
    placeholder = "<media:audio>";
  }
  return { path: saved.path, contentType: saved.contentType, placeholder };
}
function isVoiceMessagesForbidden(err) {
  if (err instanceof _grammy.GrammyError) {
    return VOICE_FORBIDDEN_RE.test(err.description);
  }
  return VOICE_FORBIDDEN_RE.test((0, _errors.formatErrorMessage)(err));
}
async function sendTelegramVoiceFallbackText(opts) {
  const chunks = opts.chunkText(opts.text);
  let hasReplied = opts.hasReplied;
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    await sendTelegramText(opts.bot, opts.chatId, chunk.html, opts.runtime, {
      replyToMessageId: opts.replyToId && (opts.replyToMode === "all" || !hasReplied) ? opts.replyToId : undefined,
      replyQuoteText: opts.replyQuoteText,
      thread: opts.thread,
      textMode: "html",
      plainText: chunk.text,
      linkPreview: opts.linkPreview,
      replyMarkup: i === 0 ? opts.replyMarkup : undefined
    });
    if (opts.replyToId && !hasReplied) {
      hasReplied = true;
    }
  }
  return hasReplied;
}
function buildTelegramSendParams(opts) {
  const threadParams = (0, _helpers.buildTelegramThreadParams)(opts?.thread);
  const params = {};
  const quoteText = opts?.replyQuoteText?.trim();
  if (opts?.replyToMessageId) {
    if (quoteText) {
      params.reply_parameters = {
        message_id: Math.trunc(opts.replyToMessageId),
        quote: quoteText
      };
    } else
    {
      params.reply_to_message_id = opts.replyToMessageId;
    }
  }
  if (threadParams) {
    params.message_thread_id = threadParams.message_thread_id;
  }
  return params;
}
async function sendTelegramText(bot, chatId, text, runtime, opts) {
  const baseParams = buildTelegramSendParams({
    replyToMessageId: opts?.replyToMessageId,
    replyQuoteText: opts?.replyQuoteText,
    thread: opts?.thread
  });
  // Add link_preview_options when link preview is disabled.
  const linkPreviewEnabled = opts?.linkPreview ?? true;
  const linkPreviewOptions = linkPreviewEnabled ? undefined : { is_disabled: true };
  const textMode = opts?.textMode ?? "markdown";
  const htmlText = textMode === "html" ? text : (0, _format.markdownToTelegramHtml)(text);
  try {
    const res = await (0, _apiLogging.withTelegramApiErrorLogging)({
      operation: "sendMessage",
      runtime,
      shouldLog: (err) => !PARSE_ERR_RE.test((0, _errors.formatErrorMessage)(err)),
      fn: () => bot.api.sendMessage(chatId, htmlText, {
        parse_mode: "HTML",
        ...(linkPreviewOptions ? { link_preview_options: linkPreviewOptions } : {}),
        ...(opts?.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
        ...baseParams
      })
    });
    return res.message_id;
  }
  catch (err) {
    const errText = (0, _errors.formatErrorMessage)(err);
    if (PARSE_ERR_RE.test(errText)) {
      runtime.log?.(`telegram HTML parse failed; retrying without formatting: ${errText}`);
      const fallbackText = opts?.plainText ?? text;
      const res = await (0, _apiLogging.withTelegramApiErrorLogging)({
        operation: "sendMessage",
        runtime,
        fn: () => bot.api.sendMessage(chatId, fallbackText, {
          ...(linkPreviewOptions ? { link_preview_options: linkPreviewOptions } : {}),
          ...(opts?.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
          ...baseParams
        })
      });
      return res.message_id;
    }
    throw err;
  }
} /* v9-c5b4224d2fc204dc */
