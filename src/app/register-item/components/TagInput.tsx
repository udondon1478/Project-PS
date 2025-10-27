'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  disabled?: boolean;
  id?: string;
}

export const TagInput = ({ value: tags, onChange: setTags, disabled, id }: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchSuggestions = async () => {
      if (inputValue.length > 0 && !isComposing) {
        try {
          const encodedQuery = encodeURIComponent(inputValue);
          const response = await fetch(`/api/tags/search?query=${encodedQuery}`, { signal });
          if (response.ok) {
            const data = await response.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tagNames = data.map((tag: any) => tag.name);
            setSuggestions(tagNames);
          } else {
            setSuggestions([]);
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            // Fetch was aborted, which is expected. Do nothing.
          } else {
            console.error('Failed to fetch tag suggestions:', error);
            setSuggestions([]);
          }
        }
      } else {
        setSuggestions([]);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [inputValue, isComposing]);

  const addTag = (tagToAdd: string) => {
    const trimmedTag = tagToAdd.trim();
    if (trimmedTag) {
      setTags((prev) => (prev.includes(trimmedTag) ? prev : [...prev, trimmedTag]));
    }
    setInputValue(() => '');
    setSuggestions(() => []);
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return;

    if ((e.key === 'Enter' || e.key === 'Tab') && inputValue) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div>
      <div
        className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]"
        onClick={() => !disabled && inputRef.current?.focus()}
        role="group"
        aria-label="tags input"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.focus();
          }
        }}
      >
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full hover:bg-muted-foreground/20 p-0.5"
              disabled={disabled}
              aria-label={`Remove tag ${tag}`}
            >
              <X size={12} />
            </button>
          </Badge>
        ))}
        <Input
          id={id}
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={tags.length === 0 ? 'タグを入力...' : ''}
          className="flex-1 bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
          disabled={disabled}
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="mt-2 border rounded-md bg-background list-none p-0">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => addTag(suggestion)}
                className="w-full text-left p-2 hover:bg-muted text-sm rounded-md"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};