import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth } from "@/auth"; // Auth.jsのauth関数をインポート

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
    const { title, description, price } = await request.json(); // リクエストボディから商品情報を取得

    // データベースに商品を登録
    const newItem = await prisma.product.create({ // product モデルを使用
      data: {
        title,
        description,
        price,
        userId: userId, // 登録ユーザーIDを紐づけ (userId カラムを使用)
        // 他の必須フィールドがあればここに追加
        boothJpUrl: "", // 仮の値。実際にはリクエストから取得する必要がある
        boothEnUrl: "", // 仮の値。実際にはリクエストから取得する必要がある
        publishedAt: new Date(), // 仮の値。実際にはリクエストから取得する必要がある
        sellerName: "Unknown", // 仮の値。実際にはリクエストから取得する必要がある
        sellerUrl: "", // 仮の値。実際にはリクエストから取得する必要がある
        sellerIconUrl: "", // 仮の値。実際にはリクエストから取得する必要がある
      },
    });

    return NextResponse.json(newItem, { status: 201 }); // 登録した商品を返す
  } catch (error) {
    console.error("商品登録エラー:", error);
    return NextResponse.json({ message: "商品登録に失敗しました。" }, { status: 500 });
  }
}