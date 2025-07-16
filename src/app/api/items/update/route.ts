import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: "認証が必要です。" }, { status: 401 });
  }

  try {
    // 'general' カテゴリが存在しない場合は作成し、IDを取得
    const generalTagCategory = await prisma.tagCategory.upsert({
      where: { name: 'general' },
      update: {},
      create: {
        name: 'general',
        color: '#CCCCCC', // デフォルトの色
      },
    });

    const { productId, ageRatingTagId, categoryTagId, tags } = await request.json();

    if (!productId) {
      return NextResponse.json({ message: "商品IDが不足しています。" }, { status: 400 });
    }

    // データベースから既存の商品情報を取得し、Booth.pmのURLを取得
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        productTags: {
          select: {
            tagId: true,
          },
        },
        seller: true, // sellerリレーションを含める
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ message: "指定された商品が見つかりません。" }, { status: 404 });
    }

    const boothUrl = existingProduct.boothJpUrl;

    // Booth.pmのページからHTMLコンテンツを取得
    const response = await fetch(boothUrl, {
      headers: {
        'Cookie': 'adult=t'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ message: `Booth.pmからの情報取得に失敗しました。ステータスコード: ${response.status}` }, { status: response.status });
    }
    const html = await response.text();

    // cheerioでHTMLを解析
    const $ = cheerio.load(html);

    let productInfo: any; // productInfoを初期化 (any型を許容)
    let title: string = existingProduct.title;
    let description: string = '';
    let markdownDescription: string = '';
    let lowPrice: number = existingProduct.lowPrice;
    let highPrice: number = existingProduct.highPrice;
    let sellerName: string | null = existingProduct.seller?.name || null;
    let sellerUrl: string | null = existingProduct.seller?.sellerUrl || null;
    let sellerIconUrl: string | null = existingProduct.seller?.iconUrl || null;

    // Schema.orgのJSONデータを抽出・解析
    const schemaOrgData = $('script[type="application/ld+json"]').html();

    if (!schemaOrgData) {
      console.warn("Schema.orgデータが見つかりませんでした。HTMLから情報を抽出します。");

      // タイトル
      title = $('title').text().replace(/ - BOOTH$/, '') || existingProduct.title;

      // 価格
      const priceText = $('.price').text().trim();
      if (priceText) {
        const priceValue = parseFloat(priceText.replace('¥', '').replace(',', ''));
        if (!isNaN(priceValue)) {
          lowPrice = priceValue;
          highPrice = priceValue; // 単一価格として扱う
        }
      }

      // 販売者情報
      sellerName = $('.shop-name').text().trim() || existingProduct.seller?.name || null;
      sellerUrl = $('.shop-name a.nav').attr('href') || existingProduct.seller?.sellerUrl || null; // 修正
      // 販売者アイコンURLはHTMLから直接取得が難しい場合があるため、既存の値を使用
      sellerIconUrl = existingProduct.seller?.iconUrl || null;

      // publishedAtはHTMLから取得が困難なため、既存の値を使用
      // publishedAt = existingProduct.publishedAt; // または new Date()
    } else {
      productInfo = JSON.parse(schemaOrgData);
      console.log("Schema.org Data for update:", productInfo);

      // Schema.orgからタイトルを抽出
      title = productInfo.name || existingProduct.title;

      // Schema.orgから価格を抽出
      if (productInfo.offers) {
        if (Array.isArray(productInfo.offers)) {
          lowPrice = productInfo.offers[0]?.lowPrice ? parseFloat(productInfo.offers[0].lowPrice) : existingProduct.lowPrice;
          highPrice = productInfo.offers[0]?.highPrice ? parseFloat(productInfo.offers[0].highPrice) : existingProduct.highPrice;
        } else if (productInfo.offers.price) {
          lowPrice = parseFloat(productInfo.offers.price);
          highPrice = parseFloat(productInfo.offers.price);
        } else {
          console.warn("Schema.org offers structure is unexpected:", productInfo.offers);
        }
      }
      // Schema.orgデータにpublishedAtがないため、ここでは既存の値を使用
      // 販売者情報はSchema.orgデータに含まれていないため、ここではHTMLからスクレイピング
    }

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
        if (headingElement.length && typeof tagName === 'string') {
          const headingText = headingElement.text().trim();
          const headingLevel = parseInt(tagName.slice(1));
          markdownDescription += `${'#'.repeat(headingLevel)} ${headingText}\n\n`; // 見出しと内容の間に空行を追加
        }

        // shop__text の中にある p タグを抽出
        const paragraphElements = $(elem).find('p');
        paragraphElements.each((i, paragraphElem) => {
          const paragraphText = $(paragraphElem).text().trim();
          if (paragraphText) {
            markdownDescription += `${paragraphText}\n\n`; // 段落間に空行を追加
          }
        });
      });
    }

    description = markdownDescription.trim();
    if (!description) {
        description = existingProduct.description || ''; // 取得できない場合は既存の値を使用
    }


    // 複数の商品画像URLをHTMLから取得 (data-origin属性から取得)
    const imageUrls: string[] = [];
    // メイン画像とサムネイル画像の要素からdata-origin属性を取得
    $('.market-item-detail-item-image, .primary-image-thumbnails img').each((i, elem) => {
      const imageUrl = $(elem).attr('data-origin');
      if (imageUrl && imageUrl.startsWith('https://booth.pximg.net/') && !imageUrls.includes(imageUrl)) {
        imageUrls.push(imageUrl);
      }
    });

    // バリエーション情報を取得
    const variations: { name: string; price: number; type: string; order: number; isMain: boolean }[] = [];

    // HTMLからバリエーション情報を抽出
    $('.variations .variation-item').each((i, elem) => {
      const name = $(elem).find('.variation-name').text().trim();
      const priceText = $(elem).find('.variation-price').text().trim();
      const price = parseFloat(priceText.replace('¥', '').replace(',', '').trim());
      const type = $(elem).find('.u-tpg-caption1').text().trim();

      variations.push({
        name,
        price,
        type,
        order: i,
        isMain: i === 0 // 最初のバリエーションをメインとする
      });
    });

    // 既存のタグIDを取得
    const existingTagIds = existingProduct.productTags.map(pt => pt.tagId);

    // 更新で受け取った対象年齢タグIDとカテゴリータグIDを既存のタグIDリストに追加
    const tagIdsToConnect = [...existingTagIds];
    if (ageRatingTagId && !tagIdsToConnect.includes(ageRatingTagId)) {
      tagIdsToConnect.push(ageRatingTagId);
    }
    if (categoryTagId && !tagIdsToConnect.includes(categoryTagId)) {
      tagIdsToConnect.push(categoryTagId);
    }

    // 手動で追加されたタグ名をタグIDに変換し、既存のタグIDリストに追加
    if (tags && Array.isArray(tags)) {
      for (const tagName of tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: {
            name: tagName,
            language: 'ja', // 仮に日本語とする。必要に応じて言語情報を追加
            tagCategoryId: generalTagCategory.id, // 取得または作成したgeneralカテゴリのID
          },
        });
        if (!tagIdsToConnect.includes(tag.id)) {
          tagIdsToConnect.push(tag.id);
        }
      }
    }

    // データベースの商品情報を更新
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        title: title,
        description: description,
        lowPrice: lowPrice,
        highPrice: highPrice,
        // publishedAt, // publishedAtは更新しない
        seller: sellerName && sellerUrl ? { // sellerNameとsellerUrlが存在する場合のみsellerを更新
          upsert: {
            where: { sellerUrl: sellerUrl },
            update: { name: sellerName, iconUrl: sellerIconUrl },
            create: { name: sellerName, sellerUrl: sellerUrl, iconUrl: sellerIconUrl },
          },
        } : undefined,
        images: { // 既存の画像を削除し、新しい画像を作成
          deleteMany: {}, // 既存の関連画像を全て削除
          create: imageUrls.map((imageUrl, index) => ({
            imageUrl: imageUrl,
            isMain: index === 0, // 最初の画像をメイン画像とみなす
            order: index, // 表示順序を設定
          })),
        },
        variations: { // 既存のバリエーションを削除し、新しいバリエーションを作成
          deleteMany: {}, // 既存の関連バリエーションを全て削除
          create: variations.map(variation => ({
            name: variation.name,
            price: variation.price,
            type: variation.type,
            order: variation.order,
            isMain: variation.isMain,
          })),
        },
        productTags: { // 既存のタグを維持しつつ、新しいタグを追加
          deleteMany: { // 既存のタグを全て削除
            productId: productId,
          },
          create: tagIdsToConnect.map(tagId => ({ // 更新後のタグリストで再作成
            tagId: tagId,
            userId: existingProduct.userId, // タグを付けたユーザーは既存商品の登録ユーザーとする
          })),
        },
      },
      include: {
        images: true,
        productTags: {
          include: {
            tag: true,
          },
        },
        variations: true, // バリエーション情報もインクルード
      },
    });

    console.log('Product updated:', updatedProduct.id);

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    console.error("商品情報更新エラー:", error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ message: "商品情報の更新に失敗しました。", error: errorMessage }, { status: 500 });
  }
}