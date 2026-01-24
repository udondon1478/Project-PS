"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getTagStyle, hexToRgb } from '@/lib/guidelines/categoryColors';
import { tagCategories } from '@/data/guidelines/tagCategories';

// タグの型定義
interface TagWithCategoryInfo {
  id: string;
  name: string;
  description?: string | null;
  tagCategory?: {
    id?: string;
    name?: string;
    color?: string;
  } | null;
}

interface TagListProps {
  tags: TagWithCategoryInfo[];
  onAddTagToSearch: (tagName: string) => void;
  onAddNegativeTagToSearch: (tagName: string) => void;
  onViewTagDetails: (tagId: string) => void;
  variant: 'manual' | 'official';
  viewMode?: 'mobile' | 'desktop';
}

// 未分類カテゴリの定義
const UNCATEGORIZED_CATEGORY = {
  id: 'uncategorized',
  name: '未分類',
  color: '#6B7280', // グレー
  priority: 999, // 最後に表示
};

// カテゴリの優先度マップを作成
const categoryPriorityMap = new Map<string, number>();
tagCategories.forEach(cat => {
  categoryPriorityMap.set(cat.id, cat.priority);
});

// カテゴリの色マップを作成
const categoryColorMap = new Map<string, string>();
tagCategories.forEach(cat => {
  categoryColorMap.set(cat.id, cat.color);
});

// カテゴリの名前マップを作成
const categoryNameMap = new Map<string, string>();
tagCategories.forEach(cat => {
  categoryNameMap.set(cat.id, cat.name);
});

// カテゴリの優先度を取得する関数
function getCategoryPriority(categoryId: string | undefined): number {
  if (!categoryId) return UNCATEGORIZED_CATEGORY.priority;
  return categoryPriorityMap.get(categoryId) ?? UNCATEGORIZED_CATEGORY.priority;
}

// カテゴリラベルコンポーネント
interface CategoryLabelProps {
  categoryId: string;
  categoryName: string;
  color: string;
  isDark: boolean;
}

function CategoryLabel({ categoryName, color, isDark }: CategoryLabelProps) {
  const rgb = hexToRgb(color);

  const style = rgb
    ? {
        backgroundColor: isDark
          ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`
          : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
        color: isDark
          ? `rgb(${Math.min(255, rgb.r + 60)}, ${Math.min(255, rgb.g + 60)}, ${Math.min(255, rgb.b + 60)})`
          : `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`,
        borderColor: isDark
          ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`
          : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
      }
    : {
        backgroundColor: isDark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(107, 114, 128, 0.15)',
        color: isDark ? '#9CA3AF' : '#4B5563',
        borderColor: isDark ? 'rgba(107, 114, 128, 0.4)' : 'rgba(107, 114, 128, 0.3)',
      };

  return (
    <div
      className="text-xs font-semibold px-2 py-1 rounded border mb-1"
      style={style}
    >
      {categoryName}
    </div>
  );
}

// タグをカテゴリ別にグループ化し、優先度順にソート
function groupAndSortTags(
  tags: TagWithCategoryInfo[]
): { categoryId: string; categoryName: string; color: string; tags: TagWithCategoryInfo[] }[] {
  // カテゴリIDでグループ化
  const groups = new Map<string, TagWithCategoryInfo[]>();

  tags.forEach(tag => {
    const categoryId = tag.tagCategory?.id || UNCATEGORIZED_CATEGORY.id;
    if (!groups.has(categoryId)) {
      groups.set(categoryId, []);
    }
    groups.get(categoryId)!.push(tag);
  });

  // 各グループ内をアルファベット/五十音順でソート
  groups.forEach((groupTags) => {
    groupTags.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  });

  // カテゴリ優先度順にソート
  const sortedCategories = Array.from(groups.entries()).sort((a, b) => {
    const priorityA = getCategoryPriority(a[0]);
    const priorityB = getCategoryPriority(b[0]);
    return priorityA - priorityB;
  });

  // 結果を構築
  return sortedCategories.map(([categoryId, groupTags]) => {
    const isUncategorized = categoryId === UNCATEGORIZED_CATEGORY.id;
    return {
      categoryId,
      categoryName: isUncategorized
        ? UNCATEGORIZED_CATEGORY.name
        : categoryNameMap.get(categoryId) || groupTags[0]?.tagCategory?.name || UNCATEGORIZED_CATEGORY.name,
      color: isUncategorized
        ? UNCATEGORIZED_CATEGORY.color
        : categoryColorMap.get(categoryId) || groupTags[0]?.tagCategory?.color || UNCATEGORIZED_CATEGORY.color,
      tags: groupTags,
    };
  });
}

export const TagList: React.FC<TagListProps> = ({
  tags,
  onAddTagToSearch,
  onAddNegativeTagToSearch,
  onViewTagDetails,
  variant,
  viewMode = 'desktop'
}) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ハイドレーション後にマウント状態を設定
  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR時はライトモードをデフォルトとして使用
  const isDark = mounted ? resolvedTheme === 'dark' : false;
  const isManual = variant === 'manual';

  // タグをカテゴリ別にグループ化してソート
  const groupedTags = useMemo(() => groupAndSortTags(tags), [tags]);

  // スタイル定義
  const containerHoverClass = isManual
    ? "hover:bg-blue-100 dark:hover:bg-blue-800/50"
    : "hover:bg-gray-100 dark:hover:bg-gray-700/50";

  // ボタンの色
  const minusClass = isManual
    ? "text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50"
    : "text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50";

  const plusClass = isManual
    ? "text-green-500 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/50"
    : "text-green-400 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50";

  const infoClass = isManual
    ? "text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50";

  // サイズ設定
  const isMobile = viewMode === 'mobile';
  const buttonClass = isMobile ? "h-9 w-9" : "h-7 w-7";
  const iconSize = isMobile ? 18 : 16;

  return (
    <div className="pr-2 space-y-3">
      {groupedTags.map((group) => (
        <div key={group.categoryId}>
          {/* カテゴリラベル */}
          <CategoryLabel
            categoryId={group.categoryId}
            categoryName={group.categoryName}
            color={group.color}
            isDark={isDark}
          />
          {/* カテゴリ内のタグ */}
          <div className="space-y-1">
            {group.tags.map((tag) => {
              const categoryColor = tag.tagCategory?.color || null;
              const tagStyle = getTagStyle(categoryColor, isDark);

              return (
                <div
                  key={`${variant}-${tag.id}`}
                  className={`flex items-center justify-between gap-2 p-2 rounded-md transition-colors ${containerHoverClass}`}
                >
                  <span
                    className="text-sm font-medium min-w-0 truncate px-2.5 py-0.5 rounded-full inline-block max-w-full"
                    style={{
                      backgroundColor: tagStyle.backgroundColor,
                      color: tagStyle.color,
                    }}
                  >
                    {tag.name}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`${buttonClass} ${minusClass}`}
                      onClick={() => onAddNegativeTagToSearch(tag.name)}
                      aria-label={`${tag.name}を検索から除外`}
                    >
                      <MinusCircle size={iconSize} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`${buttonClass} ${plusClass}`}
                      onClick={() => onAddTagToSearch(tag.name)}
                      aria-label={`${tag.name}を検索に追加`}
                    >
                      <PlusCircle size={iconSize} />
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`${buttonClass} ${infoClass}`}
                          onClick={() => onViewTagDetails(tag.id)}
                          aria-label={`${tag.name}の詳細を見る`}
                        >
                          <Info size={iconSize} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{tag.description || '説明文はありません。'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
