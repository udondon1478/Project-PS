'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment, useState, useEffect } from 'react';

// パスセグメントの表示名をマッピング
const segmentDisplayNames: Record<string, string> = {
  'admin': '管理者画面',
  'users': 'ユーザー管理',
  'reports': '通報管理',
  'booth-scraper': 'BOOTHスクレイパー',
  'profile': 'プロフィール',
  'likes': 'いいねした商品',
  'owned': '所有済み商品',
  'register-item': '商品登録',
  'search': '検索結果',
  'products': '商品',
  'edit': '編集',
};

// 動的セグメント解決用のキャッシュ
const dynamicSegmentCache: Record<string, string> = {};

// 動的セグメントの表示名を解決する関数
async function resolveDynamicSegment(segment: string, previousSegment?: string): Promise<string> {
  // キャッシュをチェック
  const cacheKey = `${previousSegment || ''}:${segment}`;
  if (dynamicSegmentCache[cacheKey]) {
    return dynamicSegmentCache[cacheKey];
  }

  // 前のセグメントに基づいてAPIエンドポイントを決定
  if (previousSegment === 'products') {
    try {
      const response = await fetch(`/api/products/${segment}`);
      if (response.ok) {
        const product = await response.json();
        const displayName = product.name || decodeURIComponent(segment);
        dynamicSegmentCache[cacheKey] = displayName;
        return displayName;
      }
    } catch (error) {
      // フォールバック: デコードされたセグメントを返す
      console.error('Failed to resolve dynamic segment:', error);
    }
  }

  // その他の場合はデコードされたセグメントを返す
  const fallback = decodeURIComponent(segment);
  dynamicSegmentCache[cacheKey] = fallback;
  return fallback;
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const [breadcrumbItems, setBreadcrumbItems] = useState<Array<{ href: string; label: string; isLast: boolean }>>([]);

  useEffect(() => {
    // ホームページではパンくずを表示しない
    if (!pathname || pathname === '/') {
      setBreadcrumbItems([]);
      return;
    }

    // パスを分割してセグメントを作成
    const segments = pathname.split('/').filter(Boolean);

    // パンくずリストのアイテムを非同期で生成
    const generateBreadcrumbs = async () => {
      const items = await Promise.all(
        segments.map(async (segment, index) => {
          const href = '/' + segments.slice(0, index + 1).join('/');
          const isLast = index === segments.length - 1;
          const previousSegment = index > 0 ? segments[index - 1] : undefined;

          // 静的マッピングにあればそれを使用、なければ動的解決を試みる
          let displayName: string;
          if (segmentDisplayNames[segment]) {
            displayName = segmentDisplayNames[segment];
          } else {
            displayName = await resolveDynamicSegment(segment, previousSegment);
          }

          return {
            href,
            label: displayName,
            isLast,
          };
        })
      );

      setBreadcrumbItems(items);
    };

    generateBreadcrumbs();
  }, [pathname]);

  // ホームページではパンくずを表示しない
  if (!pathname || pathname === '/') {
    return null;
  }

  return (
    <nav aria-label="パンくずリスト" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
        {/* ホームリンク */}
        <li>
          <Link
            href="/"
            className="flex items-center hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            aria-label="ホームに戻る"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>

        {/* セグメント */}
        {breadcrumbItems.map((item, index) => (
          <Fragment key={item.href}>
            <li aria-hidden="true">
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </li>
            <li>
              {item.isLast ? (
                <span className="font-medium text-gray-900 dark:text-gray-100" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
