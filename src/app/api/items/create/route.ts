import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { productInfo, tags } = await request.json(); // 商品情報とタグ情報を受け取る

    // 必須フィールドのバリデーション (簡易的な例)
    if (!productInfo || !productInfo.boothJpUrl || !productInfo.title || !tags) {
      return NextResponse.json({ message: "必須情報が不足しています。" }, { status: 400 });
    }

    // タグが存在するか確認し、存在しない場合は作成
    const tagIds: string[] = [];
    for (const tagName of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        update: {}, // 存在する場合は何もしない
        create: {
          name: tagName,
          language: 'ja', // 仮に日本語とする。必要に応じて言語情報を追加
          category: 'other', // 仮にotherとする。必要に応じてカテゴリ情報を追加
          color: '#CCCCCC', // 仮の色
        },
      });
      tagIds.push(tag.id);
    }

    // 商品をデータベースに新規登録
    const newProduct = await prisma.product.create({
      data: {
        boothJpUrl: productInfo.boothJpUrl,
        boothEnUrl: productInfo.boothEnUrl,
        title: productInfo.title,
        description: productInfo.description,
        price: productInfo.price,
        publishedAt: new Date(productInfo.publishedAt), // Dateオブジェクトに変換
        userId: userId,
        sellerName: productInfo.sellerName,
        sellerUrl: productInfo.sellerUrl,
        sellerIconUrl: productInfo.sellerIconUrl,
        images: {
          create: productInfo.images.map((image: { imageUrl: string; isMain: boolean; order: number }) => ({
            imageUrl: image.imageUrl,
            isMain: image.isMain,
            order: image.order,
          })),
        },
        productTags: {
          create: tagIds.map(tagId => ({
            tagId: tagId,
            userId: userId, // タグを付けたユーザーとして登録ユーザーIDを使用
          })),
        },
      },
      include: {
        images: true,
        productTags: {
          include: {
            tag: true, // 関連するタグ情報も取得
          },
        },
      },
    });

    console.log('New product registered:', newProduct.id);

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("新規商品登録エラー:", error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ message: "新規商品登録に失敗しました。", error: errorMessage }, { status: 500 });
  }
}