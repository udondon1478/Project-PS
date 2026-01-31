"use client";

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useProductSearch } from '@/hooks/useProductSearch';
import { useSearchHistory, SearchHistoryItem } from '@/hooks/useSearchHistory';
import { useSearchFavorite, SearchFavoriteItem } from '@/hooks/useSearchFavorite';
import { TagSearchBar } from './TagSearchBar';
import { QuickFilters } from './QuickFilters';
import { FilterSidebar } from './FilterSidebar';
import { SortSelector } from './SortSelector';
import { SaveFavoriteModal } from './SaveFavoriteModal';
import { useSession } from 'next-auth/react';

import OnboardingTour from '@/components/onboarding/OnboardingTour';

export default function ProductSearch({
  initialSearchQuery = '',
  initialSelectedTags = [],
  initialSelectedNegativeTags = [],
  onSearchQueryChange,
  onSelectedTagsChange,
  onSelectedNegativeTagsChange,
  isSafeSearchEnabled = true, // Default to true
  isSpotlightActive = false,
  onSpotlightDismiss,
}: {
  initialSearchQuery?: string;
  initialSelectedTags?: string[];
  initialSelectedNegativeTags?: string[];
  onSearchQueryChange?: (query: string) => void;
  onSelectedTagsChange?: (tags: string[]) => void;
  onSelectedNegativeTagsChange?: (tags: string[]) => void;
  isSafeSearchEnabled?: boolean;
  isSpotlightActive?: boolean;
  onSpotlightDismiss?: () => void;
}) {
  const router = useRouter();
  const { history, addHistory, removeHistory } = useSearchHistory();
  const {
    favorites,
    addFavorite,
    removeFavorite,
    renameFavorite,
    generateDefaultName
  } = useSearchFavorite();
  const { status } = useSession();

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [defaultFavoriteName, setDefaultFavoriteName] = useState('');

  const {
    searchQuery,
    selectedTags,
    selectedNegativeTags,
    tagSuggestions,
    isSuggestionsVisible,
    setIsSuggestionsVisible,
    isFilterSidebarOpen,
    setIsFilterSidebarOpen,
    detailedFilters,
    priceRange,
    setPriceRange,
    isHighPriceFilterEnabled,
    setIsHighPriceFilterEnabled,
    isLiked,
    setIsLiked,
    isOwned,
    setIsOwned,
    searchContainerRef,
    searchInputRef,
    suggestionsRef,
    ageRatingTags,
    categoryTags,
    featureTags,
    selectedAgeRatingTags,
    setSelectedAgeRatingTags,
    handleInputChange,
    handleAddTag,
    handleRemoveTag,
    handleKeyDown,
    handleSearch: originalHandleSearch,
    handleDetailedFilterChange,
    clearAllTagsAndFilters,
    applyFiltersAndSearch: originalApplyFiltersAndSearch,
    isFeatureTagSelected,
    isNegativeTagSelected,
    setIsComposing,
    sortBy,
    handleSortChange,
    isSearchPolySeekTagsOnly,
    setIsSearchPolySeekTagsOnly,
  } = useProductSearch({
    initialSearchQuery,
    initialSelectedTags,
    initialSelectedNegativeTags,
    onSearchQueryChange,
    onSelectedTagsChange,
    onSelectedNegativeTagsChange,
    isSafeSearchEnabled,
  });

  // 価格上限を保存すべきかどうかを判定するヘルパー
  const shouldSaveMaxPrice = (maxPrice: number, isHighPrice: boolean): boolean => {
    // デフォルト上限（通常10000、高価格有効時100000）の場合は保存しない
    const defaultMax = isHighPrice ? 100000 : 10000;
    return maxPrice !== defaultMax;
  };

  // 現在の検索条件オブジェクトを生成する（保存・比較用）
  const getCurrentQueryObject = useCallback(() => {
    const query: Record<string, any> = {};

    if (searchQuery) query.q = searchQuery;
    if (selectedTags.length > 0) query.tags = [...selectedTags].sort();
    if (selectedNegativeTags.length > 0) query.ntags = [...selectedNegativeTags].sort();
    if (selectedAgeRatingTags.length > 0) query.age_tags = [...selectedAgeRatingTags].sort();

    // detailedFilters
    if (detailedFilters && Object.keys(detailedFilters).length > 0) {
      const cleanFilters: Record<string, any> = {};
      Object.keys(detailedFilters).sort().forEach(key => {
        if (detailedFilters[key]) cleanFilters[key] = detailedFilters[key];
      });
      if (Object.keys(cleanFilters).length > 0) {
        query.detailedFilters = cleanFilters;
        if (cleanFilters.category) query.category = cleanFilters.category;
      }
    }

    // 価格
    if (priceRange[0] > 0) query.min_price = priceRange[0];
    if (shouldSaveMaxPrice(priceRange[1], isHighPriceFilterEnabled)) {
       query.max_price = priceRange[1];
    }

    if (isHighPriceFilterEnabled) query.high_price = true;
    if (isLiked) query.liked = true;
    if (isOwned) query.owned = true;
    if (isSearchPolySeekTagsOnly) query.poly_tags = true;
    if (sortBy !== 'newest') query.sort = sortBy;

    return query;
  }, [
    searchQuery, selectedTags, selectedNegativeTags, selectedAgeRatingTags,
    detailedFilters, priceRange, isHighPriceFilterEnabled, isLiked, isOwned,
    isSearchPolySeekTagsOnly, sortBy
  ]);

  // 現在の条件が保存済みかどうかを判定
  const isCurrentConditionFavorited = React.useMemo(() => {
    const currentQuery = getCurrentQueryObject();
    const normalize = (obj: any): string => {
      if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
      if (Array.isArray(obj)) return JSON.stringify(obj.sort());
      return JSON.stringify(Object.keys(obj).sort().reduce((result: any, key: string) => {
        result[key] = obj[key];
        return result;
      }, {}));
    };

    const currentJson = normalize(currentQuery);
    return favorites.some(f => normalize(f.query) === currentJson);
  }, [getCurrentQueryObject, favorites]);

  // 検索実行時に履歴を保存するラッパー関数
  const handleSearchWithHistory = useCallback(async () => {
    const historyData = getCurrentQueryObject();

    // 条件が一つでもあれば保存
    if (Object.keys(historyData).length > 0) {
      try {
        await addHistory(historyData);
      } catch (e) {
        console.error('Failed to add history:', e);
      }
    }

    originalHandleSearch();
  }, [getCurrentQueryObject, addHistory, originalHandleSearch]);

  // Apply Filters時のラッパー
  const applyFiltersAndSearchWithHistory = useCallback(() => {
    handleSearchWithHistory();
    setIsFilterSidebarOpen(false);
  }, [handleSearchWithHistory, setIsFilterSidebarOpen]);

  // 履歴選択時のハンドラ
  const handleHistorySelect = useCallback((item: SearchHistoryItem) => {
    const q = item.query;
    const params = new URLSearchParams();

    // キーワード
    if (q.q) params.append('q', String(q.q));

    // URLパラメータの構築 (useProductSearchのbuildSearchQueryParamsと同様のキーを使用)
    if (q.tags) {
      const tags = Array.isArray(q.tags) ? q.tags.join(',') : q.tags;
      params.append('tags', tags);
    }
    if (q.ntags) {
      const ntags = Array.isArray(q.ntags) ? q.ntags.join(',') : q.ntags;
      params.append('negativeTags', ntags);
    }
    if (q.age_tags) {
      const ageTags = Array.isArray(q.age_tags) ? q.age_tags.join(',') : q.age_tags;
      params.append('ageRatingTags', ageTags);
    }

    // detailedFiltersの復元
    if (q.detailedFilters) {
      const df = q.detailedFilters;
      // カテゴリの復元（URLパラメータ名はcategoryName）
      if (df.category) {
        params.append('categoryName', df.category);
      }

      // その他の詳細フィルターを復元
      Object.entries(df).forEach(([key, value]) => {
        // categoryは既に処理済み、値が存在するもののみ追加
        if (key !== 'category' && value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    } else if (q.category) {
      // 後方互換性
      params.append('categoryName', q.category);
    }

    if (q.min_price) params.append('minPrice', String(q.min_price));
    if (q.max_price) params.append('maxPrice', String(q.max_price));
    if (q.high_price) params.append('isHighPrice', 'true');
    if (q.liked) params.append('liked', 'true');
    if (q.owned) params.append('owned', 'true');
    if (q.poly_tags) params.append('searchPolySeekTagsOnly', 'true');
    if (q.sort) params.append('sort', q.sort);

    // 検索実行（遷移）
    router.replace(`/search?${params.toString()}`);
    // サジェストを閉じる
    setIsSuggestionsVisible(false);
  }, [router, setIsSuggestionsVisible]);

  const handleHistoryDelete = useCallback((itemId: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    removeHistory(itemId);
  }, [removeHistory]);

  // お気に入り選択時のハンドラ
  const handleFavoriteSelect = useCallback((item: SearchFavoriteItem) => {
    const q = item.query;
    const params = new URLSearchParams();

    // キーワード
    if (q.q) params.append('q', String(q.q));

    // URLパラメータの構築
    if (q.tags) {
      const tags = Array.isArray(q.tags) ? q.tags.join(',') : q.tags;
      params.append('tags', tags);
    }
    if (q.ntags) {
      const ntags = Array.isArray(q.ntags) ? q.ntags.join(',') : q.ntags;
      params.append('negativeTags', ntags);
    }
    if (q.age_tags) {
      const ageTags = Array.isArray(q.age_tags) ? q.age_tags.join(',') : q.age_tags;
      params.append('ageRatingTags', ageTags);
    }

    // detailedFiltersの復元
    if (q.detailedFilters) {
      const df = q.detailedFilters;
      if (df.category) {
        params.append('categoryName', df.category);
      }
      Object.entries(df).forEach(([key, value]) => {
        if (key !== 'category' && value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    } else if (q.category) {
      params.append('categoryName', q.category);
    }

    if (q.min_price) params.append('minPrice', String(q.min_price));
    if (q.max_price) params.append('maxPrice', String(q.max_price));
    if (q.high_price) params.append('isHighPrice', 'true');
    if (q.liked) params.append('liked', 'true');
    if (q.owned) params.append('owned', 'true');
    if (q.poly_tags) params.append('searchPolySeekTagsOnly', 'true');
    if (q.sort) params.append('sort', q.sort);

    router.replace(`/search?${params.toString()}`);
    setIsSuggestionsVisible(false);
  }, [router, setIsSuggestionsVisible]);

  const handleFavoriteDelete = useCallback((itemId: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    removeFavorite(itemId);
  }, [removeFavorite]);

  const handleOpenSaveModal = () => {
    // 現在の検索条件からデフォルト名を生成
    const query = getCurrentQueryObject();
    // generateDefaultNameはフラットな構造を期待している部分があるため調整
    // (useSearchFavorite側でtagsが配列であることを想定済みなのでそのまま渡す)
    const nameData: Record<string, any> = { ...query };
    if (query.q) nameData.keyword = query.q; // generateDefaultNameの互換性

    setDefaultFavoriteName(generateDefaultName(nameData));
    setIsSaveModalOpen(true);
  };

  const handleSaveFavorite = async (name: string) => {
    const historyData = getCurrentQueryObject();
    return await addFavorite(name, historyData);
  };

  return (
    <div
      className={`p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-all duration-500 ease-in-out ${
        isSpotlightActive ? 'ring-4 ring-primary/50 shadow-2xl relative z-50 bg-white dark:bg-gray-700' : ''
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && isSpotlightActive && onSpotlightDismiss) {
          onSpotlightDismiss();
        }
      }}
    >
      <OnboardingTour />
      <div className="container mx-auto flex items-center gap-2 md:gap-4">
        <TagSearchBar
          searchQuery={searchQuery}
          selectedTags={selectedTags}
          selectedNegativeTags={selectedNegativeTags}
          tagSuggestions={tagSuggestions}
          isSuggestionsVisible={isSuggestionsVisible}
          searchContainerRef={searchContainerRef}
          searchInputRef={searchInputRef}
          suggestionsRef={suggestionsRef}
          handleInputChange={handleInputChange}
          handleKeyDown={handleKeyDown}
          handleCompositionStart={() => setIsComposing(true)}
          handleCompositionEnd={() => setIsComposing(false)}
          handleAddTag={handleAddTag}
          handleRemoveTag={handleRemoveTag}
          setIsSuggestionsVisible={setIsSuggestionsVisible}
          // 履歴機能Props
          searchHistory={history}
          onHistorySelect={handleHistorySelect}
          onHistoryDelete={handleHistoryDelete}
          // お気に入り機能Props
          favorites={favorites}
          onFavoriteSelect={handleFavoriteSelect}
          onFavoriteDelete={handleFavoriteDelete}
          onFavoriteRename={(item) => renameFavorite(item.id, item.name)}
        />

        {/* お気に入りボタン: 検索バーの直後に配置 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpenSaveModal}
          title={isCurrentConditionFavorited ? "この条件は保存済みです" : "現在の検索条件をお気に入りに保存"}
          className="flex-shrink-0 text-gray-400 hover:text-amber-400 hover:bg-transparent"
        >
          <Star
            className={`h-5 w-5 ${isCurrentConditionFavorited ? "fill-amber-400 text-amber-400" : ""}`}
          />
        </Button>

        <QuickFilters
          ageRatingTags={ageRatingTags}
          featureTags={featureTags}
          selectedAgeRatingTags={selectedAgeRatingTags}
          setSelectedAgeRatingTags={setSelectedAgeRatingTags}
          isFeatureTagSelected={isFeatureTagSelected}
          isNegativeTagSelected={isNegativeTagSelected}
          handleAddTag={handleAddTag}
          handleRemoveTag={handleRemoveTag}
          isSearchPolySeekTagsOnly={isSearchPolySeekTagsOnly}
          setIsSearchPolySeekTagsOnly={setIsSearchPolySeekTagsOnly}
        />

        <FilterSidebar
          isFilterSidebarOpen={isFilterSidebarOpen}
          setIsFilterSidebarOpen={setIsFilterSidebarOpen}
          ageRatingTags={ageRatingTags}
          categoryTags={categoryTags}
          featureTags={featureTags}
          selectedAgeRatingTags={selectedAgeRatingTags}
          setSelectedAgeRatingTags={setSelectedAgeRatingTags}
          detailedFilters={detailedFilters}
          handleDetailedFilterChange={handleDetailedFilterChange}
          isFeatureTagSelected={isFeatureTagSelected}
          isNegativeTagSelected={isNegativeTagSelected}
          handleAddTag={handleAddTag}
          handleRemoveTag={handleRemoveTag}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          isHighPriceFilterEnabled={isHighPriceFilterEnabled}
          setIsHighPriceFilterEnabled={setIsHighPriceFilterEnabled}
          isLiked={isLiked}
          setIsLiked={setIsLiked}
          isOwned={isOwned}
          setIsOwned={setIsOwned}
          clearAllTagsAndFilters={clearAllTagsAndFilters}
          applyFiltersAndSearch={applyFiltersAndSearchWithHistory}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          isSearchPolySeekTagsOnly={isSearchPolySeekTagsOnly}
          setIsSearchPolySeekTagsOnly={setIsSearchPolySeekTagsOnly}
        />

        <Button
          variant="outline"
          size="icon"
          className="md:hidden h-9 w-9 flex-shrink-0"
          onClick={handleSearchWithHistory}
          aria-label="検索"
        >
          <Search className="h-4 w-4" />
        </Button>

        <SortSelector
          value={sortBy}
          onChange={handleSortChange}
          className="hidden md:flex"
        />

        <Button onClick={handleSearchWithHistory} size="sm" className="hidden md:inline-flex">
          検索
        </Button>
      </div>

      <SaveFavoriteModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveFavorite}
        defaultName={defaultFavoriteName}
      />
    </div>
  );
}
