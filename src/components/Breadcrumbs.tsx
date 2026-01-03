'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

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

export default function Breadcrumbs() {
  const pathname = usePathname();

  // ホームページではパンくずを表示しない
  if (!pathname || pathname === '/') {
    return null;
  }

  // パスを分割してセグメントを作成
  const segments = pathname.split('/').filter(Boolean);

  // パンくずリストのアイテムを生成
  const breadcrumbItems = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const displayName = segmentDisplayNames[segment] || decodeURIComponent(segment);
    const isLast = index === segments.length - 1;

    return {
      href,
      label: displayName,
      isLast,
    };
  });

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
