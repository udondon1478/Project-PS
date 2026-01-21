// src/components/admin/SortableTableHeader.tsx
'use client';

import { TableHead } from '@/components/ui/table';
import { ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import type { SortField, SortOrder } from '@/hooks/useTagFilters';
import { cn } from '@/lib/utils';

interface SortableTableHeaderProps {
  field: SortField;
  label: string;
  currentSort: SortField;
  currentOrder: SortOrder;
  onSort: (field: SortField) => void;
  className?: string;
}

export function SortableTableHeader({
  field,
  label,
  currentSort,
  currentOrder,
  onSort,
  className,
}: SortableTableHeaderProps) {
  const isActive = currentSort === field;

  return (
    <TableHead
      className={cn(
        'cursor-pointer select-none hover:bg-muted/50 transition-colors',
        className
      )}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {isActive ? (
            currentOrder === 'asc' ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )
          ) : (
            <ChevronUpDownIcon className="h-4 w-4 opacity-50" />
          )}
        </span>
      </div>
    </TableHead>
  );
}
