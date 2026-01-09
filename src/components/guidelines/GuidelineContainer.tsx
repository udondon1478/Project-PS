'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { GuidelineDialog } from './GuidelineDialog';
import { GuidelineSheet } from './GuidelineSheet';

interface GuidelineContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'rating' | 'categories';
  initialRatingFlow?: boolean;
}

export function GuidelineContainer(props: GuidelineContainerProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return isMobile ? (
    <GuidelineSheet {...props} />
  ) : (
    <GuidelineDialog {...props} />
  );
}
