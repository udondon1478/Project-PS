// src/components/admin/TagList.tsx
'use client';

import { useState, useEffect } from 'react';
import { Tag } from '@prisma/client'; // PrismaClientのTag型をインポート

// Tagの型を明示的に定義
interface TagWithType extends Tag {
  type: string;
}
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // shadcn/uiのTableコンポーネントをインポート
import { Button } from "@/components/ui/button"; // shadcn/uiのButtonコンポーネントをインポート
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // shadcn/uiのSelectコンポーネントをインポート
import { PencilIcon } from '@heroicons/react/24/solid'; // 編集アイコンをインポート (例としてHeroiconsを使用)

interface TagListProps {
  onEditClick: (tag: Tag) => void; // 編集ボタンクリック時のハンドラ
}

const TagList = ({ onEditClick }: TagListProps) => { // propsとしてonEditClickを受け取る
  const [tags, setTags] = useState<TagWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>(''); // フィルタリング用のstate

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = filterType ? `/api/admin/tags?type=${filterType}` : '/api/admin/tags';
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch tags: ${res.statusText}`);
        }
        const data: TagWithType[] = await res.json();
        setTags(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching tags:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, [filterType]); // filterTypeが変更されたときに再フェッチ

  const handleDelete = async (id: string) => {
    if (confirm('本当にこのタグを削除しますか？')) {
      try {
        const res = await fetch(`/api/admin/tags`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Failed to delete tag: ${errorData.message || res.statusText}`);
        }

        // 削除成功したら一覧から削除
        setTags(tags.filter(tag => tag.id !== id));
        alert('タグを削除しました。');
      } catch (err) {
        alert(`タグの削除に失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Error deleting tag:', err);
      }
    }
  };

  // TODO: 編集機能の実装

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // タグのタイプを取得 (重複をなくす)
  const tagTypes = Array.from(new Set(tags.map(tag => tag.type)));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">タグ一覧</h2>

      {/* フィルタリングドロップダウン */}
      <div className="mb-4">
        <label htmlFor="type-filter" className="mr-2">タイプでフィルタ:</label>
        <Select onValueChange={setFilterType} value={filterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="全てのタイプ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全てのタイプ</SelectItem>
            {tagTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableCaption>タグ一覧</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>タイプ</TableHead>
            <TableHead>カテゴリ</TableHead>
            <TableHead>色</TableHead>
            <TableHead>言語</TableHead>
            <TableHead>エイリアス</TableHead>
            <TableHead>正規タグID</TableHead>
            <TableHead>説明</TableHead>
            <TableHead>使用回数</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tags.map((tag) => (
            <TableRow key={tag.id}>
              <TableCell className="font-medium">{tag.name}</TableCell>
              <TableCell>{tag.type}</TableCell>
              <TableCell>{tag.category}</TableCell>
              <TableCell style={{ color: tag.color }}>{tag.color}</TableCell>
              <TableCell>{tag.language}</TableCell>
              <TableCell>{tag.isAlias ? 'はい' : 'いいえ'}</TableCell>
              <TableCell>{tag.canonicalId || '-'}</TableCell>
              <TableCell>{tag.description || '-'}</TableCell>
              <TableCell>{tag.count}</TableCell>
              <TableCell className="flex space-x-2"> {/* ボタンを横並びにするためにflexを追加 */}
                <Button variant="outline" size="sm" onClick={() => onEditClick(tag)}> {/* 編集ボタン */}
                    <PencilIcon className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(tag.id)}>削除</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TagList;