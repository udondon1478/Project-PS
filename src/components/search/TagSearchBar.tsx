"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

import { useTypewriter } from '@/hooks/useTypewriter';
import { TagSuggestion } from '@/hooks/useProductSearch';

interface TagSearchBarProps {
  searchQuery: string;
  selectedTags: string[];
  selectedNegativeTags: string[];
  tagSuggestions: TagSuggestion[];
  isSuggestionsVisible: boolean;
  searchContainerRef: React.Ref<HTMLDivElement>;
  searchInputRef: React.Ref<HTMLInputElement>;
  suggestionsRef: React.Ref<HTMLDivElement>;
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
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);

  const placeholderText = useTypewriter({
    texts: [
      "タグで検索 (-でマイナス検索)",
      "アバター",
      "アバター -男性",
      "衣装 Quest対応"
    ],
    typingSpeed: 100,
    deletingSpeed: 50,
    pauseDuration: 2000,
  });

  // Reset active index when suggestions change or visibility changes
  React.useEffect(() => {
    setActiveIndex(-1);
  }, [tagSuggestions, isSuggestionsVisible]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestionsVisible || tagSuggestions.length === 0) {
      handleKeyDown(e);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % tagSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + tagSuggestions.length) % tagSuggestions.length);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < tagSuggestions.length) {
        e.preventDefault();
        const tag = tagSuggestions[activeIndex];
        handleAddTag(searchQuery.startsWith('-') ? `-${tag.name}` : tag.name);
      } else {
        handleKeyDown(e);
      }
    } else {
      handleKeyDown(e);
    }
  };

  // Scroll active item into view
  React.useEffect(() => {
    if (activeIndex >= 0 && suggestionsRef && 'current' in suggestionsRef && suggestionsRef.current) {
      const activeItem = suggestionsRef.current.children[activeIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, suggestionsRef]);

  return (
    <div className="relative flex-grow max-w-full" ref={searchContainerRef} id="tour-search-bar">
      <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 p-1 flex-wrap gap-1 min-h-[40px]">
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
          placeholder={placeholderText}
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onFocus={() => searchQuery.length > 0 && setIsSuggestionsVisible(true)}
          className="flex-grow border-none focus:ring-0 focus:outline-none p-1 h-auto text-sm min-w-[80px] md:min-w-[100px]"
          role="combobox"
          aria-controls="tag-suggestions-list"
          aria-expanded={isSuggestionsVisible && tagSuggestions.length > 0}
          aria-activedescendant={activeIndex >= 0 && activeIndex < tagSuggestions.length ? `tag-suggestion-${tagSuggestions[activeIndex].name}` : undefined}
        />
      </div>
      {isSuggestionsVisible && tagSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          id="tag-suggestions-list"
          role="listbox"
          tabIndex={-1} // Ensure it's focusable if needed, or stick to aria-activedescendant
          className="absolute z-20 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg"
        >
          {tagSuggestions.map((tag, index) => (
            <div
              key={tag.name}
              id={`tag-suggestion-${tag.name}`}
              role="option"
              aria-selected={index === activeIndex}
              data-testid={`tag-suggestion-${tag.name}`}
              onClick={() => handleAddTag(searchQuery.startsWith('-') ? `-${tag.name}` : tag.name)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`px-3 py-2 text-sm cursor-pointer ${index === activeIndex ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              {tag.displayName ?? tag.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
