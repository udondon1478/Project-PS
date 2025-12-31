import { SchemaOrgProduct, SchemaOrgOffer, SchemaOrgAggregateOffer } from '@/types/product';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import * as cheerio from 'cheerio';
import { addToBoothQueue } from '@/lib/booth-queue';

function isSchemaOrgOffer(offers: unknown): offers is SchemaOrgOffer {
  return typeof offers === 'object' && offers !== null && '@type' in offers && offers['@type'] === 'Offer';
}

function isSchemaOrgAggregateOffer(offers: unknown): offers is SchemaOrgAggregateOffer {
  return typeof offers === 'object' && offers !== null && '@type' in offers && offers['@type'] === 'AggregateOffer';
}

export const runtime = 'nodejs';

export async function GET() {
  const items = await prisma.user.findMany();
  console.log(items);
  return NextResponse.json(items);
}

// 商品登録APIエンドポイント (POST)
export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  // レート制限チェック (1分間に5回まで)
  const isRateLimited = await rateLimit(session.user.id);
  if (isRateLimited) {
    return NextResponse.json(
      { message: "リクエスト回数が制限を超えました。しばらく待ってから再度お試しください。" },
      { status: 429 }
    );
  }

  try {
    const { url } = await request.json();

    const boothUrlRegex = /^https:\/\/(?:[a-zA-Z0-9-]+\.)?booth\.pm\/(?:(ja|en)\/)?items\/\d+$/;
    if (!boothUrlRegex.test(url)) {
      return NextResponse.json({ message: "無効なBooth URL形式です。日本語版、又は英語版のBooth.pmのアイテムページのURLを入力してください。" }, { status: 400 });
    }

    const urlMatch = url.match(/^https:\/\/(?:[a-zA-Z0-9-]+\.)?booth\.pm\/(?:(ja|en)\/)?items\/(\d+)/);

    if (!urlMatch) {
      return NextResponse.json({ message: "無効なBooth URL形式です。日本語版、又は英語版のBooth.pmのアイテムページのURLを入力してください。" }, { status: 400 });
    }

    const productId = urlMatch[2];

    const boothJpUrl = `https://booth.pm/ja/items/${productId}`;
    const boothEnUrl = `https://booth.pm/en/items/${productId}`;

    const existingProduct = await prisma.product.findUnique({
      where: { boothJpUrl: boothJpUrl },
      include: { images: true },
    });

    if (existingProduct) {
      console.log('Product already exists:', existingProduct.id);
      return NextResponse.json({
        status: 'existing',
        product: existingProduct,
        message: 'この商品は既に登録されています。情報を更新しますか？'
      }, { status: 200 });
    } else {
      // キューに追加して実行 (レートリミット対策 + バックプレッシャー)
      const result = await addToBoothQueue(async () => {
        console.log('Product not found, scraping Booth.pm...');

        const subdomainRegex = /^https:\/\/[a-zA-Z0-9-]+\.booth\.pm\//;
        const fetchUrl = subdomainRegex.test(url) ? boothJpUrl : url;

        // Add timeout for HTML fetch
        const htmlController = new AbortController();
        const htmlTimeout = setTimeout(() => htmlController.abort(), 30000);

        let response: Response;
        try {
          response = await fetch(fetchUrl, {
            headers: {
              'Cookie': 'adult=t'
            },
            signal: htmlController.signal
          });
        } finally {
          clearTimeout(htmlTimeout);
        }

        if (!response.ok) {
          return NextResponse.json({ message: `Booth.pmからの情報取得に失敗しました。ステータスコード: ${response.status}` }, { status: response.status });
        }
        const html = await response.text();

        const $ = cheerio.load(html);

        let productInfo: SchemaOrgProduct; // productInfoを初期化
        let title: string = "タイトル不明";
        let description: string = '';
        let markdownDescription: string = '';
        let lowPrice: number = 0;
        let highPrice: number = 0;
        let publishedAt: Date = new Date(); // デフォルトで現在時刻（フォールバック用）
        let sellerName: string = "Unknown";

        // BOOTH JSON APIから公開日時とタグを取得 (with timeout)
        // product-parser.ts と同じアプローチ: JSON API優先でタグを取得
        let boothTagsFromJson: string[] = [];
        try {
          const jsonUrl = `${boothJpUrl}.json`;
          const jsonController = new AbortController();
          const jsonTimeout = setTimeout(() => jsonController.abort(), 30000);

          try {
            const jsonResponse = await fetch(jsonUrl, {
              headers: { 'Cookie': 'adult=t' },
              signal: jsonController.signal
            });
            if (jsonResponse.ok) {
              const jsonData = await jsonResponse.json();
              if (jsonData.published_at) {
                publishedAt = new Date(jsonData.published_at);
                console.log('Fetched publishedAt from BOOTH JSON API:', publishedAt);
              }
              // JSON APIからタグを取得 (product-parser.ts の parseProductJson と同じ)
              if (Array.isArray(jsonData.tags)) {
                boothTagsFromJson = jsonData.tags.map((t: { name: string }) => t.name);
                console.log('Fetched tags from BOOTH JSON API:', boothTagsFromJson);
              }
            }
          } finally {
            clearTimeout(jsonTimeout);
          }
        } catch (e) {
          console.warn('Failed to fetch BOOTH JSON API:', e);
        }
        let sellerUrl: string = "";
        let sellerIconUrl: string = "";

        // 複数の商品画像URLをHTMLから取得 (data-origin属性から取得)
        const imageUrls: string[] = [];
        $('.market-item-detail-item-image, .primary-image-thumbnails img').each((i, elem) => {
          const imageUrl = $(elem).attr('data-origin');
          if (imageUrl && imageUrl.startsWith('https://booth.pximg.net/') && !imageUrls.includes(imageUrl)) {
            imageUrls.push(imageUrl);
          }
        });

        // バリエーション情報を取得
        const variations: { name: string; price: number; type: string; order: number; isMain: boolean }[] = [];
        $('.variations .variation-item').each((i, elem) => {
          const name = $(elem).find('.variation-name').text().trim();
          const priceText = $(elem).find('.variation-price').text().trim();
          const price = parseFloat(priceText.replace('¥', '').replace(/,/g, '').trim());
          const type = $(elem).find('.u-tpg-caption1').text().trim();

          if (Number.isFinite(price)) {
            variations.push({
              name,
              price,
              type,
              order: i,
              isMain: i === 0
            });
          }
        });

        const schemaOrgData = $('script[type="application/ld+json"]').html();

        if (!schemaOrgData) {
          console.warn("Schema.orgデータが見つかりませんでした。HTMLから情報を抽出します。");

          // タイトル
          title = $('title').text().replace(/ - BOOTH$/, '') || "タイトル不明";

          // 価格 (バリエーションから取得を優先)
          const validVariationPrices = variations.map(v => v.price).filter(Number.isFinite);

          if (validVariationPrices.length > 0) {
            lowPrice = Math.min(...validVariationPrices);
            highPrice = Math.max(...validVariationPrices);
          } else {
            const priceText = $('.price').text().trim();
            if (priceText) {
              const priceValue = parseFloat(priceText.replace('¥', '').replace(/,/g, ''));
              if (Number.isFinite(priceValue)) {
                lowPrice = priceValue;
                highPrice = priceValue;
              }
            }
          }

          // 販売者情報
          sellerName = $('.shop-name').text().trim() || "Unknown";
          sellerUrl = $('.shop-name a.nav').attr('href') || ""; // 修正
          const sellerAvatarElement = $('.shop-info .user-avatar');
          const sellerIconStyle = sellerAvatarElement.attr('style');
          const sellerIconUrlMatch = sellerIconStyle ? sellerIconStyle.match(/url\((.*?)\)/) : null;
          sellerIconUrl = sellerIconUrlMatch ? sellerIconUrlMatch[1] : "";

          // publishedAtはHTMLから取得が困難なため、デフォルト値を使用
        } else {
          productInfo = JSON.parse(schemaOrgData) as SchemaOrgProduct;
          console.log("Schema.org Data:", productInfo);

          // Schema.orgからタイトルを抽出
          title = productInfo.name || "タイトル不明";

          // Schema.orgから価格を抽出
          if (isSchemaOrgOffer(productInfo.offers)) {
            const price = parseFloat(String(productInfo.offers.price).replace(/,/g, ''));
            if (Number.isFinite(price)) {
              lowPrice = price;
              highPrice = price;
            }
          } else if (isSchemaOrgAggregateOffer(productInfo.offers)) {
            const low = parseFloat(String(productInfo.offers.lowPrice).replace(/,/g, ''));
            const high = parseFloat(String(productInfo.offers.highPrice).replace(/,/g, ''));
            if (Number.isFinite(low)) {
              lowPrice = low;
            }
            if (Number.isFinite(high)) {
              highPrice = high;
            }
          } else {
            console.warn("Schema.org offers structure is unexpected:", productInfo.offers);
          }

          // Schema.orgから価格が取得できなかった場合、バリエーションから取得を試みる
          if ((lowPrice === 0 && highPrice === 0) && variations.length > 0) {
            const validVariationPrices = variations.map(v => v.price).filter(Number.isFinite);
            if (validVariationPrices.length > 0) {
              lowPrice = Math.min(...validVariationPrices);
              highPrice = Math.max(...validVariationPrices);
            }
          }

          // Schema.orgデータにpublishedAtがないため、ここでは現在時刻を仮の値とする
          // 販売者情報はSchema.orgデータに含まれていないため、ここではHTMLからスクレイピング
          const sellerLinkElement = $('.shop-info a.nav');
          const sellerNameElement = $('.shop-info .shop-name a.nav');
          const sellerAvatarElement = $('.shop-info .user-avatar');

          sellerUrl = sellerLinkElement.attr('href') || "";
          sellerName = sellerNameElement.text().trim() || "Unknown";
          const sellerIconStyle = sellerAvatarElement.attr('style');
          const sellerIconUrlMatch = sellerIconStyle ? sellerIconStyle.match(/url\((.*?)\)/) : null;
          sellerIconUrl = sellerIconUrlMatch ? sellerIconUrlMatch[1] : "";
        }

        // .main-info-column 内の .js-market-item-detail-description description クラスの中の p タグのテキストを抽出
        const mainDescriptionElements = $('.main-info-column .js-market-item-detail-description.description p');
        mainDescriptionElements.each((i, elem) => {
          const paragraphText = $(elem).text();
          markdownDescription += `${paragraphText}\n\n`;
        });

        // .my-40 要素が存在する場合、その中の .shop__text を処理
        const my40Element = $('.my-40');
        if (my40Element.length) {
          const shopTextElements = my40Element.find('.shop__text');
          shopTextElements.each((i, elem) => {
            const headingElement = $(elem).find('h1, h2, h3, h4, h5, h6').first();
            const tagName = headingElement.prop('tagName');
            if (headingElement.length && typeof tagName === 'string') {
              const headingText = headingElement.text().trim();
              const headingLevel = parseInt(tagName.slice(1));
              markdownDescription += `${'#'.repeat(headingLevel)} ${headingText}\n\n`;
            }
            const paragraphElements = $(elem).find('p');
            paragraphElements.each((i, paragraphElem) => {
              const paragraphText = $(paragraphElem).text().trim();
              if (paragraphText) {
                markdownDescription += `${paragraphText}\n\n`;
              }
            });
          });
        }

        description = markdownDescription.trim();

        // Tags extraction
        // JSON APIからタグが取得できた場合は優先使用、できなかった場合はHTMLから抽出
        let boothTags: string[] = [];
        
        if (boothTagsFromJson.length > 0) {
          // JSON APIからのタグを使用（より信頼性が高い）
          boothTags = boothTagsFromJson;
          console.log('Using tags from JSON API:', boothTags);
        } else {
          // フォールバック: HTMLからタグを抽出
          console.log('JSON API tags not available, falling back to HTML extraction');
          
          // existing tag links
          $('a[href*="/tags/"]').each((_, element) => {
            const tagName = $(element).text().trim();
            if (tagName && !boothTags.includes(tagName)) {
              boothTags.push(tagName);
            }
          });
          // Official Tags (Categories) via /browse/ links
          $('a[href*="/browse/"]').each((_, element) => {
            const tagName = $(element).text().trim();
            if (tagName && !boothTags.includes(tagName)) {
              boothTags.push(tagName);
            }
          });
          // Tags from query parameters
          $('a[href*="tags"]').each((_, element) => {
            const href = $(element).attr('href');
            if (!href) return;
            try {
               if (href.includes('/items?') || href.includes('?tags')) {
                 const urlObj = new URL(href, 'https://booth.pm');
                 const searchParams = urlObj.searchParams;
                 const tagValues = searchParams.getAll('tags[]');
                 tagValues.forEach(val => {
                   if (val && !boothTags.includes(val)) {
                     boothTags.push(val);
                   }
                 });
               }
            } catch(e) {
               // ignore
            }
          });
        }

        console.log('ProductInfo to be returned to frontend:', {
          boothJpUrl,
          boothEnUrl,
          title,
          description,
          lowPrice,
          highPrice,
          publishedAt,
          sellerName,
          sellerUrl,
          sellerIconUrl,
          images: imageUrls.map((imageUrl, index) => ({
            imageUrl: imageUrl,
            isMain: index === 0,
            order: index,
          })),
          variations: variations
        }); // 追加

        return NextResponse.json({
          status: 'new',
          productInfo: {
            boothJpUrl,
            boothEnUrl,
            title,
            description,
            lowPrice,
            highPrice,
            publishedAt,
            sellerName,
            sellerUrl,
            sellerIconUrl,
            images: imageUrls.map((imageUrl, index) => ({
              imageUrl: imageUrl,
              isMain: index === 0,
              order: index,
            })),
            variations: variations,
            boothTags: boothTags
          },
          message: '新しい商品が見つかりました。タグを入力して登録してください。'
        }, { status: 200 });
      });

      return result;
    }
  } catch (error) {

    
    // バックプレッシャーエラーのハンドリング
    if (error instanceof Error && error.message === 'Queue is full') {
       return NextResponse.json(
        { message: "現在リクエストが混み合っています。しばらく待ってから再度お試しください。" }, 
        { status: 503 }
      );
    }

    // タイムアウトエラーのハンドリング (PQueue/TimeoutError)
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { message: "処理がタイムアウトしました。しばらく待ってから再度お試しください。" }, 
        { status: 504 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // サーバーサイドログには常に詳細を出力
    console.error("Critical Error in /api/items:", { error, message: errorMessage, stack: errorStack });

    // クライアントへのレスポンス
    const isDev = process.env.NODE_ENV === 'development';
    const clientMessage = isDev 
      ? `商品情報の取得に失敗しました。詳細: ${errorMessage}` 
      : "商品情報の取得に失敗しました。";

    return NextResponse.json(
      { 
        message: clientMessage,
        ...(isDev && { error: errorMessage, stack: errorStack }) // 開発環境のみ詳細を含める
      }, 
      { status: 500 }
    );
  }
}