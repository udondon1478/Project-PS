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

  // const userId = session.user.id; // 更新処理では直接使用しないが、認証チェックのために取得

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

    const { productId, ageRatingTagId, categoryTagId, tags } = await request.json(); // 更新対象の商品ID、対象年齢タグID、カテゴリータグID、手動タグを受け取る
 
    if (!productId) {
      return NextResponse.json({ message: "商品IDが不足しています。" }, { status: 400 });
    }
 
    // データベースから既存の商品情報を取得し、Booth.pmのURLを取得
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        productTags: { // 既存のタグ情報を含める
          select: {
            tagId: true,
          },
        },
      },
    });
 
    if (!existingProduct) {
      return NextResponse.json({ message: "指定された商品が見つかりません。" }, { status: 404 });
    }
 
    const boothUrl = existingProduct.boothJpUrl; // 日本語版URLを使用
    
    // Booth.pmのページからHTMLコンテンツを取得
    const response = await fetch(boothUrl);
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
    console.log("Schema.org Data for update:", productInfo);
 
    // 必要な商品情報を抽出
    const title = productInfo.name || existingProduct.title; // 取得できない場合は既存の値を使用
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
    if (!description) {
        description = existingProduct.description || ''; // 取得できない場合は既存の値を使用
    }
 
 
    let lowPrice = existingProduct.lowPrice;
    let highPrice = existingProduct.highPrice;
 
    if (productInfo.offers) {
      if (Array.isArray(productInfo.offers)) {
        // 複数価格の場合
        lowPrice = productInfo.offers[0]?.lowPrice ? parseFloat(productInfo.offers[0].lowPrice) : existingProduct.lowPrice;
        highPrice = productInfo.offers[0]?.highPrice ? parseFloat(productInfo.offers[0].highPrice) : existingProduct.highPrice;
      } else if (productInfo.offers.price) {
        // 単一価格の場合
        lowPrice = parseFloat(productInfo.offers.price);
        highPrice = parseFloat(productInfo.offers.price);
      } else {
        // offersはあるがprice, lowPrice, highPriceがない場合（想定外のケース）
        console.warn("Schema.org offers structure is unexpected:", productInfo.offers);
      }
    }
    // Schema.orgデータにpublishedAtがないため、ここでは既存の値を使用
    // Schema.orgデータにpublishedAtがないため、ここでは既存の値を使用
    // 販売者情報はSchema.orgデータに含まれていないため、ここでは既存の値を使用
 
 
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
        // sellerName, // 販売者情報は更新しない
        // sellerUrl,
        // sellerIconUrl,
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