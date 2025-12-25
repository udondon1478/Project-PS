import { describe, it, expect } from 'vitest';

import { parseProductPage, parseProductJson } from './product-parser';

describe('parseProductPage', () => {
  it('should extract tags, price and other metadata from a standard product page', () => {
    const html = `
      <html>
        <body>
          <h1 class="market-item-detail-item-title">Test Product Title</h1>
          <div class="market-item-detail-item-image">
             <img src="https://example.com/image1.jpg">
          </div>
          <div class="market-item-detail-price">¥ 1,500</div>
          <div class="u-text-leading-loose">
            This is a description.
            対象年齢 : 全年齢
          </div>
          <a href="/items/123/tags/VRChat">VRChat</a>
          <a href="/items/123/tags/Avatar">Avatar</a>
          <script type="application/ld+json">
            {
              "@context": "http://schema.org",
              "@type": "Product",
              "name": "Test Product"
            }
          </script>
        </body>
      </html>
    `;

    const result = parseProductPage(html, 'http://mock');
    expect(result).not.toBeNull();
    expect(result!.tags).toEqual(['VRChat', 'Avatar']);
    expect(result!.ageRating).toBe('全年齢');
    expect(result!.price).toBe(1500);
    expect(result!.images).toContain('https://example.com/image1.jpg');
    expect(result!.schemaOrgData).toBeDefined();
    expect(result!.schemaOrgData.name).toBe('Test Product');
  });

  it('should detect R-18 rating from badge if not in description', () => {
    const html = `
      <html>
        <body>
          <h1 class="market-item-detail-item-title">R18 Product</h1>
          <div class="badge--r18">R-18</div>
          <div class="market-item-detail-price">100円</div>
          <div class="u-text-leading-loose">
            Description without explicit age rating text.
          </div>
        </body>
      </html>
    `;
    const result = parseProductPage(html, 'http://mock');
    expect(result).not.toBeNull();
    expect(result!.ageRating).toBe('R-18');
    expect(result!.price).toBe(100);
  });

  it('should extract age rating from description text with variations', () => {
    const html = `
      <main>
        <h1 class="market-item-detail-item-title">Description Product</h1>
        対象年齢： R-18
      </main>
    `;
    const result = parseProductPage(html, 'http://mock');
    expect(result).not.toBeNull();
    expect(result!.ageRating).toBe('R-18');
  });

  it('should ignore duplicate tags', () => {
    const html = `
      <h1 class="market-item-detail-item-title">Duplicate Tag Product</h1>
      <a href="/tags/test">Test</a>
      <a href="/tags/test">Test</a>
    `;
    const result = parseProductPage(html, 'http://mock');
    expect(result).not.toBeNull();
    expect(result!.tags).toEqual(['Test']);
  });

  it('should detect R-18 from tags', () => {
    const html = `
      <html>
        <body>
          <h1 class="market-item-detail-item-title">Tagged R18 Product</h1>
          <a href="/items/123/tags/R-18">R-18</a>
          <div class="market-item-detail-price">100円</div>
        </body>
      </html>
    `;
    const result = parseProductPage(html, 'http://mock');
    expect(result?.ageRating).toBe('R-18');
  });

  it('should detect R-18 from new badge structure (div)', () => {
    const html = `
      <div class="flex gap-4 items-center">
        <div class="bg-primary700 font-bold text-white text-12 px-8 rounded-4">R-18</div>
      </div>
      <h1 class="market-item-detail-item-title">Badge R18 Product</h1>
    `;
    const result = parseProductPage(html, 'http://mock');
    expect(result?.ageRating).toBe('R-18');
  });

  it('should NOT detect R-18 from description text alone if no badge/tags present (False Positive Check)', () => {
    const html = `
      <html>
        <body>
          <h1 class="market-item-detail-item-title">Safe Product</h1>
          <div class="u-text-leading-loose">
            This item is compatible with R-18 avatars.
            R-18対応アバター向けです。
          </div>
        </body>
      </html>
    `;
    const result = parseProductPage(html, 'http://mock');
    expect(result?.ageRating).toBeNull();
  });

  it('should extract publishedAt from .market-item-detail-item-date', () => {
    const html = `
      <html>
        <body>
          <h1 class="market-item-detail-item-title">Dated Product</h1>
          <div class="market-item-detail-item-date">2023年05月20日</div>
        </body>
      </html>
    `;
    const result = parseProductPage(html, 'http://mock');
    expect(result?.publishedAt).toBe('2023-05-20T00:00:00.000Z'); // Adjust expectation based on implementation details (e.g. UTC vs JST)
  });

  it('should extract publishedAt from schema.org releaseDate', () => {
    const html = `
      <html>
        <body>
          <h1 class="market-item-detail-item-title">Schema Date Product</h1>
          <script type="application/ld+json">
            {
              "@context": "http://schema.org",
              "@type": "Product",
              "name": "Schema Date Product",
              "releaseDate": "2023-10-01"
            }
          </script>
        </body>
      </html>
    `;
    const result = parseProductPage(html, 'http://mock');
    expect(result?.publishedAt).toBe('2023-10-01T00:00:00.000Z');
  });

  it('should extract official tags (Categories) from /browse/ links', () => {
    const html = `
      <h1 class="market-item-detail-item-title">Official Tags Product</h1>
      <a href="/browse/Category1">Category1</a>
      <a href="https://booth.pm/ja/browse/Category2">Category2</a>
    `;
    const result = parseProductPage(html, 'http://mock');
    expect(result?.tags).toContain('Category1');
    expect(result?.tags).toContain('Category2');
  });

  it('should extract tags from query parameters in links', () => {
    const html = `
      <h1 class="market-item-detail-item-title">Query Tags Product</h1>
      <a href="/items?tags[]=Tag1">Link1</a>
      <a href="https://booth.pm/ja/items?tags%5B%5D=Tag2">Link2</a>
    `;
    const result = parseProductPage(html, 'http://mock');
    expect(result?.tags).toContain('Tag1');
    expect(result?.tags).toContain('Tag2');
  });
});



describe('parseProductJson', () => {
  it('should parse product JSON correctly', () => {
    const mockJson = {
      id: 7798081,
      name: "Test JSON Product",
      description: "JSON Description",
      price: "¥ 0",
      is_adult: false,
      published_at: "2025-12-25T11:31:56.000+09:00",
      tags: [
        { name: "Tag1", url: "..." },
        { name: "Tag2", url: "..." }
      ],
      images: [
        { original: "img1.jpg", resized: "..." }
      ],
      shop: {
        name: "Test Shop",
        url: "https://shop.booth.pm",
        thumbnail_url: "icon.jpg"
      }
    };

    const result = parseProductJson(mockJson, 'http://mock');
    expect(result.tags).toEqual(['Tag1', 'Tag2']);
    expect(result.ageRating).toBe('全年齢');
    expect(result.price).toBe(0);
    expect(result.title).toBe('Test JSON Product');
    expect(result.description).toBe('JSON Description');
    expect(result.sellerName).toBe('Test Shop');
    expect(result.images).toEqual(['img1.jpg']);
  });

  it('should detect R-18 from is_adult', () => {
    const mockJson = {
      is_adult: true,
      tags: []
    };
    const result = parseProductJson(mockJson, 'http://mock');
    expect(result.ageRating).toBe('R-18');
  });
});
