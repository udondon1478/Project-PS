"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getTagStyle } from '@/lib/guidelines/categoryColors';


interface TagListProps {
  tags: { id: string; name: string; description?: string | null; tagCategory?: { color?: string } | null }[];
  onAddTagToSearch: (tagName: string) => void;
  onAddNegativeTagToSearch: (tagName: string) => void;
  onViewTagDetails: (tagId: string) => void;
  variant: 'manual' | 'official';
  viewMode?: 'mobile' | 'desktop';
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
    <div className="pr-2 space-y-1">
      {tags.map((tag) => {
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
  );
};
