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

    // Booth.pmのページからHTMLコンテンツを取得
    const response = await fetch(url);
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

    // 必要な商品情報を抽出
    const title = productInfo.name || "タイトル不明";
    const description = productInfo.description || "説明なし";
    const price = productInfo.offers?.price ? parseFloat(productInfo.offers.price) : 0;
    // Schema.orgデータにpublishedAtがないため、ここでは現在時刻を仮の値とする
    const publishedAt = new Date();
    // 販売者情報はSchema.orgデータに含まれていないため、仮の値とする
    const sellerName = "Unknown";
    const sellerUrl = "";
    const sellerIconUrl = "";
    // 画像URLはSchema.orgデータに含まれているが、複数画像はHTMLから取得する必要がある
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const imageUrls = productInfo.image ? [productInfo.image] : [];

    // TODO: 複数の商品画像URLをHTMLから取得する処理を追加（必要な場合）

    // データベースに商品を登録 (取得した情報を使用)
    const newItem = await prisma.product.create({ // product モデルを使用
      data: {
        title: title,
        description: description,
        price: price,
        userId: userId, // 登録ユーザーIDを紐づけ (userId カラムを使用)
        boothJpUrl: url.includes('/ja/') ? url : "", // 日本語URLなら設定
        boothEnUrl: url.includes('/en/') ? url : "", // 英語URLなら設定
        publishedAt: publishedAt, // 取得した公開日、または仮の値
        sellerName: sellerName, // 取得した販売者名、または仮の値
        sellerUrl: sellerUrl, // 取得した販売者URL、または仮の値
        sellerIconUrl: sellerIconUrl, // 取得した販売者アイコンURL、または仮の値
        images: { // ProductImageモデルに画像を保存
          create: imageUrls.map(imageUrl => ({
            imageUrl: imageUrl,
            isMain: true, // Schema.orgの画像はメイン画像とみなす
          })),
        },
      },
      include: { // 登録した商品情報に画像も含める
        images: true,
      },
    });

    return NextResponse.json(newItem, { status: 201 }); // 登録した商品を返す
  } catch (error) {
    console.error("商品登録エラー:", error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ message: "商品登録に失敗しました。", error: errorMessage }, { status: 500 });
  }
}