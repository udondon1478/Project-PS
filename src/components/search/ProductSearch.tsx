"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useProductSearch } from '@/hooks/useProductSearch';
import { TagSearchBar } from './TagSearchBar';
import { QuickFilters } from './QuickFilters';
import { FilterSidebar } from './FilterSidebar';
import { SortSelector } from './SortSelector';

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
    handleSearch,
    handleDetailedFilterChange,
    clearAllTagsAndFilters,
    applyFiltersAndSearch,
    isFeatureTagSelected,
    isNegativeTagSelected,
    setIsComposing,
    sortBy,
    handleSortChange,
  } = useProductSearch({
    initialSearchQuery,
    initialSelectedTags,
    initialSelectedNegativeTags,
    onSearchQueryChange,
    onSelectedTagsChange,
    onSelectedNegativeTagsChange,
    isSafeSearchEnabled,
  });

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (!isSpotlightActive || !onSpotlightDismiss) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSpotlightDismiss();
    }
  };

  return (
    <div 
      className={`p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-all duration-500 ease-in-out ${
        isSpotlightActive ? 'ring-4 ring-primary/50 shadow-2xl relative z-50 bg-white dark:bg-gray-700' : ''
      }`}
      onClick={() => {
        if (isSpotlightActive && onSpotlightDismiss) {
          onSpotlightDismiss();
        }
      }}
      role={isSpotlightActive ? "button" : undefined}
      tabIndex={isSpotlightActive ? 0 : undefined}
      aria-label={isSpotlightActive ? "検索モードを終了" : undefined}
      onKeyDown={handleContainerKeyDown}
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
          applyFiltersAndSearch={applyFiltersAndSearch}
          sortBy={sortBy}
          onSortChange={handleSortChange}
        />

        <Button
          variant="outline"
          size="icon"
          className="md:hidden h-9 w-9 flex-shrink-0"
          onClick={handleSearch}
          aria-label="検索"
        >
          <Search className="h-4 w-4" />
        </Button>

        <SortSelector
          value={sortBy}
          onChange={handleSortChange}
          className="hidden md:flex"
        />

        <Button onClick={handleSearch} size="sm" className="hidden md:inline-flex">
          検索
        </Button>
      </div>
    </div>
  );
}
