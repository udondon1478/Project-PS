/**
 * 画像取得・リサイズモジュール
 * BOOTH商品画像をURL→Base64変換し、sharpで512pxにリサイズ
 */

import sharp from 'sharp';
import type { ProcessedImage } from './types';

/**
 * 画像URLからBase64エンコードされたJPEGを取得・リサイズする
 * @param imageUrls 画像URLの配列
 * @param maxImages 最大取得画像数
 * @param maxSize リサイズ先の最大辺ピクセル数
 * @returns 処理済み画像の配列（失敗した画像はスキップ）
 */
export async function fetchAndProcessImages(
  imageUrls: string[],
  maxImages: number = 5,
  maxSize: number = 512,
): Promise<ProcessedImage[]> {
  const urls = imageUrls.slice(0, maxImages);

  const results = await Promise.allSettled(
    urls.map((url) => fetchAndResize(url, maxSize)),
  );

  const images: ProcessedImage[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      images.push(result.value);
    }
  }

  return images;
}

async function fetchAndResize(
  url: string,
  maxSize: number,
): Promise<ProcessedImage | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PolySeek/1.0 (Product Analyzer)',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[ImageFetcher] Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // sharpでリサイズ + JPEG変換
    const resized = await sharp(buffer)
      .resize(maxSize, maxSize, {
        fit: 'inside', // アスペクト比を維持してmaxSize内に収める
        withoutEnlargement: true, // 元画像より大きくしない
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      base64: resized.toString('base64'),
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    console.warn(`[ImageFetcher] Error processing image ${url}:`, error);
    return null;
  }
}
