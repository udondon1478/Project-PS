import { AUTO_TAG_RULES } from './keywords';

/**
 * Analyzes product title and description to automatically detect relevant tags
 *
 * @param title - Product title
 * @param description - Product description
 * @returns Array of detected tag names
 */
export function analyzeProductText(title: string, description: string): string[] {
  const detectedTags = new Set<string>();

  // Combine title and description for analysis
  const combinedText = `${title || ''} ${description || ''}`.toLowerCase();

  if (!combinedText.trim()) {
    return [];
  }

  // Check each rule
  for (const rule of AUTO_TAG_RULES) {
    // Check if any keyword matches
    const hasMatch = rule.keywords.some(keyword =>
      combinedText.includes(keyword.toLowerCase())
    );

    if (hasMatch) {
      // Add all tags from this rule
      rule.tags.forEach(tag => detectedTags.add(tag));
    }
  }

  return Array.from(detectedTags);
}
