"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SortOption, SORT_VALUES, isSortOption } from '@/constants/sort';
import { AGE_RATING_WHITELIST } from '@/lib/constants';

// Sanitize age rating tags to only include whitelisted values
const sanitizeAgeRatingTags = (tags: string[]): string[] => {
  return tags.filter(tag => (AGE_RATING_WHITELIST as readonly string[]).includes(tag));
};

// タグサジェストの型定義
export interface TagSuggestion {
  name: string;
  displayName: string | null;
}

function isValidTagSuggestion(item: any): item is { name: string; displayName: string | null } {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.name === 'string' &&
    (item.displayName === null || typeof item.displayName === 'string')
  );
}

// Helper to build search query parameters
const buildSearchQueryParams = ({
  selectedTags,
  selectedNegativeTags,
  selectedAgeRatingTags,
  detailedFilters,
  priceRange,
  isHighPriceFilterEnabled,
  isLiked,
  isOwned,
  sortBy,
  overrideSortBy,
}: {
  selectedTags: string[];
  selectedNegativeTags: string[];
  selectedAgeRatingTags: string[];
  detailedFilters: { category: string | null };
  priceRange: [number, number];
  isHighPriceFilterEnabled: boolean;
  isLiked: boolean;
  isOwned: boolean;
  sortBy: SortOption;
  overrideSortBy?: SortOption;
}) => {
  const queryParams = new URLSearchParams();
  if (selectedTags.length > 0) queryParams.append("tags", selectedTags.join(','));
  if (selectedNegativeTags.length > 0) queryParams.append("negativeTags", selectedNegativeTags.join(','));
  if (selectedAgeRatingTags.length > 0) queryParams.append("ageRatingTags", selectedAgeRatingTags.join(','));
  if (detailedFilters.category) queryParams.append("categoryName", detailedFilters.category);

  if (priceRange[0] !== 0) queryParams.append("minPrice", priceRange[0].toString());
  if (!((priceRange[1] === 10000 && !isHighPriceFilterEnabled) || (isHighPriceFilterEnabled && priceRange[1] === 100000))) {
    queryParams.append("maxPrice", priceRange[1].toString());
  }
  if (isHighPriceFilterEnabled) queryParams.append("isHighPrice", "true");
  if (isLiked) queryParams.append("liked", "true");
  if (isOwned) queryParams.append("owned", "true");
  
  const finalSort = overrideSortBy || sortBy;
  if (finalSort && finalSort !== 'newest') queryParams.append("sort", finalSort);

  return queryParams;
};

