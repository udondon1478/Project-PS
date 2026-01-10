'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { GuidelineDialog } from './GuidelineDialog';
import { GuidelineSheet } from './GuidelineSheet';
import { GuidelineSidePanel } from './GuidelineSidePanel';
import { RatingLevel } from '@/data/guidelines';

interface GuidelineContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'rating' | 'categories';
  initialRatingFlow?: boolean;
  mode?: 'modal' | 'sidepanel';
  onRatingSelected?: (rating: RatingLevel) => void;
}

export function GuidelineContainer({
  mode = 'modal',
  ...props
}: GuidelineContainerProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // 1024px未満は常にシート
  if (!isDesktop) {
    return <GuidelineSheet {...props} />;
  }

  // デスクトップはmodeに応じて切り替え
  return mode === 'sidepanel' ? (
    <GuidelineSidePanel {...props} />
  ) : (
    <GuidelineDialog {...props} />
  );
}
