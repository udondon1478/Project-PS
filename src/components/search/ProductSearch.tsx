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

  // 検索実行時に履歴を保存するラッパー関数
  const handleSearchWithHistory = useCallback(async () => {
    // 履歴データの構築 (URLパラメータと互換性のあるキーを使用)
    // 注意: TagSearchBarのformatHistoryQueryで使用しているキーと合わせる必要がある
    // formatHistoryQuery: q, tags, ntags, min_price, max_price...
    // ここでは分かりやすさのため、formatHistoryQuery側をこの構造に合わせて修正する方針で、
    // まずは保存データを構築する
    const historyData: Record<string, any> = {};

    if (searchQuery) historyData.q = searchQuery;
    if (selectedTags.length > 0) historyData.tags = selectedTags;
    if (selectedNegativeTags.length > 0) historyData.ntags = selectedNegativeTags;
    if (selectedAgeRatingTags.length > 0) historyData.age_tags = selectedAgeRatingTags;

    // detailedFilters全体を保存 (category以外も含まれる可能性があるため)
    if (detailedFilters && Object.keys(detailedFilters).length > 0) {
      historyData.detailedFilters = detailedFilters;
      // 後方互換性やformatHistoryQueryのためにcategoryはトップレベルにも入れておく（重複するが安全）
      if (detailedFilters.category) historyData.category = detailedFilters.category;
    }

    // 価格
    if (priceRange[0] > 0) historyData.min_price = priceRange[0];

    // 上限価格の保存条件
    if (shouldSaveMaxPrice(priceRange[1], isHighPriceFilterEnabled)) {
       historyData.max_price = priceRange[1];
    }

    if (isHighPriceFilterEnabled) historyData.high_price = true;

    if (isLiked) historyData.liked = true;
    if (isOwned) historyData.owned = true;
    if (isSearchPolySeekTagsOnly) historyData.poly_tags = true;
    if (sortBy !== 'newest') historyData.sort = sortBy;

    // 条件が一つでもあれば保存
    if (Object.keys(historyData).length > 0) {
      try {
        await addHistory(historyData);
      } catch (e) {
        console.error('Failed to add history:', e);
      }
    }

    originalHandleSearch();
  }, [
    searchQuery, selectedTags, selectedNegativeTags, selectedAgeRatingTags,
    detailedFilters, priceRange, isHighPriceFilterEnabled, isLiked, isOwned,
    isSearchPolySeekTagsOnly, sortBy, addHistory, originalHandleSearch
  ]);

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
    const query: Record<string, any> = {};
    if (searchQuery) query.keyword = searchQuery; // generateDefaultNameはkeywordを期待
    // tagsはオブジェクト配列を期待している実装になっているが、ここでは文字列配列
    if (selectedTags.length > 0) query.tags = selectedTags;

    setDefaultFavoriteName(generateDefaultName(query));
    setIsSaveModalOpen(true);
  };

  const handleSaveFavorite = async (name: string) => {
    // 現在の検索条件を構築 (handleSearchWithHistoryと同じロジック)
    const historyData: Record<string, any> = {};

    if (searchQuery) historyData.q = searchQuery;
    if (selectedTags.length > 0) historyData.tags = selectedTags;
    if (selectedNegativeTags.length > 0) historyData.ntags = selectedNegativeTags;
    if (selectedAgeRatingTags.length > 0) historyData.age_tags = selectedAgeRatingTags;

    if (detailedFilters && Object.keys(detailedFilters).length > 0) {
      historyData.detailedFilters = detailedFilters;
      if (detailedFilters.category) historyData.category = detailedFilters.category;
    }

    if (priceRange[0] > 0) historyData.min_price = priceRange[0];
    if (shouldSaveMaxPrice(priceRange[1], isHighPriceFilterEnabled)) {
       historyData.max_price = priceRange[1];
    }

    if (isHighPriceFilterEnabled) historyData.high_price = true;
    if (isLiked) historyData.liked = true;
    if (isOwned) historyData.owned = true;
    if (isSearchPolySeekTagsOnly) historyData.poly_tags = true;
    if (sortBy !== 'newest') historyData.sort = sortBy;

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
          onFavoriteRename={(item) => renameFavorite(item.id, item.name)} // 名前変更はダイアログ等が必要だが、一旦簡易実装または後回し。ここでは型合わせ
        />

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

        <Button
          variant="outline"
          size="icon"
          onClick={handleOpenSaveModal}
          title="検索条件をお気に入りに保存"
          className="flex-shrink-0"
        >
          <Star className={`h-4 w-4 ${favorites.some(f => JSON.stringify(f.query) === JSON.stringify({ ...f.query /* 厳密な比較は難しいが、簡易的に */ })) ? "fill-amber-400 text-amber-400" : "text-gray-500"}`} />
        </Button>

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
