export const BOOTH_BASE_URL = 'https://booth.pm';

export interface SearchParams {
  query?: string; // Generic query string (might contain multiple tags)
  tags?: string[]; // Explicit list of tags
  category?: string; // e.g. "3D models"
  adult?: boolean;
}

/**
 * Generates the search URL based on parameters.
 * Supports multiple tags (AND condition) and category browsing.
 */
export function getSearchUrl(page: number = 1, params: SearchParams = {}): string {
  let url: URL;
  
  // Consolidate tags: Use explicit tags or split query by whitespace, falling back to 'VRChat'
  const trimmedQuery = params.query?.trim();
  const tags = params.tags || (trimmedQuery ? trimmedQuery.split(/\s+/) : ['VRChat']);

  if (params.category) {
    url = new URL(`${BOOTH_BASE_URL}/ja/browse/${encodeURIComponent(params.category)}`);
    // Append tags as tags[]
    tags.forEach(t => url.searchParams.append('tags[]', t));
  } else {
    url = new URL(`${BOOTH_BASE_URL}/ja/items`);
    tags.forEach(t => url.searchParams.append('tags[]', t));
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