export const useProductSearch = ({
  initialSearchQuery = '',
  initialSelectedTags = [],
  initialSelectedNegativeTags = [],
  onSearchQueryChange,
  onSelectedTagsChange,
  onSelectedNegativeTagsChange,
  isSafeSearchEnabled = true, // Default to true
}: {
  initialSearchQuery?: string;
  initialSelectedTags?: string[];
  initialSelectedNegativeTags?: string[];
  onSearchQueryChange?: (query: string) => void;
  onSelectedTagsChange?: (tags: string[]) => void;
  onSelectedNegativeTagsChange?: (tags: string[]) => void;
  isSafeSearchEnabled?: boolean;
} = {}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSelectedTags);
  const [selectedNegativeTags, setSelectedNegativeTags] = useState<string[]>(initialSelectedNegativeTags);

  const searchParams = useSearchParams();
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);

  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [detailedFilters, setDetailedFilters] = useState({
    category: null as string | null,
  });

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [isHighPriceFilterEnabled, setIsHighPriceFilterEnabled] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isOwned, setIsOwned] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [ageRatingTags, setAgeRatingTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [categoryTags, setCategoryTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [featureTags, setFeatureTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [selectedAgeRatingTags, setSelectedAgeRatingTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchTagsByType = async () => {
      try {
        const ageRatingsResponse = await fetch('/api/tags/by-type?categoryNames=age_rating');
        if (ageRatingsResponse.ok) {
          const ageRatingData = await ageRatingsResponse.json();
          setAgeRatingTags(ageRatingData.map((tag: { id: string; name: string; tagCategory?: { id: string; name: string; color: string } | null }) => ({
            id: tag.id,
            name: tag.name,
            color: tag.tagCategory?.color || null,
          })));
        } else {
          console.warn('Age rating tags API not available (404), skipping...');
        }

        const categoriesResponse = await fetch('/api/tags/by-type?categoryNames=product_category');
        if (categoriesResponse.ok) {
          const categoryData = await categoriesResponse.json();
          setCategoryTags(categoryData.map((tag: { id: string; name: string; tagCategory?: { id: string; name: string; color: string } | null }) => ({
            id: tag.id,
            name: tag.name,
            color: tag.tagCategory?.color || null,
          })));
        } else {
          console.warn('Category tags API not available (404), skipping...');
        }

        const featuresResponse = await fetch('/api/tags/by-type?categoryNames=feature');
        if (featuresResponse.ok) {
          const featureData = await featuresResponse.json();
          setFeatureTags(featureData.map((tag: { id: string; name: string; tagCategory?: { id: string; name: string; color: string } | null }) => ({
            id: tag.id,
            name: tag.name,
            color: tag.tagCategory?.color || null,
          })));
        } else {
          console.warn('Feature tags API not available (404), skipping...');
        }

      } catch (error) {
        console.error('Error fetching tags by type:', error);
      }
    };
    fetchTagsByType();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const savedTags = JSON.parse(sessionStorage.getItem('polyseek-search-tags') || '[]');
      const savedNegativeTags = JSON.parse(sessionStorage.getItem('polyseek-search-negative-tags') || '[]');
      setSelectedTags(savedTags);
      setSelectedNegativeTags(savedNegativeTags);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const urlTags = urlSearchParams.get("tags")?.split(',').filter(tag => tag.length > 0) || [];
    const urlNegativeTags = urlSearchParams.get("negativeTags")?.split(',').filter(tag => tag.length > 0) || [];
    const urlAgeRatingTags = urlSearchParams.get("ageRatingTags")?.split(',').filter(tag => tag.length > 0) || [];

    if (urlTags.length > 0 || urlNegativeTags.length > 0 || urlAgeRatingTags.length > 0) {
      setSelectedTags(urlTags);
      setSelectedNegativeTags(urlNegativeTags);
      setSelectedAgeRatingTags(sanitizeAgeRatingTags(urlAgeRatingTags));
    } else {
      const savedTags = sessionStorage.getItem('polyseek-search-tags');
      const savedNegativeTags = sessionStorage.getItem('polyseek-search-negative-tags');
      const savedAgeRatingTags = sessionStorage.getItem('polyseek-search-age-rating-tags');
      const savedSortBy = sessionStorage.getItem('polyseek-search-sort');
      if (savedTags) try { setSelectedTags(JSON.parse(savedTags)); } catch (e) { console.error(e); }
      if (savedNegativeTags) try { setSelectedNegativeTags(JSON.parse(savedNegativeTags)); } catch (e) { console.error(e); }
      if (savedAgeRatingTags) try { setSelectedAgeRatingTags(sanitizeAgeRatingTags(JSON.parse(savedAgeRatingTags))); } catch (e) { console.error(e); }
      if (savedSortBy && isSortOption(savedSortBy)) {
        setSortBy(savedSortBy);
      }
    }
    const urlMinPriceStr = urlSearchParams.get("minPrice");
    const urlMaxPriceStr = urlSearchParams.get("maxPrice");
    const urlIsHighPrice = urlSearchParams.get("isHighPrice") === 'true';
    const urlIsLiked = urlSearchParams.get("liked") === 'true';
    const urlIsOwned = urlSearchParams.get("owned") === 'true';

    setIsLiked(urlIsLiked);
    setIsOwned(urlIsOwned);

    // URLからsortパラメータを読み込み
    const urlSort = urlSearchParams.get("sort");
    if (urlSort && isSortOption(urlSort)) {
      setSortBy(urlSort);
    }

    if (urlMinPriceStr !== null || urlMaxPriceStr !== null || urlIsHighPrice) {
        const DEFAULT_MIN = 0;
        const DEFAULT_MAX = 10000;
        const HIGH_PRICE_CAP = 100000;
        const upperCap = urlIsHighPrice ? HIGH_PRICE_CAP : DEFAULT_MAX;

        const parsedMin = Number(urlMinPriceStr);
        const parsedMax = Number(urlMaxPriceStr);

        let min = (Number.isNaN(parsedMin) || urlMinPriceStr === null) ? DEFAULT_MIN : Math.max(DEFAULT_MIN, parsedMin);
        let max = (Number.isNaN(parsedMax) || urlMaxPriceStr === null) ? upperCap : Math.max(DEFAULT_MIN, parsedMax);

        min = Math.min(min, upperCap);
        max = Math.min(max, upperCap);

        if (min > max) {
            [min, max] = [max, min]; // Swap them
        }

        setIsHighPriceFilterEnabled(urlIsHighPrice);
        setPriceRange([min, max]);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchQuery.length === 0) {
      setTagSuggestions([]);
      setIsSuggestionsVisible(false);
      return;
    }
    const timerId = setTimeout(async () => {
      try {
        const isNegativeSearch = searchQuery.startsWith('-');
        const actualQuery = isNegativeSearch ? searchQuery.substring(1) : searchQuery;
        if (actualQuery.length === 0) {
          setTagSuggestions([]);
          setIsSuggestionsVisible(false);
          return;
        }
        const response = await fetch(`/api/tags/search?query=${encodeURIComponent(actualQuery)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) {
          let preview = '';
          try {
            preview = JSON.stringify(data);
          } catch (e) {
            preview = String(data);
          }
          if (preview.length > 200) {
            preview = preview.substring(0, 200) + '...';
          }
          const constructorName = data?.constructor?.name ?? 'undefined';
          console.warn(`API response is not an array: type=${typeof data}, constructor=${constructorName}, value=${preview}`);
          setTagSuggestions([]);
          setIsSuggestionsVisible(false);
          return;
        }

        const filteredSuggestions = data
          .filter(isValidTagSuggestion)
          .map((tag) => ({
            name: tag.name,
            displayName: tag.displayName
          }))
          .filter((tag: TagSuggestion) => !selectedTags.includes(tag.name) && !selectedNegativeTags.includes(tag.name));

        // セーフサーチ有効時はR-18をサジェストから除外
        const finalSuggestions = isSafeSearchEnabled
          ? filteredSuggestions.filter((tag: TagSuggestion) => tag.name !== 'R-18')
          : filteredSuggestions;

        setTagSuggestions(finalSuggestions);
        setIsSuggestionsVisible(finalSuggestions.length > 0);
      } catch (error) {
        console.error("Error fetching tag suggestions:", error);
        setTagSuggestions([]);
        setIsSuggestionsVisible(false);
      }
    }, 300);
    return () => clearTimeout(timerId);
  }, [searchQuery, selectedTags, selectedNegativeTags, isSafeSearchEnabled]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isInsideInput = searchContainerRef.current && searchContainerRef.current.contains(event.target as Node);
      const isInsideSuggestions = suggestionsRef.current && suggestionsRef.current.contains(event.target as Node);
      if (!isInsideInput && !isInsideSuggestions) {
        setIsSuggestionsVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 検索ページ（/search）にいる場合のみsessionStorageに保存
  // 他のページ（商品詳細等）では保存しないことで、検索状態の上書きを防止
  useEffect(() => {
    if (pathname === '/search') {
      sessionStorage.setItem('polyseek-search-tags', JSON.stringify(selectedTags));
      sessionStorage.setItem('polyseek-search-negative-tags', JSON.stringify(selectedNegativeTags));
      sessionStorage.setItem('polyseek-search-age-rating-tags', JSON.stringify(selectedAgeRatingTags));
      sessionStorage.setItem('polyseek-search-sort', sortBy);
    }
  }, [selectedTags, selectedNegativeTags, selectedAgeRatingTags, sortBy, pathname]);

  useEffect(() => {
    setPriceRange(currentPriceRange => {
      const newBounds = isHighPriceFilterEnabled ? [10000, 100000] : [0, 10000];

      let clampedMin = Math.max(newBounds[0], Math.min(currentPriceRange[0], newBounds[1]));
      let clampedMax = Math.max(newBounds[0], Math.min(currentPriceRange[1], newBounds[1]));

      if (clampedMin > clampedMax) {
        [clampedMin, clampedMax] = [clampedMax, clampedMin];
      }

      return [clampedMin, clampedMax];
    });
  }, [isHighPriceFilterEnabled]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    onSearchQueryChange?.(event.target.value);
  };

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag === '') return;

    const isNegative = trimmedTag.startsWith('-');
    const tagName = isNegative ? trimmedTag.substring(1) : trimmedTag;
    if (tagName === '') return;

    if (selectedTags.includes(tagName) || selectedNegativeTags.includes(tagName)) {
      setSearchQuery('');
      setTagSuggestions([]);
      setIsSuggestionsVisible(false);
      searchInputRef.current?.focus();
      return;
    }

    let newSelectedTags = [...selectedTags];
    let newSelectedNegativeTags = [...selectedNegativeTags];
    let newSelectedAgeRatingTags = [...selectedAgeRatingTags];

    if (isNegative) {
      if (!newSelectedNegativeTags.includes(tagName)) {
        newSelectedNegativeTags = [...newSelectedNegativeTags, tagName];
      }
    } else {
      const ageRatingTagNames = ageRatingTags.map(tag => tag.name);
      if (ageRatingTagNames.includes(tagName)) {
        if (!newSelectedAgeRatingTags.includes(tagName)) {
          newSelectedAgeRatingTags = [...newSelectedAgeRatingTags, tagName];
        }
      } else {
        if (!newSelectedTags.includes(tagName)) {
          newSelectedTags = [...newSelectedTags, tagName];
        }
      }
    }

    setSearchQuery('');
    setTagSuggestions([]);
    setIsSuggestionsVisible(false);
    searchInputRef.current?.focus();

    setSelectedTags(newSelectedTags);
    setSelectedNegativeTags(newSelectedNegativeTags);
    setSelectedAgeRatingTags(newSelectedAgeRatingTags);

    onSelectedTagsChange?.(newSelectedTags);
    onSelectedNegativeTagsChange?.(newSelectedNegativeTags);
  };

  const handleRemoveTag = (tagToRemove: string, isNegative: boolean = false) => {
    const ageRatingTagNames = ageRatingTags.map(tag => tag.name);
    if (ageRatingTagNames.includes(tagToRemove)) {
      const newTags = selectedAgeRatingTags.filter(tag => tag !== tagToRemove);
      setSelectedAgeRatingTags(newTags);
      onSelectedTagsChange?.(newTags);
    } else if (isNegative) {
      const newTags = selectedNegativeTags.filter(tag => tag !== tagToRemove);
      setSelectedNegativeTags(newTags);
      onSelectedNegativeTagsChange?.(newTags);
    } else {
      const newTags = selectedTags.filter(tag => tag !== tagToRemove);
      setSelectedTags(newTags);
      onSelectedTagsChange?.(newTags);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const trimmedQuery = searchQuery.trim();
    if ((event.key === ' ' || event.key === 'Enter' || event.key === 'Tab') && isComposing) return;

    if ((event.key === ' ' || (event.key === 'Enter' && !isComposing) || (event.key === 'Tab' && !isComposing)) && trimmedQuery !== '') {
      event.preventDefault();
      const isNegative = trimmedQuery.startsWith('-');
      const tagName = isNegative ? trimmedQuery.substring(1) : trimmedQuery;
      if (tagName === '') return;

      if (event.key === 'Enter' && isSuggestionsVisible && tagSuggestions.length > 0) {
        const tagToAdd = isNegative ? `-${tagSuggestions[0].name}` : tagSuggestions[0].name;
        handleAddTag(tagToAdd);
      } else {
        handleAddTag(trimmedQuery);
      }
    } else if (event.key === 'Backspace' && searchQuery === '' && (selectedTags.length > 0 || selectedNegativeTags.length > 0)) {
      if (selectedNegativeTags.length > 0) {
        handleRemoveTag(selectedNegativeTags[selectedNegativeTags.length - 1], true);
      } else if (selectedTags.length > 0) {
        handleRemoveTag(selectedTags[selectedTags.length - 1], false);
      }
    }
  };

  const handleSearch = useCallback(() => {
    setIsFilterSidebarOpen(false);
    
    const queryParams = buildSearchQueryParams({
      selectedTags,
      selectedNegativeTags,
      selectedAgeRatingTags,
      detailedFilters,
      priceRange,
      isHighPriceFilterEnabled,
      isLiked,
      isOwned,
      sortBy
    });
    
    router.replace(`/search?${queryParams.toString()}`);
  }, [selectedTags, selectedNegativeTags, selectedAgeRatingTags, detailedFilters, priceRange, isHighPriceFilterEnabled, router, isLiked, isOwned, sortBy]);

  // ソート変更時に新しい値を直接受け取ってURLを更新するハンドラー
  const handleSortChange = useCallback((value: SortOption) => {
    setSortBy(value);
    setIsFilterSidebarOpen(false);
    
    const queryParams = buildSearchQueryParams({
      selectedTags,
      selectedNegativeTags,
      selectedAgeRatingTags,
      detailedFilters,
      priceRange,
      isHighPriceFilterEnabled,
      isLiked,
      isOwned,
      sortBy,
      overrideSortBy: value
    });
    
    router.replace(`/search?${queryParams.toString()}`);
  }, [
    selectedTags,
    selectedNegativeTags,
    selectedAgeRatingTags,
    detailedFilters,
    priceRange,
    isHighPriceFilterEnabled,
    isLiked,
    isOwned,
    sortBy,
    buildSearchQueryParams,
    router,
    setSortBy,
    setIsFilterSidebarOpen
  ]);

  const handleDetailedFilterChange = (filterType: keyof typeof detailedFilters, value: string | null) => {
    setDetailedFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const clearAllTagsAndFilters = () => {
    setSelectedTags([]);
    setSelectedNegativeTags([]);
    setSelectedAgeRatingTags([]);
    setDetailedFilters({ category: null });
    setIsLiked(false);
    setIsOwned(false);
    setPriceRange([0, 10000]);
    setIsHighPriceFilterEnabled(false);
    setSortBy('newest');
  };

  const applyFiltersAndSearch = () => {
    handleSearch();
    setIsFilterSidebarOpen(false);
  };

  const isFeatureTagSelected = (feature: string) => selectedTags.includes(feature);
  const isNegativeTagSelected = (tag: string) => selectedNegativeTags.includes(tag);

  return {
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
    selectedNegativeTags,
    setSelectedNegativeTags,
    isComposing,
    setIsComposing,
    tagSuggestions,
    isSuggestionsVisible,
    setIsSuggestionsVisible,
    isFilterSidebarOpen,
    setIsFilterSidebarOpen,
    detailedFilters,
    setDetailedFilters,
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
    ageRatingTags: isSafeSearchEnabled ? ageRatingTags.filter(tag => tag.name !== 'R-18') : ageRatingTags,
    categoryTags,
    featureTags,
    selectedAgeRatingTags,
    setSelectedAgeRatingTags,
    handleInputChange,
    handleAddTag,
    handleRemoveTag,
    handleKeyDown,
    handleSearch,
    handleDetailedFilterChange,
    clearAllTagsAndFilters,
    applyFiltersAndSearch,
    isFeatureTagSelected,
    isNegativeTagSelected,
    sortBy,
    setSortBy,
    handleSortChange,
  };
};
