import * as cheerio from 'cheerio';
import { BOOTH_BASE_URL } from './urls';

export interface ListingPageResult {
  productUrls: string[];
  hasNextPage: boolean;
}

export function parseListingPage(html: string): ListingPageResult {
  const $ = cheerio.load(html);
  const productUrls: string[] = [];

  // Select all product links
  // Use a more robust selector targeting anchors within the title container
  // This handles variations like .item-card__title-anchor, .item-card__title-anchor--multiline, etc.
  $('.item-card__title a, .market-item-card__title a').each((_, element) => {
    let href = $(element).attr('href');
    if (href) {
      // Normalize to absolute URL if relative
      if (href.startsWith('/')) {
        href = `${BOOTH_BASE_URL}${href}`;
      }
      // Only include item URLs (exclude shops or other links if any)
      if (href.includes('/items/')) {
        productUrls.push(href);
      }
    }
  });
  
  // Pagination check: look for "Next" link
  // Common pattern: .pager .next a, or a[rel="next"]
  const nextLink = $('.pager .next a, a[rel="next"]').attr('href');

  return {
    productUrls,
    hasNextPage: !!nextLink,
  };
}
