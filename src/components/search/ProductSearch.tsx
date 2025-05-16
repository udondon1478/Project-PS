"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { useRouter } from 'next/navigation'; // useRouterを追加

// Placeholder for tag suggestions - include age ratings and features
// const allTags: string[] = []; // 重複定義のためコメントアウト

// Define options for dropdowns
const ageRatings = ["全年齢", "R-15", "R-18"];
const features = ["Quest対応", "PhysBone対応", "Modular Avatar対応", "SDK3", "SDK2"];
const categories = ["アバター", "衣装", "アクセサリー", "ワールド", "ギミック", "ツール", "素材", "その他"];
const priceRanges = ["無料", "¥1-¥999", "¥1000-¥2999", "¥3000-¥4999", "¥5000以上"];

export default function ProductSearch() {
  const [allTags, setAllTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [detailedFilters, setDetailedFilters] = useState({
    category: null as string | null,
    priceRange: null as string | null,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter(); // useRouterを初期化
  const suggestionsRef = useRef<HTMLUListElement>(null);

  // Fetch tag suggestions based on input
  useEffect(() => {
    console.log("useEffect for fetching tags is running"); // デバッグ出力：フック実行開始
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched allTags successfully:", data); // デバッグ出力：成功
        setAllTags(data);
      } catch (error) {
        console.error("Error fetching allTags:", error); // デバッグ出力：失敗
      }
    };

    fetchTags();
  }, []);

  const debouncedSetTagSuggestions = useCallback(
    (query: string) => {
      if (query.length > 0) {
        const filtered = allTags.filter(tag =>
          tag?.toLowerCase().includes(query.toLowerCase()) && !selectedTags.includes(tag)
        );
        console.log("Tag suggestions for query:", query, filtered); // デバッグ出力
        setTagSuggestions(filtered);
        setIsSuggestionsVisible(true);
      } else {
        console.log("Clearing tag suggestions for query:", query); // デバッグ出力
        setTagSuggestions([]);
        setIsSuggestionsVisible(false);
      }
    },
    [allTags, selectedTags]
  );

  useEffect(() => {
    const timerId = setTimeout(() => {
      debouncedSetTagSuggestions(searchQuery);
    }, 300);

    return () => clearTimeout(timerId);
  }, [searchQuery, debouncedSetTagSuggestions, allTags, selectedTags]);

  // Handle clicking outside the search input and suggestions list
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchInputRef.current && !searchInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)
      ) {
        setIsSuggestionsVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      // Ensure only one age rating tag is selected at a time
      if (ageRatings.includes(tag)) {
        const existingAgeTag = selectedTags.find(t => ageRatings.includes(t));
        if (existingAgeTag) {
          setSelectedTags(prev => [...prev.filter(t => t !== existingAgeTag), tag]);
        } else {
          setSelectedTags(prev => [...prev, tag]);
        }
      } else {
         setSelectedTags(prev => [...prev, tag]);
      }
    }
    setSearchQuery(''); // Clear input after adding tag
    setTagSuggestions([]);
    setIsSuggestionsVisible(false);
    searchInputRef.current?.focus(); // Keep focus on input
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
       event.preventDefault();
      // 候補が表示されていて、候補リストに要素がある場合
      if (isSuggestionsVisible && tagSuggestions.length > 0) {
        handleAddTag(tagSuggestions[0]); // 最上位の候補を追加
      } else if (searchQuery) { // 候補がない、または表示されていないが、入力がある場合
        const exactMatch = allTags.find(tag =>
          tag.toLowerCase() === searchQuery.toLowerCase() && !selectedTags.includes(tag)
        );
        if (exactMatch) {
          handleAddTag(exactMatch); // 完全一致があればそれを追加
        } else {
          handleAddTag(searchQuery); // 完全一致がなければ入力値をタグとして追加
        }
      } else { // 候補がなく、入力もない場合
         handleSearch(); // 現在の選択タグで検索
      }
    } else if (event.key === 'Backspace' && searchQuery === '' && selectedTags.length > 0) {
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    }
  };

  const handleSearch = () => {
    setIsFilterSidebarOpen(false);
    console.log("Searching with:", {
      tags: selectedTags, // Now includes age/feature tags
      detailedFilters,
    });
    // Example: router.push(`/search?tags=${selectedTags.join(',')}&category=${detailedFilters.category}&price=${detailedFilters.priceRange}`);
    router.push(`/search?tags=${selectedTags.join(',')}`); // 検索キーワードを渡すように修正
  };

  const handleDetailedFilterChange = (filterType: keyof typeof detailedFilters, value: string | null) => {
    setDetailedFilters(prev => ({ ...prev, [filterType]: value }));
  };

   const clearAllTagsAndFilters = () => {
    setSelectedTags([]);
    setDetailedFilters({ category: null, priceRange: null });
  };


  const applyFiltersAndSearch = () => {
     handleSearch();
     setIsFilterSidebarOpen(false);
  };

  // Helper to get the currently selected age rating tag
  const getCurrentAgeTag = () => selectedTags.find(tag => ageRatings.includes(tag));
  // Helper to check if a specific feature tag is selected
  const isFeatureTagSelected = (feature: string) => selectedTags.includes(feature);


  return (
    <div className="p-4 bg-gray-100 border-b border-gray-200">
      <div className="container mx-auto flex items-center gap-2 md:gap-4">
        {/* Search Bar and Tag Input */}
        <div className="relative flex-grow" ref={searchInputRef}>
          <div className="flex items-center border border-gray-300 rounded-md bg-white p-1 flex-wrap gap-1 min-h-[40px]">
            <Search className="h-5 w-5 text-gray-400 mx-1 flex-shrink-0" />
            {selectedTags.map(tag => (
              <span key={tag} className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="ml-1 text-blue-600 hover:text-blue-800">
                  <X size={12} />
                </button>
              </span>
            ))}
            <Input
              type="text"
              placeholder="タグで検索..."
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => searchQuery.length > 0 && setIsSuggestionsVisible(true)}
              className="flex-grow border-none focus:ring-0 focus:outline-none p-1 h-auto text-sm min-w-[100px]"
            />
          </div>
          {isSuggestionsVisible && tagSuggestions.length > 0 && (
            <ul ref={suggestionsRef} className="absolute z-20 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
              {tagSuggestions.map(tag => (
                <li
                  key={tag}
                  onClick={() => handleAddTag(tag)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Filters (Desktop Only) - Now add tags instead of setting state */}
        <div className="hidden md:flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-sm whitespace-nowrap">
                {getCurrentAgeTag() || "対象年齢"}
                {getCurrentAgeTag() && <X size={14} className="ml-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleRemoveTag(getCurrentAgeTag()!); }} />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>対象年齢を選択</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ageRatings.map(rating => (
                <DropdownMenuItem key={rating} onSelect={() => handleAddTag(rating)} disabled={selectedTags.includes(rating)}>
                  {rating}
                </DropdownMenuItem>
              ))}
               {getCurrentAgeTag() && (
                 <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleRemoveTag(getCurrentAgeTag()!)} className="text-red-600">クリア</DropdownMenuItem>
                 </>
               )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
               {/* Show a summary or fixed text for features */}
              <Button variant="outline" size="sm" className="text-sm whitespace-nowrap">
                主要機能
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>主要機能を選択/解除</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {features.map(feature => (
                <DropdownMenuItem
                  key={feature}
                  onSelect={() => isFeatureTagSelected(feature) ? handleRemoveTag(feature) : handleAddTag(feature)}
                  className={`${isFeatureTagSelected(feature) ? 'bg-accent' : ''}`} // Highlight selected
                >
                  {feature} {isFeatureTagSelected(feature) ? <X size={14} className="ml-auto" /> : ''}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filter Trigger (Sheet) - Common for Mobile and Desktop */}
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
                           {getCurrentAgeTag() || "選択してください"}
                           {getCurrentAgeTag() && <X size={14} className="ml-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); handleRemoveTag(getCurrentAgeTag()!); }} />}
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                         {ageRatings.map(rating => (
                           <DropdownMenuItem key={rating} onSelect={() => handleAddTag(rating)} disabled={selectedTags.includes(rating)} className="text-sm">
                             {rating}
                           </DropdownMenuItem>
                         ))}
                         {getCurrentAgeTag() && (
                           <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleRemoveTag(getCurrentAgeTag()!)} className="text-red-600 text-sm">クリア</DropdownMenuItem>
                           </>
                         )}
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </div>
                   <div>
                     <h4 className="font-medium mb-2 text-sm">主要機能</h4>
                     {/* Use buttons for multi-select in mobile sheet */}
                     <div className="flex flex-wrap gap-2">
                        {features.map(feature => (
                            <Button
                                key={feature}
                                variant={isFeatureTagSelected(feature) ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => isFeatureTagSelected(feature) ? handleRemoveTag(feature) : handleAddTag(feature)}
                                className="text-xs"
                            >
                                {feature}
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
                      {categories.map(cat => (
                        <DropdownMenuItem key={cat} onSelect={() => handleDetailedFilterChange('category', cat)} className="text-sm">
                          {cat}
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-sm">
                        {detailedFilters.priceRange || "選択してください"}
                        {detailedFilters.priceRange && <X size={14} className="ml-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDetailedFilterChange('priceRange', null); }} />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                      {priceRanges.map(range => (
                        <DropdownMenuItem key={range} onSelect={() => handleDetailedFilterChange('priceRange', range)} className="text-sm">
                          {range}
                        </DropdownMenuItem>
                      ))}
                       {detailedFilters.priceRange && (
                         <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => handleDetailedFilterChange('priceRange', null)} className="text-red-600 text-sm">クリア</DropdownMenuItem>
                         </>
                       )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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

        {/* Search Button (Desktop Only Text) */}
        <Button onClick={handleSearch} size="sm" className="hidden md:inline-flex">
          検索
        </Button>

      </div>
    </div>
  );
}