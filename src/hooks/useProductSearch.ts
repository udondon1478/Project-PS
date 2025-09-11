"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const useProductSearch = ({
  initialSearchQuery = '',
  initialSelectedTags = [],
  initialSelectedNegativeTags = [],
  onSearchQueryChange,
  onSelectedTagsChange,
  onSelectedNegativeTagsChange,
}: {
  initialSearchQuery?: string;
  initialSelectedTags?: string[];
  initialSelectedNegativeTags?: string[];
  onSearchQueryChange?: (query: string) => void;
  onSelectedTagsChange?: (tags: string[]) => void;
  onSelectedNegativeTagsChange?: (tags: string[]) => void;
} = {}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSelectedTags);
  const [selectedNegativeTags, setSelectedNegativeTags] = useState<string[]>(initialSelectedNegativeTags);
  const [isComposing, setIsComposing] = useState(false);

  const searchParams = useSearchParams();
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [detailedFilters, setDetailedFilters] = useState({
    category: null as string | null,
  });

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [isHighPriceFilterEnabled, setIsHighPriceFilterEnabled] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isOwned, setIsOwned] = useState(false);

  const searchInputRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const suggestionsRef = useRef<HTMLUListElement>(null);

  const [ageRatingTags, setAgeRatingTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [categoryTags, setCategoryTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [featureTags, setFeatureTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [selectedAgeRatingTags, setSelectedAgeRatingTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchTagsByType = async () => {
      try {
        const ageRatingsResponse = await fetch('/api/tags/by-type?categoryNames=age_rating');
        const ageRatingData = await ageRatingsResponse.json();
        if (ageRatingsResponse.ok) {
          setAgeRatingTags(ageRatingData.map((tag: { id: string; name: string; tagCategory?: { id: string; name: string; color: string } | null }) => ({
            id: tag.id,
            name: tag.name,
            color: tag.tagCategory?.color || null,
          })));
        } else {
          console.error('Failed to fetch age rating tags:', ageRatingData.message);
        }

        const categoriesResponse = await fetch('/api/tags/by-type?categoryNames=product_category');
        const categoryData = await categoriesResponse.json();
        if (categoriesResponse.ok) {
          setCategoryTags(categoryData.map((tag: { id: string; name: string; tagCategory?: { id: string; name: string; color: string } | null }) => ({
            id: tag.id,
            name: tag.name,
            color: tag.tagCategory?.color || null,
          })));
        } else {
          console.error('Failed to fetch category tags:', categoryData.message);
        }

        const featuresResponse = await fetch('/api/tags/by-type?categoryNames=feature');
        const featureData = await featuresResponse.json();
        if (featuresResponse.ok) {
          setFeatureTags(featureData.map((tag: { id: string; name: string; tagCategory?: { id: string; name: string; color: string } | null }) => ({
            id: tag.id,
            name: tag.name,
            color: tag.tagCategory?.color || null,
          })));
        } else {
          console.error('Failed to fetch feature tags:', featureData.message);
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
      setSelectedAgeRatingTags(urlAgeRatingTags);
    } else {
      const savedTags = sessionStorage.getItem('polyseek-search-tags');
      const savedNegativeTags = sessionStorage.getItem('polyseek-search-negative-tags');
      const savedAgeRatingTags = sessionStorage.getItem('polyseek-search-age-rating-tags');
      if (savedTags) try { setSelectedTags(JSON.parse(savedTags)); } catch (e) { console.error(e); }
      if (savedNegativeTags) try { setSelectedNegativeTags(JSON.parse(savedNegativeTags)); } catch (e) { console.error(e); }
      if (savedAgeRatingTags) try { setSelectedAgeRatingTags(JSON.parse(savedAgeRatingTags)); } catch (e) { console.error(e); }
    }
    const urlMinPriceStr = urlSearchParams.get("minPrice");
    const urlMaxPriceStr = urlSearchParams.get("maxPrice");
    const urlIsHighPrice = urlSearchParams.get("isHighPrice") === 'true';
    const urlIsLiked = urlSearchParams.get("liked") === 'true';
    const urlIsOwned = urlSearchParams.get("owned") === 'true';

    setIsLiked(urlIsLiked);
    setIsOwned(urlIsOwned);

    if (urlMinPriceStr !== null || urlMaxPriceStr !== null || urlIsHighPrice) {
        const DEFAULT_MIN = 0;
        const DEFAULT_MAX = 10000;
        const HIGH_PRICE_CAP = 100000;
        const upperCap = urlIsHighPrice ? HIGH_PRICE_CAP : DEFAULT_MAX;

        let parsedMin = Number(urlMinPriceStr);
        let parsedMax = Number(urlMaxPriceStr);

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
        const filteredSuggestions = data
          .map((tag: { name: string }) => tag.name)
          .filter((tagName: string) => !selectedTags.includes(tagName) && !selectedNegativeTags.includes(tagName));
        setTagSuggestions(filteredSuggestions);
        setIsSuggestionsVisible(filteredSuggestions.length > 0);
      } catch (error) {
        console.error("Error fetching tag suggestions:", error);
        setTagSuggestions([]);
        setIsSuggestionsVisible(false);
      }
    }, 300);
    return () => clearTimeout(timerId);
  }, [searchQuery, selectedTags, selectedNegativeTags]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchInputRef.current && !searchInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)
      ) {
        setIsSuggestionsVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('polyseek-search-tags', JSON.stringify(selectedTags));
    sessionStorage.setItem('polyseek-search-negative-tags', JSON.stringify(selectedNegativeTags));
    sessionStorage.setItem('polyseek-search-age-rating-tags', JSON.stringify(selectedAgeRatingTags));
  }, [selectedTags, selectedNegativeTags, selectedAgeRatingTags]);

  useEffect(() => {
    if (isHighPriceFilterEnabled) {
      setPriceRange([10000, 100000]);
    } else {
      setPriceRange([0, 10000]);
    }
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
        const tagToAdd = isNegative ? `-${tagSuggestions[0]}` : tagSuggestions[0];
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
    router.replace(`/search?${queryParams.toString()}`);
  }, [selectedTags, selectedNegativeTags, selectedAgeRatingTags, detailedFilters, priceRange, isHighPriceFilterEnabled, router, isLiked, isOwned]);

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
    handleSearch,
    handleDetailedFilterChange,
    clearAllTagsAndFilters,
    applyFiltersAndSearch,
    isFeatureTagSelected,
    isNegativeTagSelected,
  };
};
