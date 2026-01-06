export const BOOTH_BASE_URL = 'https://booth.pm';

export interface SearchParams {
  query?: string; // Keyword search string (maps to q= parameter)
  tags?: string[]; // Explicit list of tags (maps to tags[]= parameter)
  category?: string; // e.g. "3Dモデル" - used in URL path /ja/browse/{category}
  adult?: boolean;
}

/**
 * Generates the search URL based on parameters.
 *
 * BOOTH URL patterns:
 * - Keyword search: https://booth.pm/ja/browse/{category}?q=keyword&sort=new
 * - Tag search: https://booth.pm/ja/browse/{category}?tags[]=tagname&sort=new
 * - Both: https://booth.pm/ja/browse/{category}?tags[]=tagname&q=keyword&sort=new
 *
 * Important: `tags[]` parameter filters by exact tag, while `q=` is a general keyword search.
 * For accurate results matching tagged items, use the `tags` parameter.
 */
export function getSearchUrl(page: number = 1, params: SearchParams = {}): string {
  let url: URL;

  if (params.category) {
    url = new URL(`${BOOTH_BASE_URL}/ja/browse/${encodeURIComponent(params.category)}`);
  } else {
    url = new URL(`${BOOTH_BASE_URL}/ja/items`);
  }

  // Add tags[] parameters for tag-based filtering
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach(t => url.searchParams.append('tags[]', t));
  }

  // Add q= parameter for keyword search (separate from tag filtering)
  if (params.query?.trim()) {
    url.searchParams.append('q', params.query.trim());
  }

  url.searchParams.append('sort', 'new');

  if (params.adult) {
    url.searchParams.append('adult', 'include');
  }

  if (page > 1) {
    url.searchParams.append('page', page.toString());
  }
  return url.toString();
}
