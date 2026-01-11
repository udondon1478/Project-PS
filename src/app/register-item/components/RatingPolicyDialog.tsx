'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RatingPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RatingPolicyDialog({
  open,
  onOpenChange,
}: RatingPolicyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>PolySeekのレーティング基準について</DialogTitle>
          <DialogDescription>
            独自のレーティングシステムを採用している理由について
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              PolySeekでは、クリエイターの表現の自由を尊重しつつ、全てのユーザーが安心してコンテンツを楽しめる環境を作るため、独自のレーティング基準を設けています。
            </p>
            <p>
              この基準は、作品の閲覧を不当に制限するものではなく、適切なユーザーに適切な作品を届けるための道しるべです。
            </p>
            <p>
              既存のプラットフォームの基準とは異なる部分もありますが、これはVR/メタバース空間という新しい表現媒体の特性を考慮し、よりきめ細やかなゾーニングを実現するためです。
            </p>
            <p>
              正確なレーティング設定にご協力いただくことで、意図しないトラブルを防ぎ、作品の魅力を正しく伝えることができます。
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
