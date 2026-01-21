// src/components/admin/ActiveFilterChips.tsx
'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { tagCategories } from '@/data/guidelines/tagCategories';
import type { ActiveFilter, TagFiltersState } from '@/hooks/useTagFilters';

interface ActiveFilterChipsProps {
  activeFilters: ActiveFilter[];
  onClearFilter: (key: keyof TagFiltersState) => void;
  onClearAll: () => void;
}

export function ActiveFilterChips({
  activeFilters,
  onClearFilter,
  onClearAll,
}: ActiveFilterChipsProps) {
  if (activeFilters.length === 0) {
    return null;
  }

  // カテゴリIDから名前を取得
  const getCategoryName = (categoryId: string): string => {
    const category = tagCategories.find(c => c.id === categoryId);
    return category?.name || categoryId;
  };

  const getDisplayValue = (filter: ActiveFilter): string => {
    if (filter.key === 'categoryId') {
      return getCategoryName(filter.value);
    }
    return filter.displayValue;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm text-muted-foreground">適用中:</span>
      {activeFilters.map((filter) => (
        <div
          key={filter.key}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-primary/10 text-primary rounded-md"
        >
          <span className="font-medium">{filter.label}:</span>
          <span>{getDisplayValue(filter)}</span>
          <button
            type="button"
            onClick={() => onClearFilter(filter.key)}
            className="ml-1 p-0.5 hover:bg-primary/20 rounded"
            aria-label={`${filter.label}フィルターを解除`}
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="text-muted-foreground hover:text-foreground h-7 px-2"
      >
        すべてクリア
      </Button>
    </div>
  );
}
