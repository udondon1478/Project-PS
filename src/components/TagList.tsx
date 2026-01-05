"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tag } from "@prisma/client"; // あるいは types/product から

interface TagListProps {
  tags: { id: string; name: string; description?: string | null }[];
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
  const isManual = variant === 'manual';

  // スタイル定義
  const containerHoverClass = isManual 
    ? "hover:bg-blue-100 dark:hover:bg-blue-800/50" 
    : "hover:bg-gray-100 dark:hover:bg-gray-700/50";
  
  const textClass = isManual
    ? "text-gray-900 dark:text-gray-100" // マニュアルタグの文字色 (調整が必要なら変える)
    : "text-gray-600 dark:text-gray-400";

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
  // Info icon size might be consistent or follow the requested change logic. 
  // CodeRabbit mentioned "icon size 18 when variant==='mobile', otherwise... icon size 16 for desktop".
  // Let's stick to consistent sizes for all icons within the same viewMode.

  return (
    <div className="pr-2 space-y-1">
      {tags.map((tag) => (
        <div
          key={`${variant}-${tag.id}`}
          className={`flex items-center justify-between p-2 rounded-md transition-colors ${containerHoverClass}`}
        >
          <span className={`text-sm font-medium pr-2 flex-1 min-w-0 truncate ${textClass}`}>
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
      ))}
    </div>
  );
};
