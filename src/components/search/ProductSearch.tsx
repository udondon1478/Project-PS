"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { useProductSearch } from '@/hooks/useProductSearch';
import { TagSearchBar } from './TagSearchBar';
import { QuickFilters } from './QuickFilters';
import { FilterSidebar } from './FilterSidebar';

/**
 * Product search UI that wires tag-based input, quick filters, and an advanced filter sidebar.
 *
 * Renders a search bar with tag suggestions, quick filter buttons, and a collapsible filter sidebar.
 * The component delegates state and behavior to the `useProductSearch` hook and passes handlers
 * into presentational subcomponents (TagSearchBar, QuickFilters, FilterSidebar). Clicking the
 * search button triggers the composed search handler from the hook.
 *
 * @param initialSearchQuery - Optional initial text for the search input (default: '').
 * @param initialSelectedTags - Optional initial list of positive tags (default: []).
 * @param initialSelectedNegativeTags - Optional initial list of negative tags (default: []).
 * @param onSearchQueryChange - Optional callback invoked when the search query changes.
 * @param onSelectedTagsChange - Optional callback invoked when the positive selected tags change.
 * @param onSelectedNegativeTagsChange - Optional callback invoked when the negative selected tags change.
 * @returns A React element containing the product search UI.
 */

export default function ProductSearch({
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
  } = useProductSearch({
    initialSearchQuery,
    initialSelectedTags,
    initialSelectedNegativeTags,
    onSearchQueryChange,
    onSelectedTagsChange,
    onSelectedNegativeTagsChange,
  });

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto flex items-center gap-2 md:gap-4">
        <TagSearchBar
          searchQuery={searchQuery}
          selectedTags={selectedTags}
          selectedNegativeTags={selectedNegativeTags}
          tagSuggestions={tagSuggestions}
          isSuggestionsVisible={isSuggestionsVisible}
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
        />

        <Button onClick={handleSearch} size="sm" className="hidden md:inline-flex">
          検索
        </Button>
      </div>
    </div>
  );
}
