'use client';

import { getCategoryBadgeStyle } from '@/lib/guidelines/categoryColors';
import { cn } from '@/lib/utils';

interface TagCategoryBadgeProps {
  categoryName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TagCategoryBadge({
  categoryName,
  className,
  size = 'md',
}: TagCategoryBadgeProps) {
  const style = getCategoryBadgeStyle(categoryName);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: style.backgroundColor,
        color: style.color,
      }}
    >
      {categoryName}
    </span>
  );
}
