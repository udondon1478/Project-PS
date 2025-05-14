import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth } from "@/auth"; // Auth.jsのauth関数をインポート
import fetch from 'node-fetch'; // node-fetchをインポート
import * as cheerio from 'cheerio'; // cheerioをインポート

export const runtime = 'nodejs'; // Edge RuntimeでのPrismaClientエラーを回避

const prisma = new PrismaClient();

export async function GET() {
  const items = await prisma.user.findMany(); // User を user に修正
  console.log(items);
  return NextResponse.json(items);
}

// 商品登録APIエンドポイント (POST)
export async function POST(request: Request) {
  const session = await auth(); // セッション情報を取得

  // ログインしているか確認
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }


  try {
    const { url } = await request.json(); // リクエストボディからBooth.pmのURLを取得

    // Booth.pmのURL形式をバリデーション
    const boothUrlRegex = /^https:\/\/booth\.pm\/(ja|en)\/items\/\d+$/;
    if (!boothUrlRegex.test(url)) {
      return NextResponse.json({ message: "無効なBooth URL形式です。日本語版または英語版のアイテムページのURLを入力してください。" }, { status: 400 });
    }

    // URLから言語コードと商品IDを抽出
    const urlMatch = url.match(/https:\/\/booth\.pm\/(ja|en)\/items\/(\d+)/);

    if (!urlMatch) {
      // このバリデーションはBooth URL形式バリデーションで既にチェックされているはずだが、念のため
      return NextResponse.json({ message: "無効なBooth URL形式です。日本語版または英語版のアイテムページのURLを入力してください。" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const languageCode = urlMatch[1];
    const productId = urlMatch[2];

    // 日本語版URLと英語版URLを生成 (正規化済み)
    const boothJpUrl = `https://booth.pm/ja/items/${productId}`;
    const boothEnUrl = `https://booth.pm/en/items/${productId}`;

    // データベースに商品が存在するか確認
    const existingProduct = await prisma.product.findUnique({
      where: { boothJpUrl: boothJpUrl },
      include: { images: true }, // 既存の商品情報に画像も含める
    });

    if (existingProduct) {
      // 商品が存在する場合：既存の商品情報を返す
      console.log('Product already exists:', existingProduct.id);
      return NextResponse.json({
        status: 'existing',
        product: existingProduct,
        message: 'この商品は既に登録されています。情報を更新しますか？'
      }, { status: 200 });
    } else {
      // 商品が存在しない場合：Booth.pmから情報をスクレイピングして返す
      console.log('Product not found, scraping Booth.pm...');

      // Booth.pmのページからHTMLコンテンツを取得 (元のURLを使用)
      const response = await fetch(url); // 元のURLでフェッチ
      if (!response.ok) {
        return NextResponse.json({ message: `Booth.pmからの情報取得に失敗しました。ステータスコード: ${response.status}` }, { status: response.status });
      }
      const html = await response.text();

      // cheerioでHTMLを解析
      const $ = cheerio.load(html);

      // Schema.orgのJSONデータを抽出・解析
      const schemaOrgData = $('script[type="application/ld+json"]').html();
      if (!schemaOrgData) {
        return NextResponse.json({ message: "ページから商品情報を取得できませんでした。（Schema.orgデータが見つかりません）" }, { status: 500 });
      }

      const productInfo = JSON.parse(schemaOrgData);
      console.log("Schema.org Data:", productInfo); // Schema.orgデータをコンソールに出力

      // 必要な商品情報を抽出
      const title = productInfo.name || "タイトル不明";
      let description = '';
      let markdownDescription = '';

      // .main-info-column 内の .js-market-item-detail-description description クラスの中の p タグのテキストを抽出
      const mainDescriptionElements = $('.main-info-column .js-market-item-detail-description.description p');
      mainDescriptionElements.each((i, elem) => {
        const paragraphText = $(elem).text();
        markdownDescription += `${paragraphText}\n\n`; // 段落間に空行を追加
      });

      // .my-40 要素が存在する場合、その中の .shop__text を処理
      const my40Element = $('.my-40');
      if (my40Element.length) {
        const shopTextElements = my40Element.find('.shop__text');
        shopTextElements.each((i, elem) => {
          // shop__text の中にある最初の見出し (h1-h6) を抽出
          const headingElement = $(elem).find('h1, h2, h3, h4, h5, h6').first();
          const tagName = headingElement.prop('tagName');
          if (headingElement.length && typeof tagName === 'string') { // tagNameが存在し、かつ文字列であることを確認
            const headingText = headingElement.text().trim();
            const headingLevel = parseInt(tagName.slice(1));
            markdownDescription += `${'#'.repeat(headingLevel)} ${headingText}\n\n`; // 見出しと内容の間に空行を追加
          }

          // shop__text の中にある p タグを抽出
          const paragraphElements = $(elem).find('p');
          paragraphElements.each((i, paragraphElem) => {
            const paragraphText = $(paragraphElem).text().trim();
            if (paragraphText) { // 空の段落はスキップ
              markdownDescription += `${paragraphText}\n\n`; // 段落間に空行を追加
            }
          });
        });
      }

      description = markdownDescription.trim(); // 前後の空白を削除

      let lowPrice = 0;
      let highPrice = 0;

      if (productInfo.offers && productInfo.offers['@type'] === 'Offer' && productInfo.offers.price) {
        // 単一価格の場合
        const price = parseFloat(productInfo.offers.price);
        lowPrice = price;
        highPrice = price;
      } else if (productInfo.offers && productInfo.offers['@type'] === 'AggregateOffer' && productInfo.offers.lowPrice && productInfo.offers.highPrice) {
        // 複数価格の場合
        lowPrice = parseFloat(productInfo.offers.lowPrice);
        highPrice = parseFloat(productInfo.offers.highPrice);
      }

      // Schema.orgデータにpublishedAtがないため、ここでは現在時刻を仮の値とする
      const publishedAt = new Date();
      // 販売者情報をHTMLからスクレイピング
      const sellerLinkElement = $('.shop-info a.nav');
      const sellerNameElement = $('.shop-info .shop-name a.nav');
      const sellerAvatarElement = $('.shop-info .user-avatar');

      const sellerUrl = sellerLinkElement.attr('href') || "";
      const sellerName = sellerNameElement.text().trim() || "Unknown";
      // style属性からurl()内のURLを抽出
      const sellerIconStyle = sellerAvatarElement.attr('style');
      const sellerIconUrlMatch = sellerIconStyle ? sellerIconStyle.match(/url\((.*?)\)/) : null;
      const sellerIconUrl = sellerIconUrlMatch ? sellerIconUrlMatch[1] : "";

      // 複数の商品画像URLをHTMLから取得 (data-origin属性から取得)
      const imageUrls: string[] = [];
      // メイン画像とサムネイル画像の要素からdata-origin属性を取得
      $('.market-item-detail-item-image, .primary-image-thumbnails img').each((i, elem) => {
        const imageUrl = $(elem).attr('data-origin');
        if (imageUrl && imageUrl.startsWith('https://booth.pximg.net/') && !imageUrls.includes(imageUrl)) {
          imageUrls.push(imageUrl);
        }
      });

      // データベースには保存せず、フロントエンドに返す
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
        },
        message: '新しい商品が見つかりました。タグを入力して登録してください。'
      }, { status: 200 });
    }
  } catch (error) {
    console.error("商品情報取得エラー:", error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ message: "商品情報の取得に失敗しました。", error: errorMessage }, { status: 500 });
  }

}