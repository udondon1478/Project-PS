import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma'; // lib/prismaからシングルトンインスタンスをインポート

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { productInfo, tags, ageRatingTagId, categoryTagId } = await request.json(); // 商品情報、タグ情報、対象年齢タグID、カテゴリータグIDを受け取る
    //console.log('Received productInfo:', productInfo); // ここにログを追加
    const { boothJpUrl, boothEnUrl, title, description, lowPrice, highPrice, publishedAt, sellerName, sellerUrl, sellerIconUrl, images, variations, boothTags } = productInfo;
    console.log('Received productInfo in create API:', productInfo); // 追加
    console.log('Validation check values:', { boothJpUrl, title, sellerUrl, tags, variations }); // 追加

    console.log('Received publishedAt:', publishedAt); // publishedAtの形式を確認するためのログ

    // 必須フィールドのバリデーション
    if (!productInfo || !boothJpUrl || !title || !sellerUrl || !tags || !variations) {
      console.error("必須情報が不足しています。", { productInfo, boothJpUrl, title, sellerUrl, tags, variations });
      return NextResponse.json({ message: "必須情報が不足しています。（販売者情報、バリエーション情報を含む）" }, { status: 400 });
    }

        // 独自タグ（manualTags）のリストを作成: ユーザーが選択したタグ + 対象年齢タグ + カテゴリータグ
        const manualTagNames = [...tags];
        if (ageRatingTagId) {
          const ageRatingTag = await prisma.tag.findUnique({ where: { id: ageRatingTagId }, select: { name: true } });
          if (ageRatingTag) {
            manualTagNames.push(ageRatingTag.name);
          }
        }
        if (categoryTagId) {
          const categoryTag = await prisma.tag.findUnique({ where: { id: categoryTagId }, select: { name: true } });
          if (categoryTag) {
            manualTagNames.push(categoryTag.name);
          }
        }

        // 独自タグ名の重複を削除
        const uniqueManualTagNames = Array.from(new Set(manualTagNames));

        // 公式タグ（boothTags）のリストを作成
        const officialTagNames: string[] = boothTags && Array.isArray(boothTags) ? boothTags : [];

        // タグカテゴリ 'other' を検索
        const otherTagCategory = await prisma.tagCategory.findUnique({
          where: { name: 'other' },
        });

        if (!otherTagCategory) {
          console.error('TagCategory "other" not found');
          return new Response(JSON.stringify({ error: 'TagCategory "other" not found' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // 独自タグのIDを取得・作成
        const manualTagIds: string[] = [];
        for (const tagName of uniqueManualTagNames) {
          const tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {}, // 存在する場合は何もしない
            create: {
              name: tagName,
              language: 'ja', // 仮に日本語とする。必要に応じて言語情報を追加
              tagCategory: { // リレーションを使用してカテゴリを接続
                connect: { id: otherTagCategory.id },
              },
            },
          });
          manualTagIds.push(tag.id);
        }

        // 公式タグのIDを取得・作成
        const officialTagIds: string[] = [];
        for (const tagName of officialTagNames) {
          const tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {}, // 存在する場合は何もしない
            create: {
              name: tagName,
              language: 'ja',
              tagCategory: {
                connect: { id: otherTagCategory.id },
              },
            },
          });
          officialTagIds.push(tag.id);
        }

        // 履歴用に全タグIDを結合（独自タグのみを履歴に記録）
        const allTagIds = [...manualTagIds];
    
        // 販売者が存在するか確認し、存在しない場合は作成
        let seller = null; // seller変数をifブロックの外で宣言
    
        // sellerUrlがリクエストに含まれている場合のみSellerのupsertを行う
        // sellerUrlは必須になったため、このelseブロックは基本的には実行されないが、念のため残しておく
        if (sellerUrl) {
          seller = await prisma.seller.upsert({
            where: { sellerUrl: sellerUrl }, // sellerUrlで検索 (ユニーク制約があるため)
            update: { // 存在する場合、アイコンURLとURLを更新
              name: sellerName, // nameも更新する可能性があるため追加
              iconUrl: sellerIconUrl,
            },
            create: { // 存在しない場合、新規作成
              name: sellerName,
              iconUrl: sellerIconUrl,
              sellerUrl: sellerUrl, // フィールド名をurlからsellerUrlに修正
            },
          });
        } else {
          console.warn("Seller URL not found in request, skipping seller upsert.");
        }
    
        // 商品をデータベースに新規登録
        const newProduct = await prisma.product.create({
          data: {
            boothJpUrl: boothJpUrl,
            boothEnUrl: boothEnUrl,
            title: title,
            description: description,
            lowPrice: lowPrice, // lowPriceを直接使用
            highPrice: highPrice, // highPriceを直接使用
            publishedAt: new Date(publishedAt), // Dateオブジェクトに変換
            user: { // ユーザーリレーションを接続
              connect: { id: userId }
            },
            // 販売者リレーションを接続 (sellerが存在する場合のみ)
            // sellerUrlが取得できない場合はsellerはnullのままとなり、リレーションは作成されない
            ...(seller && {
              seller: {
                connect: { id: seller.id }
              }
            }),
            images: {
              create: images.map((image: { imageUrl: string; isMain: boolean; order: number }) => ({
                imageUrl: image.imageUrl,
                isMain: image.isMain,
                order: image.order,
              })),
            },
            productTags: {
              create: [
                // 独自タグ (isOfficial: false)
                ...manualTagIds.map(tagId => ({
                  tagId: tagId,
                  userId: userId, // タグを付けたユーザーとして登録ユーザーIDを使用
                  isOfficial: false,
                })),
                // 公式タグ (isOfficial: true)
                ...officialTagIds.map(tagId => ({
                  tagId: tagId,
                  userId: userId,
                  isOfficial: true,
                })),
              ],
            },
            variations: { // バリエーション情報を保存
              create: variations.map((variation: { name: string; price: number; type: string; order: number; isMain: boolean }) => ({
                name: variation.name,
                price: variation.price,
                type: variation.type,
                order: variation.order,
                isMain: variation.isMain,
              })),
            },
            tagEditHistory: { // 初期タグ登録履歴 (Version 1) を作成
              create: {
                editorId: userId,
                version: 1,
                addedTags: allTagIds, // 独自タグのみを履歴に記録
                removedTags: [],
                keptTags: [],
                comment: '初期登録',
              },
            },
          },
          include: {
            images: true,
            productTags: {
              include: {
                tag: true, // 関連するタグ情報も取得
              },
            },
            variations: true, // バリエーション情報もインクルード
            seller: true, // sellerリレーションを含める
            tagEditHistory: true, // 作成された履歴も含める
          },
        });
    
        console.log('New product registered:', newProduct.id);
    
        return NextResponse.json(newProduct, { status: 201 });
      } catch (error) {
        console.error("新規商品登録エラー:", error);
        // エラーオブジェクト全体をログ出力
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "不明なエラー";
        return NextResponse.json({ message: "新規商品登録に失敗しました。", error: errorMessage }, { status: 500 });
      }
    }