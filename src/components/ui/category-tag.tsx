'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { getTagStyle } from '@/lib/guidelines/categoryColors';
import { cn } from '@/lib/utils';

interface CategoryTagProps {
  name: string;
  categoryColor?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * カテゴリ色に基づいたタグ表示コンポーネント
 * ダークモード対応
 */
export function CategoryTag({
  name,
  categoryColor,
  size = 'sm',
  className,
}: CategoryTagProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ハイドレーション後にマウント状態を設定
  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR時はライトモードをデフォルトとして使用
  const isDark = mounted ? resolvedTheme === 'dark' : false;
  const style = getTagStyle(categoryColor || null, isDark);

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: style.backgroundColor,
        color: style.color,
      }}
    >
      {name}
    </span>
  );
}
