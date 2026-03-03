"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isMessagingToolDuplicate = isMessagingToolDuplicate;exports.isMessagingToolDuplicateNormalized = isMessagingToolDuplicateNormalized;exports.normalizeTextForComparison = normalizeTextForComparison;const MIN_DUPLICATE_TEXT_LENGTH = 10;
/**
 * Normalize text for duplicate comparison.
 * - Trims whitespace
 * - Lowercases
 * - Strips emoji (Emoji_Presentation and Extended_Pictographic)
 * - Collapses multiple spaces to single space
 */
function normalizeTextForComparison(text) {
  return text.
  trim().
  toLowerCase().
  replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, "").
  replace(/\s+/g, " ").
  trim();
}
function isMessagingToolDuplicateNormalized(normalized, normalizedSentTexts) {
  if (normalizedSentTexts.length === 0) {
    return false;
  }
  if (!normalized || normalized.length < MIN_DUPLICATE_TEXT_LENGTH) {
    return false;
  }
  return normalizedSentTexts.some((normalizedSent) => {
    if (!normalizedSent || normalizedSent.length < MIN_DUPLICATE_TEXT_LENGTH) {
      return false;
    }
    return normalized.includes(normalizedSent) || normalizedSent.includes(normalized);
  });
}
function isMessagingToolDuplicate(text, sentTexts) {
  if (sentTexts.length === 0) {
    return false;
  }
  const normalized = normalizeTextForComparison(text);
  if (!normalized || normalized.length < MIN_DUPLICATE_TEXT_LENGTH) {
    return false;
  }
  return isMessagingToolDuplicateNormalized(normalized, sentTexts.map(normalizeTextForComparison));
} /* v9-49c4fc7f5dd76814 */
