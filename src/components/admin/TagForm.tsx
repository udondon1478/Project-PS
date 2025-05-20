// src/components/admin/TagForm.tsx
'use client';

import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { Tag } from '@prisma/client'; // PrismaClientのTag型をインポート
import { Checkbox } from "@/components/ui/checkbox"; // shadcn/uiのCheckboxコンポーネントをインポート

// APIから取得するタグの型定義（TagモデルにtagCategoryリレーションを含めたもの）
// Tagの型を明示的に定義 (type, category, colorプロパティを含む)
interface TagWithType extends Tag {
  type: string;
  category: string;
  color: string;
}

// タグ候補APIから返されるタグの簡易型
interface TagSuggestion {
  id: string;
  name: string;
}
import { Button } from "@/components/ui/button"; // shadcn/uiのButtonコンポーネントをインポート
import { Input } from "@/components/ui/input"; // shadcn/uiのInputコンポーネントをインポート
import { Textarea } from "@/components/ui/textarea"; // shadcn/uiのTextareaコンポーネントをインポート
import { Label } from "@/components/ui/label"; // shadcn/uiのLabelコンポーネントをインポート
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // shadcn/uiのSelectコンポーネントをインポート

interface TagFormProps {
  initialData?: TagWithType; // 編集の場合、初期データとしてタグオブジェクトを受け取る
  onSuccess: () => void; // 成功時のコールバック
}

