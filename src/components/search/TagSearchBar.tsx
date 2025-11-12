"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface TagSearchBarProps {
  searchQuery: string;
  selectedTags: string[];
  selectedNegativeTags: string[];
  tagSuggestions: string[];
  isSuggestionsVisible: boolean;
  searchContainerRef: React.Ref<HTMLDivElement>;
  searchInputRef: React.Ref<HTMLInputElement>;
  suggestionsRef: React.Ref<HTMLUListElement>;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleCompositionStart: () => void;
  handleCompositionEnd: () => void;
  handleAddTag: (tag: string) => void;
  handleRemoveTag: (tag: string, isNegative?: boolean) => void;
  setIsSuggestionsVisible: (isVisible: boolean) => void;
}

export const TagSearchBar: React.FC<TagSearchBarProps> = ({
  searchQuery,
  selectedTags,
  selectedNegativeTags,
  tagSuggestions,
  isSuggestionsVisible,
  searchContainerRef,
  searchInputRef,
  suggestionsRef,
  handleInputChange,
  handleKeyDown,
  handleCompositionStart,
  handleCompositionEnd,
  handleAddTag,
  handleRemoveTag,
  setIsSuggestionsVisible,
}) => {
  return (
    <div className="relative flex-grow" ref={searchContainerRef}>
      <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 p-1 flex-wrap gap-1 min-h-[40px]">
        <Search className="h-5 w-5 text-gray-400 dark:text-gray-300 mx-1 flex-shrink-0" />
        {selectedTags.map(tag => (
          <span key={tag} className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap">
            {tag}
            <button onClick={() => handleRemoveTag(tag)} className="ml-1 text-blue-600 hover:text-blue-800">
              <X size={12} />
            </button>
          </span>
        ))}
        {selectedNegativeTags.map(tag => (
          <span key={`negative-${tag}`} className="flex items-center bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap">
            -{tag}
            <button onClick={() => handleRemoveTag(tag, true)} className="ml-1 text-red-600 hover:text-red-800">
              <X size={12} />
            </button>
          </span>
        ))}
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="タグで検索 (-でマイナス検索)"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onFocus={() => searchQuery.length > 0 && setIsSuggestionsVisible(true)}
          className="flex-grow border-none focus:ring-0 focus:outline-none p-1 h-auto text-sm min-w-[100px]"
        />
      </div>
      {isSuggestionsVisible && tagSuggestions.length > 0 && (
        <ul ref={suggestionsRef} className="absolute z-20 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
          {tagSuggestions.map(tag => (
            <li
              key={tag}
              aria-label={tag}
              data-testid={`tag-suggestion-${tag}`}
              onClick={() => handleAddTag(searchQuery.startsWith('-') ? `-${tag}` : tag)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
