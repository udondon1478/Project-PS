// src/components/admin/TagList.tsx
'use client';

import { useState, useEffect } from 'react';
import { Tag } from '@prisma/client';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PencilIcon } from '@heroicons/react/24/solid';
import { tagCategories } from '@/data/guidelines/tagCategories';

// Tagの型を明示的に定義
interface TagWithCategory extends Tag {
  tagCategory?: {
    id: string;
    name: string;
    color: string;
  };
  _count?: {
    productTags: number;
  };
}

interface TagListProps {
  onEditClick: (tag: TagWithCategory) => void;
}

const TagList = ({ onEditClick }: TagListProps) => {
  const [tags, setTags] = useState<TagWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalTags, setTotalTags] = useState(0);

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

        if (filterCategory) {
          queryParams.append('categoryId', filterCategory);
        }
        queryParams.append('limit', limit.toString());
        queryParams.append('offset', offset.toString());

        const url = `${baseUrl}?${queryParams.toString()}`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch tags: ${res.statusText}`);
        }
        const data: { tags: TagWithCategory[], totalTags: number } = await res.json();
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
  }, [filterCategory, currentPage, itemsPerPage]);

  const handleDelete = async (tag: TagWithCategory) => {
    const usageCount = tag._count?.productTags || 0;
    const warningMessage = usageCount > 0
      ? `このタグは ${usageCount} 件の商品で使用中です。本当に削除しますか？`
      : '本当にこのタグを削除しますか？';

    if (confirm(warningMessage)) {
      try {
        const res = await fetch(`/api/admin/tags`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: tag.id }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Failed to delete tag: ${errorData.message || res.statusText}`);
        }

        setTags(tags.filter(t => t.id !== tag.id));
        alert('タグを削除しました。');
      } catch (err) {
        alert(`タグの削除に失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Error deleting tag:', err);
      }
    }
  };

  // カテゴリ名を取得するヘルパー関数
  const getCategoryName = (tag: TagWithCategory): string => {
    if (tag.tagCategory?.name) {
      // DBから取得したカテゴリ名
      return tag.tagCategory.name;
    }
    // tagCategories.tsからカテゴリ名を検索
    const category = tagCategories.find(c => c.id === tag.tagCategoryId);
    return category?.name || '-';
  };

  // カテゴリ色を取得するヘルパー関数
  const getCategoryColor = (tag: TagWithCategory): string => {
    if (tag.tagCategory?.color) {
      return tag.tagCategory.color;
    }
    const category = tagCategories.find(c => c.id === tag.tagCategoryId);
    return category?.color || '#CCCCCC';
  };

  if (loading) return <div className="flex justify-center p-8">Loading...</div>;
  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;

  const totalPages = Math.ceil(totalTags / itemsPerPage);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">タグ一覧</h2>
        <div className="text-sm text-muted-foreground">
          全 {totalTags} 件
        </div>
      </div>

      {/* カテゴリフィルタリング */}
      <div className="mb-4">
        <label htmlFor="category-filter" className="mr-2 text-sm font-medium">カテゴリでフィルタ:</label>
        <Select
          onValueChange={(value) => {
            setFilterCategory(value === 'all' ? '' : value);
            setCurrentPage(1); // フィルター変更時にページをリセット
          }}
          value={filterCategory || 'all'}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="全てのカテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全てのカテゴリ</SelectItem>
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

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableCaption>タグ一覧 - ページ {currentPage} / {totalPages || 1}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">名前</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead>言語</TableHead>
              <TableHead>エイリアス</TableHead>
              <TableHead className="w-[300px]">説明</TableHead>
              <TableHead className="text-right">使用数</TableHead>
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  タグが見つかりません
                </TableCell>
              </TableRow>
            ) : (
              tags.map((tag) => (
                <TableRow key={tag.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => onEditClick(tag)}>
                  <TableCell className="font-medium">{tag.displayName || tag.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCategoryColor(tag) }}
                      />
                      {getCategoryName(tag)}
                    </div>
                  </TableCell>
                  <TableCell>{tag.language === 'ja' ? '日本語' : 'English'}</TableCell>
                  <TableCell>{tag.isAlias ? 'はい' : 'いいえ'}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{tag.description || '-'}</TableCell>
                  <TableCell className="text-right">{tag._count?.productTags || 0}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => onEditClick(tag)}>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(tag)}>
                        削除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ページネーションUI */}
      <div className="flex justify-center items-center space-x-4 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          前へ
        </Button>
        <span className="text-sm">
          {currentPage} / {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage >= totalPages || totalPages === 0}
        >
          次へ
        </Button>
      </div>
    </div>
  );
};

export default TagList;