const TagForm = ({ initialData, onSuccess }: TagFormProps) => {
   interface FormData extends Partial<TagWithType> {
     newCategoryName?: string;
     newCategoryColor?: string;
   }
 
   const [formData, setFormData] = useState<FormData>({
     id: initialData?.id || '',
     name: initialData?.name || '',
     type: initialData?.type || '',
     category: initialData?.category || '',
     color: initialData?.color || '#CCCCCC', // デフォルトカラー
     language: initialData?.language || 'ja', // デフォルト言語
     description: initialData?.description ?? '',
     isAlias: initialData?.isAlias || false,
     canonicalId: initialData?.canonicalId ?? '',
     newCategoryName: '', // 新規カテゴリ名フィールドを追加
     newCategoryColor: '#CCCCCC', // 新規カテゴリ色フィールドを追加
   });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [tagTypes, setTagTypes] = useState<string[]>([]);
  const [tagCategories, setTagCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [isNewType, setIsNewType] = useState(!initialData?.type); // 新規作成時はtrue
  const [isNewCategory, setIsNewCategory] = useState(!initialData?.category); // 新規作成時はtrue

  const [canonicalTagSuggestions, setCanonicalTagSuggestions] = useState<TagSuggestion[]>([]);
  const [showCanonicalTagSuggestions, setShowCanonicalTagSuggestions] = useState(false);
  const canonicalInputRef = useRef<HTMLInputElement>(null);

  // タグタイプとカテゴリの選択肢を動的に取得
  useEffect(() => {
    const fetchTagOptions = async () => {
      try {
        // タグタイプを取得
        const typesResponse = await fetch('/api/admin/tag-types');
        const typesData = await typesResponse.json();
        if (typesResponse.ok) {
          setTagTypes(typesData);
        } else {
          console.error('Failed to fetch tag types:', typesData.message);
        }

        // カテゴリを取得 (product_category タイプに限定)
        const categoriesResponse = await fetch('/api/tags/by-type?type=product_category');
        const categoriesData = await categoriesResponse.json();
        if (categoriesResponse.ok) {
          setTagCategories(categoriesData);
        } else {
          console.error('Failed to fetch categories:', categoriesData.message);
        }
      } catch (error) {
        console.error('Error fetching tag options:', error);
      }
    };

    fetchTagOptions();
  }, []); // コンポーネントマウント時に一度だけ実行

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
        description: initialData.description ?? '', // nullish coalescing operator を使用
        isAlias: initialData.isAlias,
        canonicalId: initialData.canonicalId ?? '', // nullish coalescing operator を使用
      });
      // 編集時は初期値に基づいて新規入力モードを判定
      setIsNewType(!tagTypes.includes(initialData.type));
      setIsNewCategory(!tagCategories.some(cat => cat.id === initialData.category));

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
      setIsNewType(true); // 新規作成時は最初から新規入力モード
      setIsNewCategory(true); // 新規作成時は最初から新規入力モード
    }
  }, [initialData, tagTypes, tagCategories]); // initialData, tagTypes, tagCategories の変更を監視


  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleCanonicalInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setFormData({ ...formData, canonicalId: query }); // 入力値をcanonicalIdに一時的にセット
    setShowCanonicalTagSuggestions(true); // 候補リストを表示

    if (query.length > 0) {
      try {
        const response = await fetch(`/api/tags/search?query=${query}`);
        const data = await response.json();
        if (response.ok) {
          // タグ名とIDのペアを候補としてセット
          setCanonicalTagSuggestions(data.map((tag: TagSuggestion) => ({ id: tag.id, name: tag.name })));
        } else {
          console.error("タグ候補の取得に失敗:", data.message);
          setCanonicalTagSuggestions([]);
        }
      } catch (error) {
        console.error("タグ候補の取得中にエラーが発生:", error);
        setCanonicalTagSuggestions([]);
      }
    } else {
      setCanonicalTagSuggestions([]);
    }
  };

  const handleCanonicalSuggestionClick = (tag: { id: string; name: string }) => {
    setFormData({ ...formData, canonicalId: tag.name }); // 選択されたタグ名をcanonicalIdにセット
    setShowCanonicalTagSuggestions(false); // 候補リストを非表示
  };

   const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCheckboxChange = (name: 'isNewType' | 'isNewCategory', checked: boolean) => {
    if (name === 'isNewType') {
      setIsNewType(checked);
      if (!checked) {
        // 新規入力モード解除時、既存リストにタイプがあれば最初の項目を選択
        if (tagTypes.length > 0) {
          setFormData({ ...formData, type: tagTypes[0] });
        } else {
          setFormData({ ...formData, type: '' });
        }
      } else {
         // 新規入力モードON時、タイプをクリア
         setFormData({ ...formData, type: '' });
      }
    } else if (name === 'isNewCategory') {
      setIsNewCategory(checked);
       if (!checked) {
        // 新規入力モード解除時、既存リストにカテゴリがあれば最初の項目を選択
        if (tagCategories.length > 0) {
          setFormData({ ...formData, category: tagCategories[0].id });
        } else {
           setFormData({ ...formData, category: '' });
        }
      } else {
         // 新規入力モードON時、カテゴリをクリア
         setFormData({ ...formData, category: '' });
      }
    }
  };


  const handleCreateNewCategory = async () => {
    if (!formData.newCategoryName || !formData.newCategoryColor) {
      setError('新規カテゴリ名と色を入力してください。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/tag-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: formData.newCategoryName, color: formData.newCategoryColor }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create tag category');
      }

      // 新規作成成功後、カテゴリリストを更新
      const categoriesResponse = await fetch('/api/tags/by-type?type=product_category');
      const categoriesData = await categoriesResponse.json();
      if (categoriesResponse.ok) {
        setTagCategories(categoriesData);
        // 新しく作成されたカテゴリを選択状態にする
        setFormData(prev => ({ ...prev, tagCategoryId: data.id, newCategoryName: '', newCategoryColor: '#CCCCCC' }));
        setSuccess(true);
        alert('タグカテゴリを作成しました。');
      } else {
        console.error('Failed to refetch categories:', categoriesData.message);
        setError('タグカテゴリリストの更新に失敗しました。手動でページをリロードしてください。');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      alert(`タグカテゴリの作成に失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error creating tag category:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // タグカテゴリが選択されているか確認
    if (!formData.tagCategoryId) {
       setError('カテゴリを選択してください');
       alert('カテゴリを選択してください');
       setLoading(false);
       return;
    }

    const method = initialData ? 'PUT' : 'POST';
    const url = '/api/admin/tags';

    try {
      const tagDataToSend = {
        ...formData,
        tagCategoryId: formData.tagCategoryId, // 確定したtagCategoryIdを使用
        category: undefined, // categoryフィールドはAPIに送信しない
        color: undefined, // colorフィールドはAPIに送信しない
        newCategoryName: undefined, // 新規カテゴリ関連フィールドはAPIに送信しない
        newCategoryColor: undefined,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tagDataToSend),
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
            category: '', // フォームクリア時はcategoryもクリア
            tagCategoryId: '', // tagCategoryIdもクリア
            color: '#CCCCCC', // colorもクリア
            language: 'ja',
            description: '',
            isAlias: false,
            canonicalId: '',
            newCategoryName: '', // 新規カテゴリ関連フィールドもクリア
            newCategoryColor: '#CCCCCC',
          });
          setIsNewType(true); // フォームクリア後も新規入力モードを維持
          // isNewCategory は新規作成セクションの表示/非表示には使用しないためクリア不要
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      alert(`タグの${initialData ? '更新' : '作成'}に失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(`Error ${initialData ? 'updating' : 'creating'} tag:`, err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">タグ名</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="type">タイプ</Label>
        {isNewType ? (
          <Input id="type" name="type" value={formData.type} onChange={handleChange} required />
        ) : (
          <Select onValueChange={(value) => handleSelectChange('type', value)} value={formData.type}>
            <SelectTrigger>
              <SelectValue placeholder="タイプを選択" />
            </SelectTrigger>
            <SelectContent>
              {tagTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center space-x-2 mt-2">
          <Checkbox
            id="isNewType"
            checked={isNewType}
            onCheckedChange={(checked) => handleCheckboxChange('isNewType', Boolean(checked))}
          />
          <Label htmlFor="isNewType">新規タイプを入力</Label>
        </div>
      </div>
       <div>
        <Label htmlFor="category">カテゴリ</Label>
         {isNewCategory ? (
           <Input id="category" name="category" value={formData.category} onChange={handleChange} required />
         ) : (
           <Select onValueChange={(value) => handleSelectChange('tagCategoryId', value)} value={formData.tagCategoryId || ''}>
             <SelectTrigger>
               <SelectValue placeholder="カテゴリを選択" />
             </SelectTrigger>
             <SelectContent>
               {tagCategories.map(tagCategoryOption => (
                 <SelectItem key={tagCategoryOption.id} value={tagCategoryOption.id}>{tagCategoryOption.name}</SelectItem>
               ))}
             </SelectContent>
           </Select>
         )}
         {/* isNewCategory チェックボックスと新規カテゴリ入力フィールドは削除 */}
      </div>

       {/* 新規タグカテゴリ作成セクション */}
       <div className="border p-4 rounded-md space-y-2">
         <h3 className="text-lg font-semibold">新規タグカテゴリ作成</h3>
         <div>
           <Label htmlFor="newCategoryName">新規カテゴリ名</Label>
           <Input id="newCategoryName" name="newCategoryName" value={formData.newCategoryName || ''} onChange={handleChange} />
         </div>
         <div>
           <Label htmlFor="newCategoryColor">色</Label>
           <Input id="newCategoryColor" name="newCategoryColor" type="color" value={formData.newCategoryColor || '#CCCCCC'} onChange={handleChange} />
         </div>
         <Button type="button" onClick={handleCreateNewCategory} disabled={loading || !formData.newCategoryName || !formData.newCategoryColor}>
           新規カテゴリを作成
         </Button>
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
                {/* 他の言語オプションを追加 */}
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
            // checkedがboolean型であることを確認してstateを更新
            setFormData({ ...formData, isAlias: Boolean(checked) });
          }}
        />
        <Label htmlFor="isAlias">エイリアス</Label>
      </div>
      {formData.isAlias && (
        <div>
          <Label htmlFor="canonicalId">正規タグID</Label>
          {/* 正規タグ候補表示機能 */}
          <div className="relative">
            <Input
              id="canonicalId"
              name="canonicalId"
              value={formData.canonicalId ?? ''}
              onChange={handleCanonicalInputChange}
              required={formData.isAlias}
              ref={canonicalInputRef}
              onFocus={() => setShowCanonicalTagSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCanonicalTagSuggestions(false), 100)} // フォーカスが外れてもすぐに閉じないように遅延
            />
            {showCanonicalTagSuggestions && canonicalTagSuggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                {canonicalTagSuggestions.map(tag => (
                  <li
                    key={tag.id}
                    onClick={() => handleCanonicalSuggestionClick(tag)}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                    onMouseDown={(e) => e.preventDefault()} // onBlurが先に発火してリストが消えるのを防ぐ
                  >
                    {tag.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
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