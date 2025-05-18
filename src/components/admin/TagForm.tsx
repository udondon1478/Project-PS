// src/components/admin/TagForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Tag } from '@prisma/client'; // PrismaClientのTag型をインポート
import { Button } from "@/components/ui/button"; // shadcn/uiのButtonコンポーネントをインポート
import { Input } from "@/components/ui/input"; // shadcn/uiのInputコンポーネントをインポート
import { Textarea } from "@/components/ui/textarea"; // shadcn/uiのTextareaコンポーネントをインポート
import { Label } from "@/components/ui/label"; // shadcn/uiのLabelコンポーネントをインポート
import { Checkbox } from "@/components/ui/checkbox"; // shadcn/uiのCheckboxコンポーネントをインポート
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // shadcn/uiのSelectコンポーネントをインポート

interface TagFormProps {
  initialData?: Tag; // 編集の場合、初期データとしてタグオブジェクトを受け取る
  onSuccess: () => void; // 成功時のコールバック
}

const TagForm = ({ initialData, onSuccess }: TagFormProps) => {
  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    name: initialData?.name || '',
    type: initialData?.type || '',
    category: initialData?.category || '',
    color: initialData?.color || '#CCCCCC', // デフォルトカラー
    language: initialData?.language || 'ja', // デフォルト言語
    description: initialData?.description || '',
    isAlias: initialData?.isAlias || false,
    canonicalId: initialData?.canonicalId || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 編集モードの場合、initialDataが変更されたらフォームデータを更新
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name,
        type: initialData.type,
        category: initialData.category,
        color: initialData.color,
        language: initialData.language,
        description: initialData.description || '',
        isAlias: initialData.isAlias,
        canonicalId: initialData.canonicalId || '',
      });
    } else {
       // 新規作成モードの場合、フォームをリセット
       setFormData({
        id: '',
        name: '',
        type: '',
        category: '',
        color: '#CCCCCC',
        language: 'ja',
        description: '',
        isAlias: false,
        canonicalId: '',
      });
    }
  }, [initialData]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
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
    setSuccess(false);

    const method = initialData ? 'PUT' : 'POST';
    const url = '/api/admin/tags';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Failed to ${initialData ? 'update' : 'create'} tag`);
      }

      setSuccess(true);
      alert(`タグを${initialData ? '更新' : '作成'}しました。`);
      onSuccess(); // 成功時のコールバックを実行

      // 新規作成モードの場合、フォームをクリア
      if (!initialData) {
         setFormData({
            id: '',
            name: '',
            type: '',
            category: '',
            color: '#CCCCCC',
            language: 'ja',
            description: '',
            isAlias: false,
            canonicalId: '',
          });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      alert(`タグの${initialData ? '更新' : '作成'}に失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(`Error ${initialData ? 'updating' : 'creating'} tag:`, err);
    } finally {
      setLoading(false);
    }
  };

  // TODO: タグタイプとカテゴリの選択肢を動的に取得する

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">タグ名</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="type">タイプ</Label>
         {/* TODO: タイプは固定値ではなく、動的に取得または定義済みのリストから選択させる */}
        <Input id="type" name="type" value={formData.type} onChange={handleChange} required />
      </div>
       <div>
        <Label htmlFor="category">カテゴリ</Label>
         {/* TODO: カテゴリは固定値ではなく、動的に取得または定義済みのリストから選択させる */}
        <Input id="category" name="category" value={formData.category} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="color">色</Label>
        <Input id="color" name="color" type="color" value={formData.color} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="language">言語</Label>
         {/* TODO: 言語は固定値ではなく、定義済みのリストから選択させる */}
         <Select onValueChange={(value) => handleSelectChange('language', value)} value={formData.language}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="言語を選択" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ja">日本語</SelectItem>
                <SelectItem value="en">English</SelectItem>
                {/* 他の言語オプションを追加 */}
            </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="description">説明</Label>
        <Textarea id="description" name="description" value={formData.description} onChange={handleChange} />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isAlias"
          name="isAlias"
          checked={formData.isAlias}
          onCheckedChange={(checked) => {
            // checkedがboolean型であることを確認してstateを更新
            setFormData({ ...formData, isAlias: Boolean(checked) });
          }}
        />
        <Label htmlFor="isAlias">エイリアs</Label>
      </div>
      {formData.isAlias && (
        <div>
          <Label htmlFor="canonicalId">正規タグID</Label>
          <Input id="canonicalId" name="canonicalId" value={formData.canonicalId} onChange={handleChange} required={formData.isAlias} />
        </div>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? '処理中...' : initialData ? '更新' : '作成'}
      </Button>
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">成功しました！</p>}
    </form>
  );
};

export default TagForm;