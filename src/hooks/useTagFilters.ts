// src/hooks/useTagFilters.ts
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebounce } from './useDebounce';

export type SortField = 'name' | 'category' | 'language' | 'description' | 'usageCount' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
export type UsageRange = '' | '0' | '1-10' | '11-50' | '50+';
export type AliasFilter = '' | 'true' | 'false';
export type LanguageFilter = '' | 'ja' | 'en';

export interface TagFiltersState {
  q: string;
  categoryId: string;
  lang: LanguageFilter;
  usage: UsageRange;
  alias: AliasFilter;
  sort: SortField;
  order: SortOrder;
  page: number;
}

export interface ActiveFilter {
  key: keyof TagFiltersState;
  label: string;
  value: string;
  displayValue: string;
}

const DEFAULT_FILTERS: TagFiltersState = {
  q: '',
  categoryId: '',
  lang: '',
  usage: '',
  alias: '',
  sort: 'usageCount',
  order: 'desc',
  page: 1,
};

export function useTagFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URLからフィルター状態を読み取る
  const getFiltersFromURL = useCallback((): TagFiltersState => {
    return {
      q: searchParams.get('q') || '',
      categoryId: searchParams.get('category') || '',
      lang: (searchParams.get('lang') as LanguageFilter) || '',
      usage: (searchParams.get('usage') as UsageRange) || '',
      alias: (searchParams.get('alias') as AliasFilter) || '',
      sort: (searchParams.get('sort') as SortField) || 'usageCount',
      order: (searchParams.get('order') as SortOrder) || 'desc',
      page: parseInt(searchParams.get('page') || '1', 10),
    };
  }, [searchParams]);

  const [filters, setFiltersState] = useState<TagFiltersState>(getFiltersFromURL);
  const [searchInput, setSearchInput] = useState(filters.q);
  const debouncedSearch = useDebounce(searchInput, 300);

  // URLが変更されたらフィルター状態を更新
  useEffect(() => {
    setFiltersState(getFiltersFromURL());
  }, [getFiltersFromURL]);

  // デバウンスされた検索語が変更されたらフィルターを更新
  useEffect(() => {
    if (debouncedSearch !== filters.q) {
      setFilters({ q: debouncedSearch, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // URLを更新する関数
  const updateURL = useCallback((newFilters: TagFiltersState) => {
    const params = new URLSearchParams();

    if (newFilters.q) params.set('q', newFilters.q);
    if (newFilters.categoryId) params.set('category', newFilters.categoryId);
    if (newFilters.lang) params.set('lang', newFilters.lang);
    if (newFilters.usage) params.set('usage', newFilters.usage);
    if (newFilters.alias) params.set('alias', newFilters.alias);
    if (newFilters.sort !== 'usageCount') params.set('sort', newFilters.sort);
    if (newFilters.order !== 'desc') params.set('order', newFilters.order);
    if (newFilters.page > 1) params.set('page', newFilters.page.toString());

    const queryString = params.toString();
    const newURL = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newURL, { scroll: false });
  }, [pathname, router]);

  // フィルターを更新する関数
  const setFilters = useCallback((updates: Partial<TagFiltersState>) => {
    setFiltersState(prev => {
      const newFilters = { ...prev, ...updates };
      updateURL(newFilters);
      return newFilters;
    });
  }, [updateURL]);

  // 個別のフィルター更新関数
  const setSearch = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const setCategory = useCallback((categoryId: string) => {
    setFilters({ categoryId, page: 1 });
  }, [setFilters]);

  const setLanguage = useCallback((lang: LanguageFilter) => {
    setFilters({ lang, page: 1 });
  }, [setFilters]);

  const setUsage = useCallback((usage: UsageRange) => {
    setFilters({ usage, page: 1 });
  }, [setFilters]);

  const setAlias = useCallback((alias: AliasFilter) => {
    setFilters({ alias, page: 1 });
  }, [setFilters]);

  const setSort = useCallback((sort: SortField, order?: SortOrder) => {
    if (order) {
      setFilters({ sort, order });
    } else {
      // 同じカラムをクリックした場合は順序を切り替え
      setFiltersState(prev => {
        const newOrder: SortOrder = prev.sort === sort && prev.order === 'asc' ? 'desc' :
                        prev.sort === sort && prev.order === 'desc' ? 'asc' : 'desc';
        const newFilters: TagFiltersState = { ...prev, sort, order: newOrder };
        updateURL(newFilters);
        return newFilters;
      });
    }
  }, [setFilters, updateURL]);

  const setPage = useCallback((page: number) => {
    setFilters({ page });
  }, [setFilters]);

  // すべてのフィルターをリセット
  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    setFiltersState(DEFAULT_FILTERS);
    updateURL(DEFAULT_FILTERS);
  }, [updateURL]);

  // 特定のフィルターをクリア
  const clearFilter = useCallback((key: keyof TagFiltersState) => {
    if (key === 'q') {
      setSearchInput('');
    }
    setFilters({ [key]: DEFAULT_FILTERS[key], page: 1 });
  }, [setFilters]);

  // アクティブなフィルターのリスト（チップ表示用）
  const activeFilters = useMemo((): ActiveFilter[] => {
    const active: ActiveFilter[] = [];

    if (filters.q) {
      active.push({
        key: 'q',
        label: '検索',
        value: filters.q,
        displayValue: filters.q,
      });
    }

    if (filters.categoryId) {
      active.push({
        key: 'categoryId',
        label: 'カテゴリ',
        value: filters.categoryId,
        displayValue: filters.categoryId, // 実際の名前は親コンポーネントで解決
      });
    }

    if (filters.lang) {
      active.push({
        key: 'lang',
        label: '言語',
        value: filters.lang,
        displayValue: filters.lang === 'ja' ? '日本語' : 'English',
      });
    }

    if (filters.usage) {
      const usageLabels: Record<string, string> = {
        '0': '未使用',
        '1-10': '1-10件',
        '11-50': '11-50件',
        '50+': '50件以上',
      };
      active.push({
        key: 'usage',
        label: '使用数',
        value: filters.usage,
        displayValue: usageLabels[filters.usage] || filters.usage,
      });
    }

    if (filters.alias) {
      active.push({
        key: 'alias',
        label: 'エイリアス',
        value: filters.alias,
        displayValue: filters.alias === 'true' ? 'エイリアスのみ' : '正規タグのみ',
      });
    }

    return active;
  }, [filters]);

  // フィルターが適用されているかどうか
  const hasActiveFilters = useMemo(() => {
    return activeFilters.length > 0;
  }, [activeFilters]);

  // API用のクエリパラメータを生成
  const apiQueryParams = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.q) params.set('q', filters.q);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.lang) params.set('lang', filters.lang);
    if (filters.usage) params.set('usage', filters.usage);
    if (filters.alias) params.set('alias', filters.alias);
    params.set('sort', filters.sort);
    params.set('order', filters.order);

    return params;
  }, [filters]);

  return {
    filters,
    searchInput,
    debouncedSearch,
    activeFilters,
    hasActiveFilters,
    apiQueryParams,
    setSearch,
    setCategory,
    setLanguage,
    setUsage,
    setAlias,
    setSort,
    setPage,
    setFilters,
    clearFilter,
    clearAllFilters,
  };
}
