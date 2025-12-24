import * as cheerio from 'cheerio';



/**
 * 年齢制限文字列を正規化する
 */
function normalizeAgeRating(rawRating: string): string | null {
  const normalized = rawRating.trim();
  
  if (normalized.includes('18')) {
    return 'R-18'; // R18, R-18, 18禁, 18歳以上 etc.
  }
  if (normalized.includes('15')) {
    return 'R-15'; // R15, 15歳以上
  }
  if (normalized.includes('全年齢')) {
    return '全年齢';
  }
  
  return null; // 不明な場合はnull
}

export interface ProductPageResult {
  title: string;
  description: string;
  price: number;
  images: string[];
  tags: string[];
  ageRating: string | null;
  sellerName: string;
  sellerUrl: string;
  sellerIconUrl?: string | null;
  publishedAt?: string;
  schemaOrgData?: any;
}

export function parseProductPage(html: string, url: string): ProductPageResult | null { // Added url param for fallback
  const $ = cheerio.load(html);
  
  // JSON-LD extraction first (most reliable)
  let schemaOrgData: any = undefined;
  let productSchema: any = undefined;

  const jsonLdScript = $('script[type="application/ld+json"]').first();
  if (jsonLdScript.length > 0) {
    try {
      const json = JSON.parse(jsonLdScript.text());
      schemaOrgData = json;
      // Handle array or single object, find 'Product'
      if (Array.isArray(json)) {
        productSchema = json.find(i => i['@type'] === 'Product');
      } else if (json['@type'] === 'Product') {
        productSchema = json;
      }
    } catch (e) {
      console.warn('Failed to parse JSON-LD', e);
    }
  }

  // Title
  let title = productSchema?.name || $('h1.market-item-detail-item-title').text() || $('title').text().split('-')[0];
  title = title.trim();
  
  if (!title) return null; // Mandatory

  // Description
  const description = productSchema?.description || $('.market-item-detail-item-description').text() || $('.u-text-leading-loose').text() || '';

  // Price
  let price = 0;
  if (productSchema?.offers?.price) {
    price = Number(productSchema.offers.price);
  } else {
    const priceText = $('.market-item-detail-price').first().text().replace(/[^0-9]/g, '');
    if (priceText) price = parseInt(priceText, 10);
  }

  // Seller
  let sellerName = '';
  let sellerUrl = '';
  let sellerIconUrl = undefined;

  if (productSchema?.offers?.seller) {
    sellerName = productSchema.offers.seller.name;
    // sellerUrl might not be in schema, or generic
  }

  // Fallback/Override from DOM for seller
  const sellerLink = $('.market-item-detail-shop-name a').first();
  if (sellerLink.length > 0) {
    sellerName = sellerLink.text().trim();
    sellerUrl = sellerLink.attr('href') || '';
  } else {
    // Try nav-info
     const navSeller = $('.nav-info-shop-name').first();
     sellerName = sellerName || navSeller.text().trim();
     const navLink = navSeller.closest('a');
     sellerUrl = sellerUrl || navLink.attr('href') || '';
  }
  
  // Normalize seller URL to absolute
  if (sellerUrl && !sellerUrl.startsWith('http')) {
      if (sellerUrl.startsWith('/')) {
        sellerUrl = `https://booth.pm${sellerUrl}`;
      }
  }

  const sellerIcon = $('.market-item-detail-shop-icon img').attr('src') || $('.nav-info-shop-icon').attr('src');
  if (sellerIcon) sellerIconUrl = sellerIcon;


  // Tags extraction
  const tags: string[] = [];
  $('a[href*="/tags/"]').each((_, element) => {
    const tagName = $(element).text().trim();
    if (tagName && !tags.includes(tagName)) {
      tags.push(tagName);
    }
  });

  // Age rating extraction
  let ageRating: string | null = null;
  
  // 0. Try extracting from description text using Regex (Specific enough to be safe)
  // Matches "対象年齢 : 全年齢" or "対象年齢： R-18" etc.
  const descriptionText = description || $('main').text();
  const ageRatingRegex = /対象年齢[:：\s]*([^\n<]+)/;
  const match = descriptionText.match(ageRatingRegex);
  
  if (match && match[1]) {
    const normalized = normalizeAgeRating(match[1]);
    if (normalized) ageRating = normalized;
  }

  // 1. Try extracting from tags
  // R-18 or R18 often appears in tags
  // Only check tags if not already set (e.g. by description) failure to check leads to overwrites
  if (!ageRating && tags.some(tag => ['R-18', 'R18', '18禁'].includes(tag))) {
      ageRating = 'R-18';
  }

  // 2. Fallback: Check for specific badges
  if (!ageRating) {
    // Check for R-18 badge often present in BOOTH
    // Old/Other theme badge: .badge--r18
    // New theme/Tailwind badge: div with text 'R-18' and specific classes
    const r18BadgeExists = $('.badge--r18').length > 0;
    
    // Check for "R-18" text in a badge-like container (e.g. div.bg-primary700)
    // We check if any div contains exactly "R-18" text
    const textR18Exists = $('div, span').filter((_, el) => $(el).text().trim() === 'R-18').length > 0;

    if (r18BadgeExists || textR18Exists) {
       ageRating = 'R-18';
    }
  }

  // Images extraction
  const images: string[] = [];
  
  // Main images
  $('.market-item-detail-item-image img').each((_, element) => {
      const src = $(element).attr('src');
      if (src && !images.includes(src)) images.push(src);
  });
  
  if (images.length === 0 && productSchema?.image) {
      const schemaImages = Array.isArray(productSchema.image) ? productSchema.image : [productSchema.image];
      schemaImages.forEach((img: string) => {
          if (img && !images.includes(img)) images.push(img);
      });
  }

  // Published Date - hard to find in DOM exactly often, schema usually has it
  // But Booth schema extraction might capture it? Schema usually doesn't have publish date for Product type unless 'releaseDate'
  // Or look for .market-item-detail-item-date?
  // Let's rely on fallback to now() if missing, handled in creator.
  let publishedAt = undefined;
  // Attempt to find date
  
  return {
    title,
    description,
    price,
    images,
    tags,
    ageRating,
    sellerName,
    sellerUrl,
    sellerIconUrl,
    publishedAt,
    schemaOrgData
  };
}
