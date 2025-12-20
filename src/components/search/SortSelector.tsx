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

/**
 * ソートオプションのラベル定義
 */
const SORT_LABELS: Record<SortOption, string> = {
  'newest': '新着順',
  'price-low': '価格の安い順',
  'price-high': '価格の高い順',
};

const SORT_OPTIONS = SORT_VALUES.map((value) => ({
  value,
  label: SORT_LABELS[value],
}));

interface SortSelectorProps {
  /** 現在のソート値 */
  value: SortOption;
  /** 値変更時のコールバック */
  onChange: (value: SortOption) => void;
  /** 無効状態フラグ */
  disabled?: boolean;
}

/**
 * 商品検索のソートセレクターコンポーネント
 */
export function SortSelector({ value, onChange, disabled = false }: SortSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger 
        className="w-[140px] md:w-[160px] shrink-0"
        size="sm"
        aria-label="並び替え"
      >
        <ArrowUpDown className="size-4 mr-1" />
        <SelectValue placeholder="並び替え" />
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
