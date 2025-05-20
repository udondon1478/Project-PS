// src/components/admin/TagList.tsx
'use client';

import { useState, useEffect } from 'react';
import { Tag } from '@prisma/client'; // PrismaClientのTag型をインポート

// Tagの型を明示的に定義
interface TagWithType extends Tag {
  type: string;
  tagCategory?: { // TagCategory モデルを関連付けて取得するため追加
    id: string;
    name: string;
    color: string;
  };
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
  const [allTagTypes, setAllTagTypes] = useState<string[]>([]); // 全てのタグタイプを保持するstate
  const [currentPage, setCurrentPage] = useState(1); // 現在のページ番号
  const [itemsPerPage] = useState(20); // 1ページあたりのタグ数
  const [totalTags, setTotalTags] = useState(0); // 合計タグ数

  // タグ一覧を取得するuseEffect
  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      setError(null);
      try {
        const offset = (currentPage - 1) * itemsPerPage;
        const limit = itemsPerPage;
        const baseUrl = '/api/admin/tags';
        const queryParams = new URLSearchParams();

        if (filterType) {
          queryParams.append('type', filterType);
        }
        queryParams.append('limit', limit.toString());
        queryParams.append('offset', offset.toString());

        const url = `${baseUrl}?${queryParams.toString()}`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch tags: ${res.statusText}`);
        }
        // APIレスポンスが { tags: TagWithType[], totalTags: number } の形式を想定
        const data: { tags: TagWithType[], totalTags: number } = await res.json();
        setTags(data.tags);
        setTotalTags(data.totalTags);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching tags:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, [filterType, currentPage, itemsPerPage]); // filterType, currentPage, itemsPerPageが変更されたときに再フェッチ

  // 全てのタグタイプを取得するuseEffect (マウント時に一度だけ実行)
  useEffect(() => {
    const fetchAllTagTypes = async () => {
      try {
        const res = await fetch('/api/admin/tag-types');
        if (!res.ok) {
          throw new Error(`Failed to fetch tag types: ${res.statusText}`);
        }
        const data: string[] = await res.json();
        setAllTagTypes(data);
      } catch (err) {
        console.error('Error fetching all tag types:', err);
        // エラーが発生しても、フィルタリングオプションがないよりは良いので、エラーstateは更新しない
      }
    };

    fetchAllTagTypes();
  }, []); // 依存配列を空にして、マウント時に一度だけ実行

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

  // フィルタリングドロップダウンに使用するタグタイプはallTagTypes stateから取得
  // const tagTypes = Array.from(new Set(tags.map(tag => tag.type))); // この行は不要になる

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">タグ一覧</h2>

      {/* フィルタリングドロップダウン */}
      <div className="mb-4">
        <label htmlFor="type-filter" className="mr-2">タイプでフィルタ:</label>
        <Select onValueChange={(value) => setFilterType(value === 'all' ? '' : value)} value={filterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="全てのタイプ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全てのタイプ</SelectItem>
            {allTagTypes.map(type => ( // allTagTypes stateを使用
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
              <TableCell>{tag.tagCategory?.name || '-'}</TableCell> {/* カテゴリ名を表示 */}
              <TableCell style={{ color: tag.tagCategory?.color || '#CCCCCC' }}>{tag.tagCategory?.color || '-'}</TableCell> {/* カテゴリの色を表示 */}
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

      {/* ページネーションUI */}
      <div className="flex justify-center space-x-4 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          前へ
        </Button>
        <span>{currentPage} / {Math.ceil(totalTags / itemsPerPage)}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalTags / itemsPerPage)))}
          disabled={currentPage === Math.ceil(totalTags / itemsPerPage) || Math.ceil(totalTags / itemsPerPage) === 0}
        >
          次へ
        </Button>
      </div>
    </div>
  );
};

export default TagList;