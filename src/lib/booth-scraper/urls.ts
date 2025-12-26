export const BOOTH_BASE_URL = 'https://booth.pm';

export interface SearchParams {
  query?: string;
  category?: string; // e.g. "3D models"
  adult?: boolean;
}

/**
 * Generates the search URL based on parameters.
 * 
 * If category is present: /ja/browse/{category}?q={query}
 * If no category: /ja/items?tags[]={query ?? 'VRChat'}
 */
export function getSearchUrl(page: number = 1, params: SearchParams = {}): string {
  let url: URL;
  const query = params.query || 'VRChat';

  if (params.category) {
    url = new URL(`${BOOTH_BASE_URL}/ja/browse/${encodeURIComponent(params.category)}`);
    if (query) {
      url.searchParams.append('q', query);
    }
  } else {
    url = new URL(`${BOOTH_BASE_URL}/ja/items`);
    url.searchParams.append('tags[]', query);
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
