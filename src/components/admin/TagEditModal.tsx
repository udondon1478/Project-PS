// src/components/admin/TagEditModal.tsx
'use client';

import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tagCategories } from '@/data/guidelines/tagCategories';
import { TagWithCategory } from "@/types/tag";

// タグ候補APIから返されるタグの簡易型
interface TagSuggestion {
  id: string;
  name: string;
}

interface TagEditModalProps {
  tag: TagWithCategory | null; // 編集対象のタグ（nullの場合はモーダルを閉じる）
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // 成功時のコールバック
}

const TagEditModal = ({ tag, open, onOpenChange, onSuccess }: TagEditModalProps) => {
  const [formData, setFormData] = useState<Partial<TagWithCategory>>({
    id: '',
    name: '',
    tagCategoryId: '',
    language: 'ja',
    description: '',
    isAlias: false,
    canonicalId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [canonicalTagSuggestions, setCanonicalTagSuggestions] = useState<TagSuggestion[]>([]);
  const [showCanonicalTagSuggestions, setShowCanonicalTagSuggestions] = useState(false);
  const canonicalInputRef = useRef<HTMLInputElement>(null);
  const canonicalDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canonicalAbortRef = useRef<AbortController | null>(null);

  // 編集モードの場合、tagが変更されたらフォームデータを更新
  useEffect(() => {
    if (tag) {
      setFormData({
        id: tag.id,
        name: tag.name,
        tagCategoryId: tag.tagCategory?.id || '',
        language: tag.language,
        description: tag.description ?? '',
        isAlias: tag.isAlias,
        canonicalId: tag.canonicalId ?? '',
      });
    }
  }, [tag]);

  // クリーンアップ: デバウンスタイマーと進行中のリクエストをキャンセル
  useEffect(() => {
    return () => {
      if (canonicalDebounceRef.current) {
        clearTimeout(canonicalDebounceRef.current);
      }
      if (canonicalAbortRef.current) {
        canonicalAbortRef.current.abort();
      }
    };
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleCanonicalInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setFormData({ ...formData, canonicalId: query });
    setShowCanonicalTagSuggestions(true);

    // 既存のデバウンスタイマーをクリア
    if (canonicalDebounceRef.current) {
      clearTimeout(canonicalDebounceRef.current);
    }

    // 進行中のリクエストをキャンセル
    if (canonicalAbortRef.current) {
      canonicalAbortRef.current.abort();
    }

    if (query.length > 0) {
      // 300msのデバウンス後にフェッチを実行
      canonicalDebounceRef.current = setTimeout(async () => {
        const abortController = new AbortController();
        canonicalAbortRef.current = abortController;

        try {
          const response = await fetch(`/api/tags/search?query=${query}`, {
            signal: abortController.signal,
          });
          const data = await response.json();

          // リクエストがアボートされていない場合のみ結果を適用
          if (!abortController.signal.aborted) {
            if (response.ok) {
              setCanonicalTagSuggestions(data.map((tag: TagSuggestion) => ({ id: tag.id, name: tag.name })));
            } else {
              console.error("タグ候補の取得に失敗:", data.message);
              setCanonicalTagSuggestions([]);
            }
          }
        } catch (error) {
          // AbortErrorは無視（意図的なキャンセル）
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          console.error("タグ候補の取得中にエラーが発生:", error);
          setCanonicalTagSuggestions([]);
        }
      }, 300);
    } else {
      setCanonicalTagSuggestions([]);
    }
  };

  const handleCanonicalSuggestionClick = (suggestion: { id: string; name: string }) => {
    setFormData({ ...formData, canonicalId: suggestion.name });
    setShowCanonicalTagSuggestions(false);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/tags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update tag');
      }

      alert('タグを更新しました。');
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      alert(`タグの更新に失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error updating tag:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>タグを編集</DialogTitle>
          <DialogDescription>
            タグの情報を編集します。変更後は「更新」ボタンをクリックしてください。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">タグ名</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div>
            <Label htmlFor="tagCategoryId">カテゴリ</Label>
            <Select onValueChange={(value) => handleSelectChange('tagCategoryId', value)} value={formData.tagCategoryId || ''}>
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {tagCategories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="language">言語</Label>
            <Select onValueChange={(value) => handleSelectChange('language', value)} value={formData.language}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="言語を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja">日本語</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea id="description" name="description" value={formData.description ?? ''} onChange={handleChange} />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAlias"
              name="isAlias"
              checked={formData.isAlias}
              onCheckedChange={(checked) => {
                setFormData({ ...formData, isAlias: Boolean(checked) });
              }}
            />
            <Label htmlFor="isAlias">エイリアス</Label>
          </div>

          {formData.isAlias && (
            <div>
              <Label htmlFor="canonicalId">正規タグID</Label>
              <div className="relative">
                <Input
                  id="canonicalId"
                  name="canonicalId"
                  value={formData.canonicalId ?? ''}
                  onChange={handleCanonicalInputChange}
                  required={formData.isAlias}
                  ref={canonicalInputRef}
                  onFocus={() => setShowCanonicalTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCanonicalTagSuggestions(false), 100)}
                />
                {showCanonicalTagSuggestions && canonicalTagSuggestions.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                    {canonicalTagSuggestions.map(suggestion => (
                      <li
                        key={suggestion.id}
                        onClick={() => handleCanonicalSuggestionClick(suggestion)}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {suggestion.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '処理中...' : '更新'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TagEditModal;
