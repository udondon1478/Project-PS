"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

interface Tag {
  id: string;
  name: string;
  displayName?: string | null;
  description: string | null;
}

interface TagDescriptionEditorProps {
  tag: Tag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TagDescriptionEditor({ tag, open, onOpenChange, onSuccess }: TagDescriptionEditorProps) {
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tag) {
      setDescription(tag.description || '');
    }
  }, [tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/tags/${tag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, comment }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '説明の保存に失敗しました');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (!tag) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>タグ説明の編集: {tag.displayName || tag.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="タグの説明を入力..."
                rows={5}
              />
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="comment">コメント (任意)</Label>
              <Input
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="変更の理由を入力してください"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                キャンセル
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
