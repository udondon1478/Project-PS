"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { X, Clock, Search } from 'lucide-react';

import { useTypewriter } from '@/hooks/useTypewriter';
import { TagSuggestion } from '@/hooks/useProductSearch';
import { SearchHistoryItem } from '@/hooks/useSearchHistory';

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

  // 履歴機能用Props
  searchHistory?: SearchHistoryItem[];
  onHistorySelect?: (item: SearchHistoryItem) => void;
  onHistoryDelete?: (itemId: string, e: React.SyntheticEvent) => void;
}

// 履歴の内容を文字列に整形するヘルパー
const formatHistoryQuery = (query: Record<string, any>): string => {
  const parts = [];

  // キーワード
  if (query.q) parts.push(`${query.q}`);

  // タグ
  if (Array.isArray(query.tags) && query.tags.length > 0) {
    parts.push(`タグ: ${query.tags.join(', ')}`);
  } else if (typeof query.tags === 'string' && query.tags) {
    parts.push(`タグ: ${query.tags}`);
  }

  // 除外タグ
  if (Array.isArray(query.ntags) && query.ntags.length > 0) {
    parts.push(`除外: ${query.ntags.join(', ')}`);
  } else if (typeof query.ntags === 'string' && query.ntags) {
    parts.push(`除外: ${query.ntags}`);
  }

  // 価格
  if (query.min_price || query.max_price) {
    const min = query.min_price ? `¥${query.min_price}` : '';
    const max = query.max_price ? `¥${query.max_price}` : '';
    parts.push(`価格: ${min}~${max}`);
  }

  return parts.join(' / ') || '条件なし';
};

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
  searchHistory = [],
  onHistorySelect,
  onHistoryDelete,
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
  }, [tagSuggestions, isSuggestionsVisible, searchQuery]);

  const showHistory = isSuggestionsVisible && searchQuery.length === 0 && searchHistory.length > 0;
  const showSuggestions = isSuggestionsVisible && searchQuery.length > 0 && tagSuggestions.length > 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestionsVisible) {
      handleKeyDown(e);
      return;
    }

    // サジェスト表示時のキー操作
    if (showSuggestions) {
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
      return;
    }

    // 履歴表示時のキー操作
    if (showHistory) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % searchHistory.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + searchHistory.length) % searchHistory.length);
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && activeIndex < searchHistory.length) {
          e.preventDefault();
          onHistorySelect?.(searchHistory[activeIndex]);
        } else {
          handleKeyDown(e);
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && e.shiftKey) {
        // Shift+Delete/Backspaceで履歴削除
        if (activeIndex >= 0 && activeIndex < searchHistory.length) {
          e.preventDefault();
          onHistoryDelete?.(searchHistory[activeIndex].id, e);
        }
      } else {
        handleKeyDown(e);
      }
      return;
    }

    handleKeyDown(e);
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
          onFocus={() => setIsSuggestionsVisible(true)}
          className="flex-grow border-none focus:ring-0 focus:outline-none p-1 h-auto text-sm min-w-[80px] md:min-w-[100px]"
          role="combobox"
          aria-controls="tag-suggestions-list"
          aria-expanded={isSuggestionsVisible}
        />
      </div>

      {/* サジェスト表示 */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          id="tag-suggestions-list"
          role="listbox"
          tabIndex={-1}
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
              className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center ${index === activeIndex ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              <span>
                {tag.displayName ?? tag.name}
                {tag.count !== undefined && tag.count > 0 && <span className="ml-1 text-xs text-gray-500">({tag.count}件)</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 履歴表示 */}
      {showHistory && (
        <div
          ref={suggestionsRef}
          id="search-history-list"
          role="listbox"
          tabIndex={-1}
          className="absolute z-20 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg"
        >
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            検索履歴
          </div>
          {searchHistory.map((item, index) => (
            <div
              key={item.id}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => onHistorySelect?.(item)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center group ${
                index === activeIndex ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Clock size={14} className="text-gray-400 flex-shrink-0" />
                <span className="truncate text-gray-700 dark:text-gray-300">
                  {formatHistoryQuery(item.query)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // 親のonClickを発火させない
                  onHistoryDelete?.(item.id, e);
                }}
                className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                title="履歴から削除"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
