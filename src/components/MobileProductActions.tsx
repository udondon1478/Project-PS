"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Heart, Check, Tag } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';

interface MobileProductActionsProps {
  // CTAアクション
  isLiked: boolean;
  isOwned: boolean;
  isProcessingLike: boolean;
  isProcessingOwn: boolean;
  onLikeToggle: () => void;
  onOwnToggle: () => void;
  boothJpUrl: string;
  // タグ関連
  tagCount: number;
  onOpenTags: () => void;
}

const MobileProductActions: React.FC<MobileProductActionsProps> = ({
  isLiked,
  isOwned,
  isProcessingLike,
  isProcessingOwn,
  onLikeToggle,
  onOwnToggle,
  boothJpUrl,
  tagCount,
  onOpenTags,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      {/* タグ拡張ボタン */}
      <div className="bg-background/95 backdrop-blur-sm border-t dark:border-gray-800">
        <button
          onClick={onOpenTags}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          aria-label="タグ一覧を開く"
        >
          <Tag className="h-4 w-4" />
          <span>タグ ({tagCount})</span>
        </button>
      </div>

      {/* CTAバー */}
      <div className="bg-background/95 backdrop-blur-sm border-t dark:border-gray-800 p-3">
        <div className="flex items-center gap-2">
          {/* 欲しいボタン */}
          <Button
            onClick={onLikeToggle}
            disabled={isProcessingLike}
            variant={isLiked ? "default" : "outline"}
            size="sm"
            className="flex-1"
            aria-label={isLiked ? '欲しいものから外す' : '欲しいものに追加'}
          >
            <Heart className="h-4 w-4" fill={isLiked ? "currentColor" : "none"} />
            <span>欲しい</span>
          </Button>

          {/* 所有済みボタン */}
          <Button
            onClick={onOwnToggle}
            disabled={isProcessingOwn}
            variant={isOwned ? "default" : "outline"}
            size="sm"
            className="flex-1"
            aria-label={isOwned ? '所有済みから外す' : '所有済みにする'}
          >
            <Check className="h-4 w-4" />
            <span>所有</span>
          </Button>

          {/* Boothリンク */}
          <a
            href={boothJpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full">
              <FontAwesomeIcon icon={faLink} className="h-4 w-4" />
              <span>Booth</span>
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default MobileProductActions;
