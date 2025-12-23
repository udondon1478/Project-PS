export const BOOTH_BASE_URL = 'https://booth.pm';

/**
 * Generates the URL for the VRChat tag search page on BOOTH.
 * Sorted by "new" (newest first).
 *
 * @param page The page number (1-based index). Defaults to 1.
 * @returns The full URL string.
 */
export function getVrChatSearchUrl(page: number = 1): string {
  const url = new URL(`${BOOTH_BASE_URL}/ja/items`);
  url.searchParams.append('tags[]', 'VRChat');
  url.searchParams.append('sort', 'new');
  if (page > 1) {
    url.searchParams.append('page', page.toString());
  }
  return url.toString();
}
