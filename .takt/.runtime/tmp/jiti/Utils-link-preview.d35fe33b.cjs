"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getUrlInfo = void 0;var _messages = require("./messages.js");
var _messagesMedia = require("./messages-media.js");function _interopRequireWildcard(e, t) {if ("function" == typeof WeakMap) var r = new WeakMap(),n = new WeakMap();return (_interopRequireWildcard = function (e, t) {if (!t && e && e.__esModule) return e;var o,i,f = { __proto__: null, default: e };if (null === e || "object" != typeof e && "function" != typeof e) return f;if (o = t ? n : r) {if (o.has(e)) return o.get(e);o.set(e, f);}for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);return f;})(e, t);}
const THUMBNAIL_WIDTH_PX = 192;
/** Fetches an image and generates a thumbnail for it */
const getCompressedJpegThumbnail = async (url, { thumbnailWidth, fetchOpts }) => {
  const stream = await (0, _messagesMedia.getHttpStream)(url, fetchOpts);
  const result = await (0, _messagesMedia.extractImageThumb)(stream, thumbnailWidth);
  return result;
};
/**
 * Given a piece of text, checks for any URL present, generates link preview for the same and returns it
 * Return undefined if the fetch failed or no URL was found
 * @param text first matched URL in text
 * @returns the URL info required to generate link preview
 */
const getUrlInfo = async (text, opts = {
  thumbnailWidth: THUMBNAIL_WIDTH_PX,
  fetchOpts: { timeout: 3000 }
}) => {
  try {
    // retries
    const retries = 0;
    const maxRetry = 5;
    const { getLinkPreview } = await Promise.resolve().then(() => jitiImport('link-preview-js').then((m) => _interopRequireWildcard(m)));
    let previewLink = text;
    if (!text.startsWith('https://') && !text.startsWith('http://')) {
      previewLink = 'https://' + previewLink;
    }
    const info = await getLinkPreview(previewLink, {
      ...opts.fetchOpts,
      followRedirects: 'follow',
      handleRedirects: (baseURL, forwardedURL) => {
        const urlObj = new URL(baseURL);
        const forwardedURLObj = new URL(forwardedURL);
        if (retries >= maxRetry) {
          return false;
        }
        if (forwardedURLObj.hostname === urlObj.hostname ||
        forwardedURLObj.hostname === 'www.' + urlObj.hostname ||
        'www.' + forwardedURLObj.hostname === urlObj.hostname) {
          retries + 1;
          return true;
        } else
        {
          return false;
        }
      },
      headers: opts.fetchOpts?.headers
    });
    if (info && 'title' in info && info.title) {
      const [image] = info.images;
      const urlInfo = {
        'canonical-url': info.url,
        'matched-text': text,
        title: info.title,
        description: info.description,
        originalThumbnailUrl: image
      };
      if (opts.uploadImage) {
        const { imageMessage } = await (0, _messages.prepareWAMessageMedia)({ image: { url: image } }, {
          upload: opts.uploadImage,
          mediaTypeOverride: 'thumbnail-link',
          options: opts.fetchOpts
        });
        urlInfo.jpegThumbnail = imageMessage?.jpegThumbnail ? Buffer.from(imageMessage.jpegThumbnail) : undefined;
        urlInfo.highQualityThumbnail = imageMessage || undefined;
      } else
      {
        try {
          urlInfo.jpegThumbnail = image ? (await getCompressedJpegThumbnail(image, opts)).buffer : undefined;
        }
        catch (error) {
          opts.logger?.debug({ err: error.stack, url: previewLink }, 'error in generating thumbnail');
        }
      }
      return urlInfo;
    }
  }
  catch (error) {
    if (!error.message.includes('receive a valid')) {
      throw error;
    }
  }
};exports.getUrlInfo = getUrlInfo; /* v9-908fac509490b09a */
