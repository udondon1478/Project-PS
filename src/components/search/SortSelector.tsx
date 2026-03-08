"use client";

import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SORT_VALUES, type SortOption } from '@/constants/sort';
import { useTranslation } from 'react-i18next';

interface SortSelectorProps {
  /** 現在のソート値 */
  value: SortOption;
  /** 値変更時のコールバック */
  onChange: (value: SortOption) => void;
  /** 無効状態フラグ */
  disabled?: boolean;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 商品検索のソートセレクターコンポーネント
 */
export function SortSelector({ value, onChange, disabled = false, className }: SortSelectorProps) {
  const { t } = useTranslation('search');

  const SORT_OPTIONS = SORT_VALUES.map((value) => ({
    value,
    label: t(`sort.${value}`),
  }));

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={`w-[140px] md:w-[160px] shrink-0 ${className || ''}`}
        size="sm"
        aria-label={t('sort.label')}
      >
        <ArrowUpDown className="size-4 mr-1" />
        <SelectValue placeholder={t('sort.label')} />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
