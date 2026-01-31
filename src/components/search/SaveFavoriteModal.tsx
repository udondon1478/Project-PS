import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from 'next-auth/react';

interface SaveFavoriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<{ success: boolean; error?: string }>;
  defaultName: string;
}

export const SaveFavoriteModal: React.FC<SaveFavoriteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultName,
}) => {
  const { status } = useSession();
  const [name, setName] = useState(defaultName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setError(null);
    }
  }, [isOpen, defaultName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onSave(name);
      if (result.success) {
        onClose();
      } else {
        setError(result.error || '保存に失敗しました');
      }
    } catch (e) {
      setError('予期せぬエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== 'authenticated') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ログインが必要です</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>お気に入り検索を保存するにはログインが必要です。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>キャンセル</Button>
            <Button asChild>
              <a href="/api/auth/signin">ログイン</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>検索条件をお気に入りに保存</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="favorite-name">名前</Label>
              <Input
                id="favorite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: マヌカちゃん用衣装"
                disabled={isSubmitting}
                autoFocus
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="text-sm text-gray-500">
              <p>現在の検索条件がこの名前で保存されます。</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
