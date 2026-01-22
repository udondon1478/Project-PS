"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { X } from 'lucide-react';
import { AGE_RATING_WHITELIST } from '@/lib/constants';

interface QuickFiltersProps {
  ageRatingTags: { id: string; name: string; displayName?: string; color?: string | null }[];
  featureTags: { id: string; name: string; displayName?: string; color?: string | null }[];
  selectedAgeRatingTags: string[];
  setSelectedAgeRatingTags: (tags: string[]) => void;
  isFeatureTagSelected: (feature: string) => boolean;
  isNegativeTagSelected: (tag: string) => boolean;
  handleAddTag: (tag: string) => void;
  handleRemoveTag: (tag: string, isNegative?: boolean) => void;
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({
  ageRatingTags,
  featureTags,
  selectedAgeRatingTags,
  setSelectedAgeRatingTags,
  isFeatureTagSelected,
  isNegativeTagSelected,
  handleAddTag,
  handleRemoveTag,
}) => {
  const ageRatingLookup = React.useMemo(() => new Map(ageRatingTags.map(t => [t.name, t])), [ageRatingTags]);

  // Filter and sort age rating tags based on whitelist
  // Only show tags in AGE_RATING_WHITELIST, in the order defined by the whitelist
  const filteredAgeRatingTags = React.useMemo(() => {
    return AGE_RATING_WHITELIST
      .map(name => ageRatingTags.find(tag => tag.name === name))
      .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);
  }, [ageRatingTags]);

  const label = React.useMemo(() =>
      selectedAgeRatingTags.map(tagName => {
          const t = ageRatingLookup.get(tagName);
          return t?.displayName || t?.name || tagName;
      }).join(', '),
      [selectedAgeRatingTags, ageRatingLookup]
  );

  return (
    <div className="hidden md:flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-sm whitespace-nowrap">
            {selectedAgeRatingTags.length > 0
              ? `対象年齢: ${label}`
              : "対象年齢"}
          </Button>



        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>対象年齢</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {filteredAgeRatingTags.map(tag => (
            <DropdownMenuItem key={tag.id} onSelect={(e) => e.preventDefault()}>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`age-rating-${tag.id}`}
                  checked={selectedAgeRatingTags.includes(tag.name)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedAgeRatingTags([...selectedAgeRatingTags, tag.name]);
                    } else {
                      setSelectedAgeRatingTags(selectedAgeRatingTags.filter(name => name !== tag.name));
                    }
                  }}
                />
                <label
                  htmlFor={`age-rating-${tag.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {tag.displayName || tag.name}
                </label>
              </div>
            </DropdownMenuItem>
          ))}
          {selectedAgeRatingTags.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setSelectedAgeRatingTags([])} className="text-red-600">クリア</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-sm whitespace-nowrap">
            主要機能
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>主要機能を選択/解除</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {featureTags.map(tag => (
            <DropdownMenuItem
              key={tag.id}
              onSelect={() => {
                if (isFeatureTagSelected(tag.name)) {
                  handleRemoveTag(tag.name, false);
                } else if (isNegativeTagSelected(tag.name)) {
                  handleRemoveTag(tag.name, true);
                } else {
                  handleAddTag(tag.name);
                }
              }}
              className={`${isFeatureTagSelected(tag.name) ? 'bg-accent' : isNegativeTagSelected(tag.name) ? 'bg-red-200 line-through' : ''}`}
            >
              {tag.displayName || tag.name} {isFeatureTagSelected(tag.name) || isNegativeTagSelected(tag.name) ? <X size={14} className="ml-auto" /> : ''}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
