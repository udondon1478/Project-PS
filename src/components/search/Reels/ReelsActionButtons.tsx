"use client";

import React, { useState } from 'react';
import { Heart, Share2, ShoppingCart, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ReelsActionButtonsProps {
  productId: string;
  boothUrl: string;
  isLiked: boolean;
  onTagsClick: () => void;
}

export function ReelsActionButtons({
  productId,
  boothUrl,
  isLiked: initialIsLiked,
  onTagsClick,
}: ReelsActionButtonsProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLikeClick = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const originalIsLiked = isLiked;
    setIsLiked(!originalIsLiked);

    try {
      const method = !originalIsLiked ? 'POST' : 'DELETE';
      const response = await fetch(`/api/products/${productId}/like`, { method });

      if (response.status === 401 || response.redirected) {
        setIsLiked(originalIsLiked);
        if (response.status === 401) {
          toast.error('この操作を行うにはログインが必要です');
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      setIsLiked(originalIsLiked);
      console.error('Like error:', error);
      toast.error('エラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareClick = async () => {
    const shareUrl = `${window.location.origin}/products/${productId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share error:', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('URLをコピーしました');
      } catch (error) {
        console.error('Clipboard error:', error);
        toast.error('コピーに失敗しました');
      }
    }
  };

  const handleBoothClick = () => {
    window.open(boothUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="absolute bottom-24 right-4 flex flex-col gap-3"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)' }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 rounded-full bg-background/70 backdrop-blur-sm"
        onClick={handleLikeClick}
        disabled={isProcessing}
        aria-label={isLiked ? 'いいねを解除' : 'いいね'}
      >
        <Heart
          className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
        />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 rounded-full bg-background/70 backdrop-blur-sm"
        onClick={handleShareClick}
        aria-label="シェア"
      >
        <Share2 className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 rounded-full bg-background/70 backdrop-blur-sm"
        onClick={handleBoothClick}
        aria-label="BOOTHで見る"
      >
        <ShoppingCart className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 rounded-full bg-background/70 backdrop-blur-sm"
        onClick={onTagsClick}
        aria-label="タグを表示"
      >
        <Tags className="h-6 w-6" />
      </Button>
    </div>
  );
}
