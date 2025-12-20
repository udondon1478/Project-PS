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

/**
 * ソートオプションの定義
 */
const SORT_OPTIONS = [
  { value: 'newest', label: '新着順' },
  { value: 'price-low', label: '価格の安い順' },
  { value: 'price-high', label: '価格の高い順' },
] as const;

export type SortOption = typeof SORT_OPTIONS[number]['value'];

interface SortSelectorProps {
  /** 現在のソート値 */
  value: string;
  /** 値変更時のコールバック */
  onChange: (value: string) => void;
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
