"use client";

import React, { useState, useEffect, useRef } from 'react';
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
const priceRanges = ["無料", "¥1-¥999", "¥1000-¥2999", "¥3000-¥4999", "¥5000以上"];

export default function ProductSearch() {
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

  // 新しい状態変数を追加 (カテゴリの色情報を含むように型を変更)
  const [ageRatingTags, setAgeRatingTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [categoryTags, setCategoryTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [featureTags, setFeatureTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);

  // 対象年齢、カテゴリー、主要機能タグの選択肢をフェッチ
  useEffect(() => {
    const fetchTagsByType = async () => {
      try {
        // 対象年齢タグを取得
        const ageRatingsResponse = await fetch('/api/tags/by-type?categoryName=対象年齢');
        const ageRatingData = await ageRatingsResponse.json();
        if (ageRatingsResponse.ok) {
          // APIレスポンスの形式に合わせてデータを変換
          setAgeRatingTags(ageRatingData.map((tag: { id: string; name: string; tagCategory?: { id: string; name: string; color: string } | null }) => ({
            id: tag.id,
            name: tag.name,
            color: tag.tagCategory?.color || null, // カテゴリの色を取得
          })));
        } else {
          console.error('Failed to fetch age rating tags:', ageRatingData.message);
        }

        // カテゴリータグを取得
        const categoriesResponse = await fetch('/api/tags/by-type?categoryName=プロダクトカテゴリ');
        const categoryData = await categoriesResponse.json();
        if (categoriesResponse.ok) {
           // APIレスポンスの形式に合わせてデータを変換
          setCategoryTags(categoryData.map((tag: { id: string; name: string; tagCategory?: { id: string; name: string; color: string } | null }) => ({
            id: tag.id,
            name: tag.name,
            color: tag.tagCategory?.color || null, // カテゴリの色を取得
          })));
        } else {
          console.error('Failed to fetch category tags:', categoryData.message);
        }

        // 主要機能タグを取得
        const featuresResponse = await fetch('/api/tags/by-type?categoryName=主要機能');
        const featureData = await featuresResponse.json();
        if (featuresResponse.ok) {
           // APIレスポンスの形式に合わせてデータを変換
          setFeatureTags(featureData.map((tag: { id: string; name: string; tagCategory?: { id: string; name: string; color: string } | null }) => ({
            id: tag.id,
            name: tag.name,
            color: tag.tagCategory?.color || null, // カテゴリの色を取得
          })));
        } else {
          console.error('Failed to fetch feature tags:', featureData.message);
        }

      } catch (error) {
        console.error('Error fetching tags by type:', error);
      }
    };

    fetchTagsByType();
  }, []); // コンポーネントマウント時に一度だけ実行

  // Fetch tag suggestions based on input with debounce
  useEffect(() => {
    if (searchQuery.length === 0) {
      setTagSuggestions([]);
      setIsSuggestionsVisible(false);
      return;
    }

    const timerId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/tags/search?query=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // APIはTagオブジェクトの配列を返すので、nameプロパティを抽出してフィルタリング
        const filteredSuggestions = data
          .map((tag: { name: string }) => tag.name) // nameプロパティを抽出
          .filter((tagName: string) => !selectedTags.includes(tagName)); // 選択済みのタグを除外

        setTagSuggestions(filteredSuggestions);
        setIsSuggestionsVisible(filteredSuggestions.length > 0);
      } catch (error) {
        console.error("Error fetching tag suggestions:", error);
        setTagSuggestions([]);
        setIsSuggestionsVisible(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timerId);
  }, [searchQuery, selectedTags]); // selectedTagsも依存配列に追加

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
      // ageRatingTags配列に含まれるタグ名を持つタグが既にあれば削除してから追加
      const ageRatingTagNames = ageRatingTags.map(tag => tag.name);
      if (ageRatingTagNames.includes(tag)) {
        const existingAgeTag = selectedTags.find(t => ageRatingTagNames.includes(t));
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
    // 半角スペースでタグを確定
    if (event.key === ' ' && searchQuery.trim() !== '') {
      event.preventDefault(); // スペースが入力フィールドに入らないようにする
      handleAddTag(searchQuery.trim()); // 入力値をタグとして追加
    } else if (event.key === 'Enter') {
       event.preventDefault();
      // 候補が表示されていて、候補リストに要素がある場合
      if (isSuggestionsVisible && tagSuggestions.length > 0) {
        handleAddTag(tagSuggestions[0]); // 最上位の候補を追加
      } else if (searchQuery) { // 候補がない、または表示されていないが、入力がある場合
        // APIから取得したタグ候補の中に完全一致があるか確認
        const exactMatch = tagSuggestions.find(tag =>
          tag.toLowerCase() === searchQuery.toLowerCase()
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

    const queryParams = new URLSearchParams();
    if (selectedTags.length > 0) {
      queryParams.append("tags", selectedTags.join(','));
    }
    if (detailedFilters.category) {
      // カテゴリーはIDではなく名前で検索することを想定
      // 必要であれば、カテゴリー名からIDを取得する処理を追加
      queryParams.append("categoryName", detailedFilters.category);
    }
    // 価格帯フィルターも必要であればここに追加

    router.push(`/search?${queryParams.toString()}`);
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
  const getCurrentAgeTag = () => selectedTags.find(tag => ageRatingTags.map(t => t.name).includes(tag));
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
              {ageRatingTags.map(tag => ( // ageRatingTagsを使用
                <DropdownMenuItem key={tag.id} onSelect={() => handleAddTag(tag.name)} disabled={selectedTags.includes(tag.name)}>
                  {tag.name}
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
              {featureTags.map(tag => ( // featureTagsを使用
                <DropdownMenuItem
                  key={tag.id}
                  onSelect={() => isFeatureTagSelected(tag.name) ? handleRemoveTag(tag.name) : handleAddTag(tag.name)}
                  className={`${isFeatureTagSelected(tag.name) ? 'bg-accent' : ''}`} // Highlight selected
                >
                  {tag.name} {isFeatureTagSelected(tag.name) ? <X size={14} className="ml-auto" /> : ''}
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
                         {ageRatingTags.map(tag => ( // ageRatingTagsを使用
                           <DropdownMenuItem key={tag.id} onSelect={() => handleAddTag(tag.name)} disabled={selectedTags.includes(tag.name)} className="text-sm">
                             {tag.name}
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
                        {featureTags.map(tag => ( // featureTagsを使用
                            <Button
                                key={tag.id}
                                variant={isFeatureTagSelected(tag.name) ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => isFeatureTagSelected(tag.name) ? handleRemoveTag(tag.name) : handleAddTag(tag.name)}
                                className="text-xs"
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
                      {categoryTags.map(tag => ( // categoryTagsを使用
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