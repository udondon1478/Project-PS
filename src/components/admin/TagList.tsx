// src/components/admin/TagList.tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
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
import { PencilIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { tagCategories } from '@/data/guidelines/tagCategories';
import { TagWithCategory } from "@/types/tag";
import { useTagFilters, SortField } from '@/hooks/useTagFilters';
import { TagSearchFilters } from './TagSearchFilters';
import { ActiveFilterChips } from './ActiveFilterChips';
import { SortableTableHeader } from './SortableTableHeader';
import { TagListSkeleton } from './TagListSkeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface TagListProps {
  onEditClick: (tag: TagWithCategory) => void;
}

function TagListContent({ onEditClick }: TagListProps) {
  const [tags, setTags] = useState<TagWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTags, setTotalTags] = useState(0);
  const itemsPerPage = 20;

  const {
    filters,
    searchInput,
    debouncedSearch,
    activeFilters,
    hasActiveFilters,
    setSearch,
    setCategory,
    setLanguage,
    setUsage,
    setAlias,
    setSort,
    setPage,
    clearFilter,
    clearAllFilters,
  } = useTagFilters();

  // タグ一覧を取得
  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (filters.page - 1) * itemsPerPage;
      const queryParams = new URLSearchParams();

      if (debouncedSearch) queryParams.append('q', debouncedSearch);
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);
      if (filters.lang) queryParams.append('lang', filters.lang);
      if (filters.usage) queryParams.append('usage', filters.usage);
      if (filters.alias) queryParams.append('alias', filters.alias);
      queryParams.append('sort', filters.sort);
      queryParams.append('order', filters.order);
      queryParams.append('limit', itemsPerPage.toString());
      queryParams.append('offset', offset.toString());

      const url = `/api/admin/tags?${queryParams.toString()}`;
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
  }, [filters, debouncedSearch, itemsPerPage]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

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
        setTotalTags(prev => prev - 1);
        alert('タグを削除しました。');
      } catch (err) {
        alert(`タグの削除に失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Error deleting tag:', err);
      }
    }
  };

  const getCategoryName = (tag: TagWithCategory): string => {
    if (tag.tagCategory?.name) {
      return tag.tagCategory.name;
    }
    const category = tagCategories.find(c => c.id === tag.tagCategoryId);
    return category?.name || '-';
  };

  const getCategoryColor = (tag: TagWithCategory): string => {
    if (tag.tagCategory?.color) {
      return tag.tagCategory.color;
    }
    const category = tagCategories.find(c => c.id === tag.tagCategoryId);
    return category?.color || '#CCCCCC';
  };

  const handleSort = (field: SortField) => {
    setSort(field);
  };

  const totalPages = Math.ceil(totalTags / itemsPerPage);

  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;

  return (
    <TooltipProvider>
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">タグ一覧</h2>
        <div className="text-sm text-muted-foreground">
          全 {totalTags} 件
        </div>
      </div>

      {/* 検索・フィルター */}
      <TagSearchFilters
        searchInput={searchInput}
        categoryId={filters.categoryId}
        lang={filters.lang}
        usage={filters.usage}
        alias={filters.alias}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onLanguageChange={setLanguage}
        onUsageChange={setUsage}
        onAliasChange={setAlias}
      />

      {/* アクティブフィルターチップ */}
      {hasActiveFilters && (
        <ActiveFilterChips
          activeFilters={activeFilters}
          onClearFilter={clearFilter}
          onClearAll={clearAllFilters}
        />
      )}

      {/* テーブル */}
      {loading ? (
        <TagListSkeleton rowCount={itemsPerPage} />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableCaption>タグ一覧 - ページ {filters.page} / {totalPages || 1}</TableCaption>
            <TableHeader>
              <TableRow>
                <SortableTableHeader
                  field="name"
                  label="名前"
                  currentSort={filters.sort}
                  currentOrder={filters.order}
                  onSort={handleSort}
                  className="w-[200px]"
                />
                <SortableTableHeader
                  field="category"
                  label="カテゴリ"
                  currentSort={filters.sort}
                  currentOrder={filters.order}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  field="language"
                  label="言語"
                  currentSort={filters.sort}
                  currentOrder={filters.order}
                  onSort={handleSort}
                />
                <TableHead>エイリアス</TableHead>
                <SortableTableHeader
                  field="description"
                  label="説明"
                  currentSort={filters.sort}
                  currentOrder={filters.order}
                  onSort={handleSort}
                  className="w-[300px]"
                />
                <SortableTableHeader
                  field="usageCount"
                  label="使用数"
                  currentSort={filters.sort}
                  currentOrder={filters.order}
                  onSort={handleSort}
                  className="text-right"
                />
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
                  <TableRow
                    key={tag.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      tag.isAlias
                        ? "bg-amber-50/50 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => onEditClick(tag)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {tag.isAlias && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <ArrowRightIcon className="h-4 w-4 text-amber-600 flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>正規タグ: {tag.canonicalTag?.displayName || tag.canonicalTag?.name || '-'}</p>
                              </TooltipContent>
                            </Tooltip>
                        )}
                        <span>{tag.displayName || tag.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getCategoryColor(tag) }}
                        />
                        {getCategoryName(tag)}
                      </div>
                    </TableCell>
                    <TableCell>{tag.language === 'ja' ? '日本語' : 'English'}</TableCell>
                    <TableCell>
                      {tag.isAlias ? (
                        <span className="text-amber-600 font-medium">はい</span>
                      ) : (
                        <span className="text-muted-foreground">いいえ</span>
                      )}
                    </TableCell>
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
      )}

      {/* ページネーションUI */}
      <div className="flex justify-center items-center space-x-4 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(filters.page - 1, 1))}
          disabled={filters.page === 1}
        >
          前へ
        </Button>
        <span className="text-sm">
          {filters.page} / {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(filters.page + 1, totalPages))}
          disabled={filters.page >= totalPages || totalPages === 0}
        >
          次へ
        </Button>
      </div>
    </div>
    </TooltipProvider>
  );
}

const TagList = ({ onEditClick }: TagListProps) => {
  return (
    <Suspense fallback={<TagListSkeleton rowCount={20} />}>
      <TagListContent onEditClick={onEditClick} />
    </Suspense>
  );
};

export default TagList;
