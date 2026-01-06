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
  variations: {
    name: string;
    price: number;
    type: string;
    order: number;
    isMain: boolean;
  }[];
}

export function parseProductJson(json: any, url: string): ProductPageResult {
  const tags = Array.isArray(json.tags) ? json.tags.map((t: any) => t.name) : [];
  const images = Array.isArray(json.images) ? json.images.map((img: any) => img.original) : [];

  // カテゴリ・サブカテゴリを公式タグとして追加
  // JSON構造: category: { name: "サブカテゴリ", parent: { name: "親カテゴリ" } }
  if (json.category) {
    // 親カテゴリ（例："3Dモデル"、"素材データ"）
    if (json.category.parent?.name) {
      const parentCategory = json.category.parent.name;
      if (!tags.includes(parentCategory)) {
        tags.push(parentCategory);
      }
    }
    // サブカテゴリ（例："3D装飾品"、"イラスト3D素材"）
    if (json.category.name) {
      const subCategory = json.category.name;
      if (!tags.includes(subCategory)) {
        tags.push(subCategory);
      }
    }
  }

  // Price extraction "¥ 0" -> 0
  const priceStr = json.price || '0';
  const price = parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;

  // Age Rating
  let ageRating: string | null = json.is_adult ? 'R-18' : '全年齢';
  // Refine age rating with tags if needed
  if (tags.some((t: string) => t.toLowerCase() === 'r-18g')) {
      ageRating = 'R-18G';
  } else if (tags.some((t: string) => t.toLowerCase() === 'r-18')) {
      ageRating = 'R-18';
  }

  return {
    title: json.name || '',
    description: json.description || '',
    price,
    images,
    tags,
    ageRating,
    sellerName: json.shop?.name || '',
    sellerUrl: json.shop?.url || '',
    sellerIconUrl: json.shop?.thumbnail_url,
    publishedAt: json.published_at,
    schemaOrgData: json,
    variations: [{
        name: 'Standard',
        price: price,
        type: 'download',
        order: 0,
        isMain: true
    }]
  };
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
  
  // existing tag links
  $('a[href*="/tags/"]').each((_, element) => {
    const tagName = $(element).text().trim();
    if (tagName && !tags.includes(tagName)) {
      tags.push(tagName);
    }
  });

  // NEW: Extract "Official Tags" (Categories) via /browse/ links
  // Example: https://booth.pm/ja/browse/3D%E8%A3%85%E9%A3%BE%E5%93%81 -> "3D装飾品"
  $('a[href*="/browse/"]').each((_, element) => {
      const tagName = $(element).text().trim();
      // Filter out overly generic navigation items if necessary, but usually browse links are specific categories
      if (tagName && !tags.includes(tagName)) {
          tags.push(tagName);
      }
  });

  // NEW: Extract tags from search query parameters (e.g. ?tags[]=VRChat)
  // Example: https://booth.pm/ja/items?tags%5B%5D=VRChat
  $('a[href*="tags"]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
          // Verify it's a link to items search
          if (href.includes('/items?') || href.includes('?tags')) {
              // We need to parse relative or absolute URLs.
              // Create a dummy base if relative.
              const urlObj = new URL(href, 'https://booth.pm');
              const searchParams = urlObj.searchParams;

              // tags[] parameter. It might be tags[] or tags%5B%5D
              const tagValues = searchParams.getAll('tags[]');
              tagValues.forEach(val => {
                  if (val && !tags.includes(val)) {
                      tags.push(val);
                  }
              });
          }
      } catch (e) {
          // ignore invalid URLs
      }
  });

  // カテゴリ・サブカテゴリをbreadcrumbsから抽出
  // セレクタ: #js-item-category-breadcrumbs nav a
  const breadcrumbLinks = $('#js-item-category-breadcrumbs nav a');
  if (breadcrumbLinks.length > 0) {
      breadcrumbLinks.each((_, el) => {
          const catName = $(el).text().trim();
          if (catName && !tags.includes(catName)) {
              tags.push(catName);
          }
      });
  } else {
    // フォールバック: data-sub-category-options から親子関係を構築
    // 構造: [{"pc":"3Dモデル","children":[{"label":"3D装飾品","value":"3D装飾品"},...]},...]
    const subCatOptionsRaw = $('div[data-sub-category-options]').first().attr('data-sub-category-options');
    if (subCatOptionsRaw) {
        try {
            const jsonStr = subCatOptionsRaw.replace(/&quot;/g, '"');
            const catMap = JSON.parse(jsonStr);

            if (Array.isArray(catMap)) {
                // 子カテゴリ -> 親カテゴリのマップを構築
                const childToParent = new Map<string, string>();

                catMap.forEach((pItem: any) => {
                    const parentName = pItem.pc;
                    if (parentName && Array.isArray(pItem.children)) {
                        pItem.children.forEach((cItem: any) => {
                            if (cItem.label) childToParent.set(cItem.label, parentName);
                            if (cItem.value) childToParent.set(cItem.value, parentName);
                        });
                    }
                });

                // 既存タグに含まれる子カテゴリに対して、親カテゴリを追加
                const currentTags = [...tags];
                currentTags.forEach(tag => {
                    const parent = childToParent.get(tag);
                    if (parent && !tags.includes(parent)) {
                        tags.push(parent);
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to parse sub-category options', e);
        }
    }
  }

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

  // Published Date
  let publishedAt: string | undefined = undefined;

  // 1. Try schema.org releaseDate (if available)
  if (productSchema?.releaseDate) {
    const d = new Date(productSchema.releaseDate);
    if (!isNaN(d.getTime())) {
      publishedAt = d.toISOString();
    }
  }

  // 2. Try DOM .market-item-detail-item-date
  if (!publishedAt) {
    const rawDate = $('.market-item-detail-item-date').text().trim();
    if (rawDate) {
      // Handle "YYYY年MM月DD日" format common in Japan
      // Also handle "YYYY/MM/DD" just in case
      // "2023年05月20日" -> "2023/05/20" for easier parsing
      const normalizedDate = rawDate.replace(/年/g, '/').replace(/月/g, '/').replace(/日/g, '');
      const d = new Date(normalizedDate);
      
      // If valid date
      if (!isNaN(d.getTime())) {
          // If the input was just a date (no time), we might want to ensure it's treated as UTC 00:00 to avoid shifting
          // But `new Date('YYYY/MM/DD')` is usually local. `new Date('YYYY-MM-DD')` is UTC.
          // Let's force YYYY-MM-DD format and parse as UTC to keep the date stable matching the string.
          // Extract struct
          const match = normalizedDate.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
          if (match) {
             const year = match[1];
             const month = match[2].padStart(2, '0');
             const day = match[3].padStart(2, '0');
             // Construct ISO date string (YYYY-MM-DD) which parses as UTC 00:00:00
             publishedAt = new Date(`${year}-${month}-${day}`).toISOString();
          } else {
             // Fallback default parse
             publishedAt = d.toISOString();
          }
      }
    }
  }

  // Variations extraction
  const variations: { name: string; price: number; type: string; order: number; isMain: boolean; }[] = [];
  
  const variationItems = $('.variation-list .variation-item');
  if (variationItems.length > 0) {
      variationItems.each((index, el) => {
          const vName = $(el).find('.variation-name').text().trim();
          const vPriceText = $(el).find('.variation-price').text().trim(); // "¥ 1,500"
          const vPrice = parseInt(vPriceText.replace(/[^0-9]/g, ''), 10) || price;
          
          variations.push({
              name: vName || 'Standard',
              price: vPrice,
              type: 'download', // parsing type might be hard, default to download
              order: index,
              isMain: index === 0
          });
      });
  } else {
      // Fallback if no explicit variations found
      variations.push({
          name: 'Standard',
          price: price,
          type: 'download',
          order: 0,
          isMain: true
      });
  }
  
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
    schemaOrgData,
    variations
  };
}
