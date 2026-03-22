'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import TagSearchAutocomplete from './TagSearchAutocomplete';

interface Tag {
  id: string;
  name: string;
  displayName: string | null;
}

interface TagImplicationCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function TagImplicationCreateModal({
  open,
  onClose,
  onCreated,
}: TagImplicationCreateModalProps) {
  const [implyingTag, setImplyingTag] = useState<Tag | null>(null);
  const [impliedTag, setImpliedTag] = useState<Tag | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!implyingTag || !impliedTag) {
      toast.error('元タグと含意タグの両方を選択してください。');
      return;
    }

    if (implyingTag.id === impliedTag.id) {
      toast.error('同じタグは選択できません。');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/tag-implications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          implyingTagId: implyingTag.id,
          impliedTagId: impliedTag.id,
        }),
      });

      if (res.ok) {
        toast.success('含意ルールを作成しました。');
        setImplyingTag(null);
        setImpliedTag(null);
        onCreated();
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.message || '作成に失敗しました。');
      }
    } catch {
      toast.error('通信エラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setImplyingTag(null);
      setImpliedTag(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>含意ルールを追加</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-1">元タグ (A)</label>
            <TagSearchAutocomplete
              value={implyingTag}
              onChange={setImplyingTag}
              placeholder="元タグを検索..."
            />
          </div>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            A が付くと → B も自動付与
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">含意タグ (B)</label>
            <TagSearchAutocomplete
              value={impliedTag}
              onChange={setImpliedTag}
              placeholder="含意タグを検索..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '作成中...' : '作成'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
