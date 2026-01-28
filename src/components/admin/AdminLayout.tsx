'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/Breadcrumbs';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: '🏷️ タグ管理', exact: true },
    { href: '/admin/reports', label: '📢 通報管理' },
    { href: '/admin/avatars', label: '🤖 アバター管理' },
    { href: '/admin/users', label: '👥 ユーザー管理' },
    { href: '/admin/booth-scraper', label: '🔄 BOOTHスクレイパー' },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (!pathname) return false;
    if (exact) {
      return pathname === href;
    }
    // Prevent false matches for similar routes (e.g., /admin/reports vs /admin/reports-archive)
    // Only match if pathname is exactly href or if pathname starts with href followed by '/'
    return pathname === href || pathname.startsWith(href.endsWith('/') ? href : href + '/');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* パンくずリスト */}
      <Breadcrumbs />

      <h1 className="text-3xl font-bold mb-6">管理者画面</h1>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex flex-wrap -mb-px" aria-label="管理者メニュー">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
                isActive(item.href, item.exact)
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              )}
              aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* メインコンテンツ */}
      {children}
    </div>
  );
}
