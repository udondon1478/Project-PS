"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { X, Clock } from 'lucide-react';

import { useTypewriter } from '@/hooks/useTypewriter';
import { TagSuggestion } from '@/hooks/useProductSearch';
import { SearchHistoryItem } from '@/hooks/useSearchHistory';
import { SearchFavoriteItem } from '@/hooks/useSearchFavorite';
import { cn } from '@/lib/utils';
import { Star, History, Trash2, Edit2 } from 'lucide-react';

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

  // お気に入り機能用Props
  favorites?: SearchFavoriteItem[];
  onFavoriteSelect?: (item: SearchFavoriteItem) => void;
  onFavoriteDelete?: (itemId: string, e: React.SyntheticEvent) => void;
  onFavoriteRename?: (item: SearchFavoriteItem) => void;
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
    if (query.min_price && query.max_price) {
      parts.push(`価格: ¥${query.min_price}~¥${query.max_price}`);
    } else if (query.min_price) {
      parts.push(`価格: ¥${query.min_price}以上`);
    } else {
      parts.push(`価格: ¥${query.max_price}以下`);
    }
  }

  // 年齢制限
  if (Array.isArray(query.age_tags) && query.age_tags.length > 0) {
    parts.push(`年齢層: ${query.age_tags.join(', ')}`);
  } else if (typeof query.age_tags === 'string' && query.age_tags) {
    parts.push(`年齢層: ${query.age_tags}`);
  }

  // カテゴリ
  if (query.category || query.detailedFilters?.category) {
    parts.push(`カテゴリ: ${query.category || query.detailedFilters?.category}`);
  }

  // その他のフィルター
  const filters = [];
  if (query.liked) filters.push('いいね済み');
  if (query.owned) filters.push('所有');
  if (query.poly_tags) filters.push('PolySeekタグのみ');

  if (query.sort) {
    const sortLabel = query.sort === 'newest' ? '新着順' :
                      query.sort === 'price_asc' ? '価格が安い順' :
                      query.sort === 'price_desc' ? '価格が高い順' : query.sort;
    filters.push(`並び順: ${sortLabel}`);
  }

  if (filters.length > 0) parts.push(filters.join(', '));

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
  favorites = [],
  onFavoriteSelect,
  onFavoriteDelete,
  onFavoriteRename,
}) => {
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const [activeTab, setActiveTab] = React.useState<'history' | 'favorites'>('history');
  const historyListRef = React.useRef<HTMLDivElement>(null);

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
  }, [tagSuggestions, isSuggestionsVisible, searchQuery, searchHistory, favorites, activeTab]);

  const showSuggestions = isSuggestionsVisible && searchQuery.length > 0 && tagSuggestions.length > 0;
  // 履歴またはお気に入りを表示する条件: 入力が空で、フォーカスがあり、どちらかのデータが存在する
  const showHistoryOrFavorites = isSuggestionsVisible && searchQuery.length === 0 && (searchHistory.length > 0 || favorites.length > 0);

  // 表示するリストを決定
  const currentList = activeTab === 'history' ? searchHistory : favorites;
  // 履歴が空でお気に入りがある場合は自動的にお気に入りタブを表示（初期表示時のみ）
  React.useEffect(() => {
    if (isSuggestionsVisible && searchQuery.length === 0) {
      if (searchHistory.length === 0 && favorites.length > 0) {
        setActiveTab('favorites');
      } else if (searchHistory.length > 0 && favorites.length === 0) {
        setActiveTab('history');
      }
      // 両方ある、あるいは両方ない場合は維持（デフォルトはhistory）
    }
  }, [isSuggestionsVisible, searchQuery, searchHistory.length, favorites.length]);

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

    // 履歴/お気に入り表示時のキー操作
    if (showHistoryOrFavorites) {
      const listLength = currentList.length;

      if (e.key === 'Tab') {
        // Tabキーでタブ切り替え
        if (searchHistory.length > 0 && favorites.length > 0) {
          e.preventDefault();
          setActiveTab(prev => prev === 'history' ? 'favorites' : 'history');
        }
        return;
      }

      if (listLength === 0) {
         handleKeyDown(e);
         return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % listLength);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + listLength) % listLength);
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && activeIndex < listLength) {
          e.preventDefault();
          if (activeTab === 'history') {
            onHistorySelect?.(currentList[activeIndex] as SearchHistoryItem);
          } else {
            onFavoriteSelect?.(currentList[activeIndex] as SearchFavoriteItem);
          }
        } else {
          handleKeyDown(e);
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && e.shiftKey) {
        // Shift+Delete/Backspaceで削除
        if (activeIndex >= 0 && activeIndex < listLength) {
          e.preventDefault();
          if (activeTab === 'history') {
            onHistoryDelete?.(currentList[activeIndex].id, e);
          } else {
            onFavoriteDelete?.(currentList[activeIndex].id, e);
          }
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
    if (activeIndex >= 0) {
      // サジェスト表示時
      if (showSuggestions && suggestionsRef && 'current' in suggestionsRef && suggestionsRef.current) {
        const activeItem = suggestionsRef.current.children[activeIndex] as HTMLElement;
        if (activeItem) {
          activeItem.scrollIntoView({ block: 'nearest' });
        }
      }
      // 履歴/お気に入り表示時
      else if (showHistoryOrFavorites && historyListRef.current) {
        // ヘッダーがある場合はインデックスをずらす（タブヘッダー分）
        // タブヘッダーは1つ目の要素
        const targetIndex = activeIndex + 1;
        const targetItem = historyListRef.current.children[targetIndex] as HTMLElement;
        if (targetItem) {
          targetItem.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }, [activeIndex, showSuggestions, showHistoryOrFavorites, suggestionsRef]);

  return (
    <div className="relative flex-grow max-w-full" ref={searchContainerRef} id="tour-search-bar">
      <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 p-1 flex-wrap gap-1 min-h-[40px]">
        {selectedTags.map(tag => (
          <span key={tag} className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap">
            {tag}
            <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 text-blue-600 hover:text-blue-800" aria-label={`${tag}を削除`}>
              <X size={12} />
            </button>
          </span>
        ))}
        {selectedNegativeTags.map(tag => (
          <span key={`negative-${tag}`} className="flex items-center bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap">
            -{tag}
            <button type="button" onClick={() => handleRemoveTag(tag, true)} className="ml-1 text-red-600 hover:text-red-800" aria-label={`除外タグ ${tag}を削除`}>
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

      {/* 履歴・お気に入り表示 */}
      {showHistoryOrFavorites && (
        <div
          ref={historyListRef}
          id="search-history-list"
          role="listbox"
          tabIndex={-1}
          className="absolute z-20 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg"
        >
          {/* タブ切り替えヘッダー */}
          <div role="presentation" aria-hidden="true" className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-semibold text-center transition-colors",
                activeTab === 'history'
                  ? "text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-900"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <div className="flex items-center justify-center gap-1">
                <History size={12} />
                <span>履歴</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-semibold text-center transition-colors",
                activeTab === 'favorites'
                  ? "text-amber-600 border-b-2 border-amber-600 bg-white dark:bg-gray-900"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <div className="flex items-center justify-center gap-1">
                <Star size={12} />
                <span>お気に入り</span>
              </div>
            </button>
          </div>

          {currentList.length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-400 text-sm">
              {activeTab === 'history' ? '検索履歴はありません' : 'お気に入りは登録されていません'}
            </div>
          ) : (
            currentList.map((item, index) => (
              <div
                key={item.id}
                role="option"
                aria-selected={index === activeIndex}
                tabIndex={index === activeIndex ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (activeTab === 'history') {
                      onHistorySelect?.(item as SearchHistoryItem);
                    } else {
                      onFavoriteSelect?.(item as SearchFavoriteItem);
                    }
                  }
                }}
                onClick={() => {
                  if (activeTab === 'history') {
                    onHistorySelect?.(item as SearchHistoryItem);
                  } else {
                    onFavoriteSelect?.(item as SearchFavoriteItem);
                  }
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center group ${
                  index === activeIndex ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-grow">
                  {activeTab === 'history' ? (
                    <Clock size={14} className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <Star size={14} className="text-amber-400 flex-shrink-0 fill-amber-400" />
                  )}
                  <span className="truncate text-gray-700 dark:text-gray-300">
                    {activeTab === 'history'
                      ? formatHistoryQuery((item as SearchHistoryItem).query)
                      : (
                        <span className="flex flex-col">
                          <span className="font-medium">{(item as SearchFavoriteItem).name}</span>
                          <span className="text-xs text-gray-400 truncate">
                            {formatHistoryQuery((item as SearchFavoriteItem).query)}
                          </span>
                        </span>
                      )
                    }
                  </span>
                </div>

                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {activeTab === 'favorites' && onFavoriteRename && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFavoriteRename(item as SearchFavoriteItem);
                      }}
                      className="text-gray-400 hover:text-blue-500 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-1"
                      title="名前を変更"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeTab === 'history') {
                        onHistoryDelete?.(item.id, e);
                      } else {
                        onFavoriteDelete?.(item.id, e);
                      }
                    }}
                    className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                    title={activeTab === 'history' ? "履歴から削除" : "お気に入りから削除"}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
