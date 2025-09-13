"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Filter, X } from 'lucide-react';

interface FilterSidebarProps {
  isFilterSidebarOpen: boolean;
  setIsFilterSidebarOpen: (isOpen: boolean) => void;
  ageRatingTags: { id: string; name: string; color?: string | null }[];
  categoryTags: { id: string; name: string; color?: string | null }[];
  featureTags: { id: string; name: string; color?: string | null }[];
  selectedAgeRatingTags: string[];
  setSelectedAgeRatingTags: (tags: string[]) => void;
  detailedFilters: { category: string | null };
  handleDetailedFilterChange: (filterType: 'category', value: string | null) => void;
  isFeatureTagSelected: (feature: string) => boolean;
  isNegativeTagSelected: (tag: string) => boolean;
  handleAddTag: (tag: string) => void;
  handleRemoveTag: (tag: string, isNegative?: boolean) => void;
  priceRange: [number, number];
  setPriceRange: (value: [number, number]) => void;
  isHighPriceFilterEnabled: boolean;
  setIsHighPriceFilterEnabled: (isEnabled: boolean) => void;
  isLiked: boolean;
  setIsLiked: (isLiked: boolean) => void;
  isOwned: boolean;
  setIsOwned: (isOwned: boolean) => void;
  clearAllTagsAndFilters: () => void;
  applyFiltersAndSearch: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isFilterSidebarOpen,
  setIsFilterSidebarOpen,
  ageRatingTags,
  categoryTags,
  featureTags,
  selectedAgeRatingTags,
  setSelectedAgeRatingTags,
  detailedFilters,
  handleDetailedFilterChange,
  isFeatureTagSelected,
  isNegativeTagSelected,
  handleAddTag,
  handleRemoveTag,
  priceRange,
  setPriceRange,
  isHighPriceFilterEnabled,
  setIsHighPriceFilterEnabled,
  isLiked,
  setIsLiked,
  isOwned,
  setIsOwned,
  clearAllTagsAndFilters,
  applyFiltersAndSearch,
}) => {
  return (
    <Sheet open={isFilterSidebarOpen} onOpenChange={setIsFilterSidebarOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
          <Filter className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>フィルター</SheetTitle>
          <SheetDescription>
            条件を選択して製品を絞り込みます。
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-grow py-4 pr-6">
          <div className="space-y-4">
            {/* Quick Filters (Inside Sheet for Mobile) */}
            <div className="md:hidden space-y-4">
              <div>
                <h4 className="font-medium mb-2 text-sm">対象年齢</h4>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-sm">
                      {selectedAgeRatingTags.length > 0
                        ? `対象年齢: ${selectedAgeRatingTags.map(tagId => ageRatingTags.find(t => t.name === tagId)?.name || tagId).join(', ')}`
                        : "対象年齢"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                    {ageRatingTags.map(tag => (
                      <DropdownMenuItem key={tag.id} onSelect={(e) => e.preventDefault()}>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`mobile-age-rating-${tag.id}`}
                            checked={selectedAgeRatingTags.includes(tag.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAgeRatingTags([...selectedAgeRatingTags, tag.name]);
                              } else {
                                setSelectedAgeRatingTags(selectedAgeRatingTags.filter(name => name !== tag.name));
                              }
                            }}
                          />
                          <label htmlFor={`mobile-age-rating-${tag.id}`} className="text-sm font-medium leading-none">
                            {tag.name}
                          </label>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {selectedAgeRatingTags.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setSelectedAgeRatingTags([])} className="text-red-600 text-sm">クリア</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-sm">主要機能</h4>
                <div className="flex flex-wrap gap-2">
                  {featureTags.map(tag => (
                    <Button
                      key={tag.id}
                      variant={isFeatureTagSelected(tag.name) ? 'default' : isNegativeTagSelected(tag.name) ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (isFeatureTagSelected(tag.name)) {
                          handleRemoveTag(tag.name, false);
                        } else if (isNegativeTagSelected(tag.name)) {
                          handleRemoveTag(tag.name, true);
                        } else {
                          handleAddTag(tag.name);
                        }
                      }}
                      className={`text-xs ${isNegativeTagSelected(tag.name) ? 'line-through' : ''}`}
                    >
                      {tag.name}
                    </Button>
                  ))}
                </div>
              </div>
              <hr className="my-4" />
            </div>

            {/* Detailed Filters (Always in Sheet) */}
            <div>
              <h4 className="font-medium mb-2 text-sm">カテゴリ</h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-sm">
                    {detailedFilters.category || "選択してください"}
                    {detailedFilters.category && <X size={14} className="ml-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDetailedFilterChange('category', null); }} />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  {categoryTags.map(tag => (
                    <DropdownMenuItem key={tag.id} onSelect={() => handleDetailedFilterChange('category', tag.name)} className="text-sm">
                      {tag.name}
                    </DropdownMenuItem>
                  ))}
                  {detailedFilters.category && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => handleDetailedFilterChange('category', null)} className="text-red-600 text-sm">クリア</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <h4 className="font-medium mb-2 text-sm">価格帯</h4>
              <div className="flex items-center space-x-2 px-2 mb-4">
                <Checkbox
                  id="high-price-filter"
                  checked={isHighPriceFilterEnabled}
                  onCheckedChange={(checked) => setIsHighPriceFilterEnabled(!!checked)}
                />
                <label htmlFor="high-price-filter" className="text-sm font-medium">
                  高額商品のみ (10000円以上)
                </label>
              </div>
              <div className="px-2">
                <Slider
                  min={isHighPriceFilterEnabled ? 10000 : 0}
                  max={isHighPriceFilterEnabled ? 100000 : 10000}
                  step={isHighPriceFilterEnabled ? 1000 : 100}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  className="w-full"
                />
                <div className="flex justify-between text-xs mt-2">
                  <span>{priceRange[0]}円</span>
                  <span>
                    {isHighPriceFilterEnabled && priceRange[1] >= 100000
                      ? '100000円以上'
                      : priceRange[1] >= 10000
                      ? '10000円以上'
                      : priceRange[1] + '円'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2 text-sm">マイフィルター</h4>
              <div className="flex items-center space-x-2 px-2 mb-2">
                <Checkbox
                  id="liked-filter"
                  checked={isLiked}
                  onCheckedChange={(checked) => setIsLiked(!!checked)}
                />
                <label htmlFor="liked-filter" className="text-sm font-medium">
                  いいね済み
                </label>
              </div>
              <div className="flex items-center space-x-2 px-2">
                <Checkbox
                  id="owned-filter"
                  checked={isOwned}
                  onCheckedChange={(checked) => setIsOwned(!!checked)}
                />
                <label htmlFor="owned-filter" className="text-sm font-medium">
                  所有済み
                </label>
              </div>
            </div>
          </div>
        </ScrollArea>
        <SheetFooter className="mt-auto pt-4 border-t">
          <Button variant="ghost" onClick={clearAllTagsAndFilters} className="mr-auto">すべてクリア</Button>
          <SheetClose asChild>
            <Button onClick={applyFiltersAndSearch}>フィルターを適用</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
