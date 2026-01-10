'use client';

import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Sparkles } from 'lucide-react';

interface GuidelineOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewGuideline: () => void;
}

export const GuidelineOnboardingModal = memo(function GuidelineOnboardingModal({
  open,
  onOpenChange,
  onViewGuideline,
}: GuidelineOnboardingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">
              タグ付けガイドラインへようこそ
            </DialogTitle>
          </div>
          <DialogDescription className="text-base space-y-3 pt-2">
            <p>
              <strong>正確なタグ付け</strong>は、他のユーザーが商品を見つけるために重要です。
            </p>
            <p>
              ガイドラインでは、レーティングの判定方法やタグカテゴリの使い分けを
              分かりやすく説明しています。
            </p>
            <p className="text-sm text-muted-foreground">
              💡 初めての方は、ぜひガイドラインをご確認ください
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            後で見る
          </Button>
          <Button
            onClick={onViewGuideline}
            className="w-full sm:flex-1"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            ガイドラインを見る
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
