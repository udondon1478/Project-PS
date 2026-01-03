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

// 動的セグメント解決用のキャッシュ（LRU実装）
class LRUCache {
  private cache: Map<string, string>;
  private maxEntries: number;

  constructor(maxEntries = 100) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
  }

  get(key: string): string | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    // LRU: アクセスされたアイテムを最後に移動
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: string, value: string): void {
    // 既存のキーがあれば削除（最後に再追加するため）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // 容量超過時は最も古いエントリを削除
    else if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

const dynamicSegmentCache = new LRUCache(100);

// 動的セグメントの表示名を解決する関数
async function resolveDynamicSegment(
  segment: string,
  previousSegment?: string,
  signal?: AbortSignal
): Promise<string> {
  // キャッシュをチェック
  const cacheKey = `${previousSegment || ''}:${segment}`;
  const cached = dynamicSegmentCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 前のセグメントに基づいてAPIエンドポイントを決定
  if (previousSegment === 'products') {
    // タイムアウト用のAbortController（5秒）
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 5000);

    try {
      // 外部シグナルとタイムアウトシグナルを結合
      const combinedSignal = signal && 'any' in AbortSignal
        ? (AbortSignal as any).any([signal, timeoutController.signal])
        : signal || timeoutController.signal;

      const response = await fetch(`/api/products/${segment}`, {
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const product = await response.json();
        const displayName = product.name || decodeURIComponent(segment);
        dynamicSegmentCache.set(cacheKey, displayName);
        return displayName;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      // AbortErrorは静かに処理（キャンセルまたはタイムアウト）
      if (error instanceof Error && error.name === 'AbortError') {
        // キャンセルされた場合はデコードされたセグメントを返す
        const fallback = decodeURIComponent(segment);
        return fallback;
      }

      // その他のエラーはログに記録
      console.error('Failed to resolve dynamic segment:', error);
    }
  }

  // その他の場合はデコードされたセグメントを返す
  const fallback = decodeURIComponent(segment);
  dynamicSegmentCache.set(cacheKey, fallback);
  return fallback;
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const [breadcrumbItems, setBreadcrumbItems] = useState<Array<{ href: string; label: string; isLast: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // ホームページではパンくずを表示しない
    if (!pathname || pathname === '/') {
      setBreadcrumbItems([]);
      setIsLoading(false);
      return;
    }

    // キャンセルガード: パスが変わったら古い非同期処理を無効化
    let isCancelled = false;
    const abortController = new AbortController();

    // パスを分割してセグメントを作成
    const segments = pathname.split('/').filter(Boolean);

    // パンくずリストのアイテムを非同期で生成
    const generateBreadcrumbs = async () => {
      setIsLoading(true);

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
            displayName = await resolveDynamicSegment(segment, previousSegment, abortController.signal);
          }

          return {
            href,
            label: displayName,
            isLast,
          };
        })
      );

      // キャンセルされていなければ状態を更新
      if (!isCancelled) {
        setBreadcrumbItems(items);
        setIsLoading(false);
      }
    };

    generateBreadcrumbs();

    // クリーンアップ関数: エフェクトが再実行されるときにキャンセルフラグを立てる
    return () => {
      isCancelled = true;
      abortController.abort();
    };
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

        {/* ローディング中のスケルトン表示 */}
        {isLoading && breadcrumbItems.length === 0 && (
          <>
            <li aria-hidden="true">
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </li>
            <li>
              <span className="inline-block h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </li>
          </>
        )}

        {/* セグメント */}
        {breadcrumbItems.map((item) => (
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
