'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';

interface Tag {
  id: string;
  name: string;
  displayName: string | null;
}

interface TagSearchAutocompleteProps {
  value: Tag | null;
  onChange: (tag: Tag | null) => void;
  placeholder?: string;
}

export default function TagSearchAutocomplete({
  value,
  onChange,
  placeholder = 'タグを検索...',
}: TagSearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tags/search?query=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions(debouncedQuery);
  }, [debouncedQuery, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (tag: Tag) => {
    onChange(tag);
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        handleSelect(suggestions[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-800">
        <span className="text-sm">{value.displayName || value.name}</span>
        <button
          type="button"
          onClick={handleClear}
          className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {isOpen && (query.trim() || isLoading) && (
        <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          {isLoading && (
            <li className="px-3 py-2 text-sm text-gray-500">検索中...</li>
          )}
          {!isLoading && suggestions.length === 0 && query.trim() && (
            <li className="px-3 py-2 text-sm text-gray-500">該当するタグがありません</li>
          )}
          {suggestions.map((tag, index) => (
            <li
              key={tag.id}
              onClick={() => handleSelect(tag)}
              onMouseEnter={() => setHighlightIndex(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === highlightIndex
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {tag.displayName || tag.name}
              {tag.displayName && (
                <span className="ml-2 text-xs text-gray-400">({tag.name})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
