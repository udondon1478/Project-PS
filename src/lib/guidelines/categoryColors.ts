/**
 * タグカテゴリのカラー管理ユーティリティ
 */

import { tagCategories } from '@/data/guidelines/tagCategories';

/**
 * カテゴリ名からカラー情報を取得
 */
export function getCategoryColor(categoryName: string): string {
  const category = tagCategories.find(
    (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
  );
  return category?.color || '#6B7280'; // デフォルトはグレー
}

/**
 * HEXカラーコードからRGBA値を抽出
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // 3桁または6桁のHEXカラーコードを正規表現でマッチング
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const hex6 = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex6);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * カラーの明るさを計算（0-255）
 * 128以上なら明るい色、未満なら暗い色として判定
 */
export function getColorBrightness(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 128;
  // 人間の目の感度を考慮した明るさ計算式
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

/**
 * 背景色に対して適切なテキスト色を返す
 */
export function getContrastTextColor(backgroundColor: string): string {
  const brightness = getColorBrightness(backgroundColor);
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

/**
 * カテゴリバッジ用のスタイルを生成
 */
export function getCategoryBadgeStyle(categoryName: string): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  const bgColor = getCategoryColor(categoryName);
  const textColor = getContrastTextColor(bgColor);

  return {
    backgroundColor: bgColor,
    color: textColor,
    borderColor: bgColor,
  };
}

/**
 * カテゴリカードの背景用スタイル（薄い背景色）
 */
export function getCategoryCardStyle(categoryName: string): {
  backgroundColor: string;
  borderColor: string;
} {
  const color = getCategoryColor(categoryName);
  const rgb = hexToRgb(color);

  if (!rgb) {
    // RGB変換に失敗した場合は統一されたグレーを使用
    const fallbackGray = 'rgba(107, 114, 128, 0.1)';
    const fallbackBorder = 'rgb(107, 114, 128)';
    return {
      backgroundColor: fallbackGray,
      borderColor: fallbackBorder,
    };
  }

  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
    borderColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
  };
}
