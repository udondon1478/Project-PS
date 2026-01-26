// src/components/admin/TagSearchFilters.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { tagCategories } from '@/data/guidelines/tagCategories';
import type { LanguageFilter, UsageRange, AliasFilter } from '@/hooks/useTagFilters';

interface TagSearchFiltersProps {
  searchInput: string;
  categoryId: string;
  lang: LanguageFilter;
  usage: UsageRange;
  alias: AliasFilter;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onLanguageChange: (value: LanguageFilter) => void;
  onUsageChange: (value: UsageRange) => void;
  onAliasChange: (value: AliasFilter) => void;
}

export function TagSearchFilters({
  searchInput,
  categoryId,
  lang,
  usage,
  alias,
  onSearchChange,
  onCategoryChange,
  onLanguageChange,
  onUsageChange,
  onAliasChange,
}: TagSearchFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* 検索ボックス */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="タグ名を検索..."
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-8"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
          >
            <XMarkIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* カテゴリフィルター */}
      <Select
        value={categoryId || 'all'}
        onValueChange={(value) => onCategoryChange(value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="商品種別" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての商品種別</SelectItem>
          {tagCategories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 言語フィルター */}
      <Select
        value={lang || 'all'}
        onValueChange={(value) => onLanguageChange(value === 'all' ? '' : value as LanguageFilter)}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="言語" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての言語</SelectItem>
          <SelectItem value="ja">日本語</SelectItem>
          <SelectItem value="en">English</SelectItem>
        </SelectContent>
      </Select>

      {/* 使用数フィルター */}
      <Select
        value={usage || 'all'}
        onValueChange={(value) => onUsageChange(value === 'all' ? '' : value as UsageRange)}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="使用数" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての使用数</SelectItem>
          <SelectItem value="0">未使用（0件）</SelectItem>
          <SelectItem value="1-10">1-10件</SelectItem>
          <SelectItem value="11-50">11-50件</SelectItem>
          <SelectItem value="50+">50件以上</SelectItem>
        </SelectContent>
      </Select>

      {/* エイリアス状態フィルター */}
      <Select
        value={alias || 'all'}
        onValueChange={(value) => onAliasChange(value === 'all' ? '' : value as AliasFilter)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="エイリアス" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="true">エイリアスのみ</SelectItem>
          <SelectItem value="false">正規タグのみ</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
