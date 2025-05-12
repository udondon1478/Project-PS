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

  const userId = session.user.id; // ログインユーザーのIDを取得

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
    let description = productInfo.description || "説明なし"; // letに変更して再代入可能にする

    // HTML本文から詳細な商品説明を抽出 (前世代コードのロジックを参考に)
    const descriptionElements = $('.js-market-item-detail-description.description p');
    let htmlDescription = '';
    descriptionElements.each((i, elem) => {
      htmlDescription += $(elem).text() + '\n';
    });
    htmlDescription = htmlDescription.trim();

    if (htmlDescription) {
      description = htmlDescription; // HTMLから取得した説明があれば優先する
    }

    const price = productInfo.offers?.price ? parseFloat(productInfo.offers.price) : 0;
    // Schema.orgデータにpublishedAtがないため、ここでは現在時刻を仮の値とする
    const publishedAt = new Date();
    // 販売者情報はSchema.orgデータに含まれていないため、仮の値とする
    const sellerName = "Unknown";
    const sellerUrl = "";
    const sellerIconUrl = "";

    // 複数の商品画像URLをHTMLから取得 (data-origin属性から取得)
    const imageUrls: string[] = [];
    // メイン画像とサムネイル画像の要素からdata-origin属性を取得
    $('.market-item-detail-item-image, .primary-image-thumbnails img').each((i, elem) => {
      const imageUrl = $(elem).attr('data-origin');
      if (imageUrl && imageUrl.startsWith('https://booth.pximg.net/') && !imageUrls.includes(imageUrl)) {
        imageUrls.push(imageUrl);
      }
    });

    // Prismaのupsertを使ってデータベースに保存 (boothJpUrlをキーに)
    const savedProduct = await prisma.product.upsert({
      where: { boothJpUrl: boothJpUrl }, // 日本語版URLをキーとして使用
      update: { // 更新時のデータ
        title: title,
        description: description, // HTMLから取得した説明を使用
        price: price,
        boothEnUrl: boothEnUrl, // 英語版URLも更新
        publishedAt: publishedAt, // 取得した公開日、または仮の値
        sellerName: sellerName, // 取得した販売者名、または仮の値
        sellerUrl: sellerUrl, // 取得した販売者URL、または仮の値
        sellerIconUrl: sellerIconUrl, // 取得した販売者アイコンURL、または仮の値
        images: { // 既存の画像を削除し、新しい画像を作成
          deleteMany: {}, // 既存の関連画像を全て削除
          create: imageUrls.map((imageUrl, index) => ({
            imageUrl: imageUrl,
            isMain: index === 0, // 最初の画像をメイン画像とみなす
            order: index, // 表示順序を設定
          })),
        },
      },
      create: { // 作成時のデータ
        title: title,
        description: description, // HTMLから取得した説明を使用
        price: price,
        userId: userId, // 登録ユーザーIDを紐づけ (userId カラムを使用)
        boothJpUrl: boothJpUrl, // 日本語版URLを設定
        boothEnUrl: boothEnUrl, // 英語版URLを設定
        publishedAt: publishedAt, // 取得した公開日、または仮の値
        sellerName: sellerName, // 取得した販売者名、または仮の値
        sellerUrl: sellerUrl, // 取得した販売者URL、または仮の値
        sellerIconUrl: sellerIconUrl, // 取得した販売者アイコンURL、または仮の値
        images: { // ProductImageモデルに画像を保存
          create: imageUrls.map((imageUrl, index) => ({
            imageUrl: imageUrl,
            isMain: index === 0, // 最初の画像をメイン画像とみなす
            order: index, // 表示順序を設定
          })),
        },
      },
      include: { // 登録/更新した商品情報に画像も含める
        images: true,
      },
    });

    console.log('Product saved/updated:', savedProduct.id);

    return NextResponse.json(savedProduct, { status: 201 }); // 登録/更新した商品を返す
  } catch (error) {
    console.error("商品登録エラー:", error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ message: "商品登録に失敗しました。", error: errorMessage }, { status: 500 });
  }
}