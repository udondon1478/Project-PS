"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getTagStyle, hexToRgb } from '@/lib/guidelines/categoryColors';
import { tagCategories } from '@/data/guidelines/tagCategories';

/**
 * Interface representing a tag with optional category information.
 */
export interface TagWithCategoryInfo {
  id: string;
  name: string;
  description?: string | null;
  /** Whether the tag was automatically implied by another tag */
  isImplied?: boolean;
  tagCategory?: {
    id?: string;
    name?: string;
    color?: string;
  } | null;
}

/**
 * Props for the TagList component.
 */
interface TagListProps {
  /** List of tags to display */
  tags: TagWithCategoryInfo[];
  /** Callback when the user clicks the add to search (plus) button */
  onAddTagToSearch: (tagName: string) => void;
  /** Callback when the user clicks the exclude from search (minus) button */
  onAddNegativeTagToSearch: (tagName: string) => void;
  /** Callback when the user clicks the info button */
  onViewTagDetails: (tagId: string) => void;
  /** Visual variant of the list */
  variant: 'manual' | 'official';
  /** View mode affecting sizing (desktop vs mobile) */
  viewMode?: 'mobile' | 'desktop';
}

// 未分類カテゴリの定義
const UNCATEGORIZED_CATEGORY = {
  id: 'uncategorized',
  name: '未分類',
  color: '#6B7280', // グレー
  priority: 999, // 最後に表示
};

// カテゴリのマップを作成（優先度、色、名前）
const categoryPriorityMap = new Map<string, number>();
const categoryColorMap = new Map<string, string>();
const categoryNameMap = new Map<string, string>();

tagCategories.forEach(cat => {
  categoryPriorityMap.set(cat.id, cat.priority);
  categoryColorMap.set(cat.id, cat.color);
  categoryNameMap.set(cat.id, cat.name);
});

/**
 * Retrieves the display priority for a given category ID.
 * Returns the lowest priority (highest number) if undefined.
 */
function getCategoryPriority(categoryId: string | undefined): number {
  if (!categoryId) return UNCATEGORIZED_CATEGORY.priority;
  return categoryPriorityMap.get(categoryId) ?? UNCATEGORIZED_CATEGORY.priority;
}

// カテゴリラベルコンポーネント
interface CategoryLabelProps {
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

/**
 * Groups tags by their category and sorts both categories and tags within them.
 * 
 * Sorting rules:
 * 1. Categories are sorted by priority defined in `tagCategories`.
 * 2. Tags within a category are sorted alphabetically by name.
 * 3. "Uncategorized" is always last.
 * 
 * @param tags - The array of tags to group and sort.
 * @returns An array of category groups containing their respective tags.
 */
function groupAndSortTags(
  tags: TagWithCategoryInfo[]
): { categoryId: string; categoryName: string; color: string; tags: TagWithCategoryInfo[] }[] {
  // カテゴリIDでグループ化
  const groups = new Map<string, TagWithCategoryInfo[]>();

  tags.forEach(tag => {
    const categoryId = tag.tagCategory?.id || UNCATEGORIZED_CATEGORY.id;
    const group = groups.get(categoryId) ?? [];
    group.push(tag);
    groups.set(categoryId, group);
  });

  // 各グループ内をアルファベット/五十音順でソート
  groups.forEach((groupTags) => {
    groupTags.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  });

  // カテゴリ優先度順にソート
  const sortedCategories = Array.from(groups.entries()).sort((a, b) => {
    const priorityA = getCategoryPriority(a[0]);
    const priorityB = getCategoryPriority(b[0]);
    if (priorityA !== priorityB) return priorityA - priorityB;

    // 同順位の場合、未分類は必ず最後に
    const isUncatA = a[0] === UNCATEGORIZED_CATEGORY.id;
    const isUncatB = b[0] === UNCATEGORIZED_CATEGORY.id;
    if (isUncatA !== isUncatB) return isUncatA ? 1 : -1;

    // それ以外は安定性のためカテゴリIDでソート
    return a[0].localeCompare(b[0], 'ja');
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

/**
 * A component that renders a list of tags grouped by category.
 * 
 * Features:
 * - Groups tags by category with visual headers.
 * - Supports dark mode theming.
 * - Provides action buttons for search inclusion/exclusion and details view.
 * - Visually distinguishes implied tags (dashed border, opacity).
 */
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
            categoryName={group.categoryName}
            color={group.color}
            isDark={isDark}
          />
          {/* カテゴリ内のタグ */}
          <div className="space-y-1">
            {group.tags.map((tag) => {
              const categoryColor = group.color;
              const tagStyle = getTagStyle(categoryColor, isDark);
              const isImplied = tag.isImplied;

              return (
                <div
                  key={`${variant}-${tag.id}`}
                  className={`flex items-center justify-between gap-2 p-2 rounded-md transition-colors ${containerHoverClass} ${isImplied ? 'opacity-75' : ''}`}
                >
                  <span
                    className="text-sm font-medium min-w-0 truncate px-2.5 py-0.5 rounded-full inline-block max-w-full relative group/tag"
                    style={{
                      backgroundColor: tagStyle.backgroundColor,
                      color: tagStyle.color,
                      border: isImplied ? `1px dashed ${tagStyle.color}` : undefined,
                    }}
                  >
                    {tag.name}
                    {isImplied && (
                      <span className="sr-only">（自動付与）</span>
                    )}
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
                        <p>
                            {isImplied && <span className="block text-xs text-muted-foreground mb-1">※他のタグから自動的に付与されました</span>}
                            {tag.description || '説明文はありません。'}
                        </p>
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
