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
  const [selectedNegativeTags, setSelectedNegativeTags] = useState<string[]>([]); // マイナス検索用タグを追加
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
        const ageRatingsResponse = await fetch('/api/tags/by-type?categoryNames=age_rating');
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
        const categoriesResponse = await fetch('/api/tags/by-type?categoryNames=product_category');
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
        const featuresResponse = await fetch('/api/tags/by-type?categoryNames=feature');
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

  // セッションストレージからタグを読み込む (コンポーネントマウント時)
  // セッションストレージからタグを読み込む (コンポーネントマウント時)
  useEffect(() => {
    const savedTags = sessionStorage.getItem('polyseek-search-tags');
    const savedNegativeTags = sessionStorage.getItem('polyseek-search-negative-tags'); // マイナス検索タグも読み込む

    if (savedTags) {
      try {
        const parsedTags = JSON.parse(savedTags);
        if (Array.isArray(parsedTags)) {
          setSelectedTags(parsedTags);
        }
      } catch (error) {
        console.error("Failed to parse tags from sessionStorage:", error);
      }
    }

    if (savedNegativeTags) { // マイナス検索タグの読み込み
      try {
        const parsedNegativeTags = JSON.parse(savedNegativeTags);
        if (Array.isArray(parsedNegativeTags)) {
          setSelectedNegativeTags(parsedNegativeTags);
        }
      } catch (error) {
        console.error("Failed to parse negative tags from sessionStorage:", error);
      }
    }

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
          .filter((tagName: string) =>
            !selectedTags.includes(tagName) && !selectedNegativeTags.includes(tagName) // 選択済みの通常タグとマイナス検索タグを除外
          );
 
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


  // selectedTagsとselectedNegativeTagsが変更されたらセッションストレージに保存
  useEffect(() => {
    sessionStorage.setItem('polyseek-search-tags', JSON.stringify(selectedTags));
    sessionStorage.setItem('polyseek-search-negative-tags', JSON.stringify(selectedNegativeTags)); // マイナス検索タグも保存
  }, [selectedTags, selectedNegativeTags]); // 両方のステートを依存配列に追加

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag === '') return;

    const isNegative = trimmedTag.startsWith('-');
    const tagName = isNegative ? trimmedTag.substring(1) : trimmedTag;

    if (tagName === '') return; // プレフィックスのみの場合は追加しない

    // 既に通常タグまたはマイナス検索タグとして追加されていないか確認
    if (selectedTags.includes(tagName) || selectedNegativeTags.includes(tagName)) {
      setSearchQuery('');
      setTagSuggestions([]);
      setIsSuggestionsVisible(false);
      searchInputRef.current?.focus();
      return;
    }

    if (isNegative) {
      // マイナス検索タグとして追加
      setSelectedNegativeTags(prev => [...prev, tagName]);
    } else {
      // 通常タグとして追加
      // 対象年齢タグの場合は一つだけ選択可能にするロジックを維持
      const ageRatingTagNames = ageRatingTags.map(tag => tag.name);
      if (ageRatingTagNames.includes(tagName)) {
        const existingAgeTag = selectedTags.find(t => ageRatingTagNames.includes(t));
        if (existingAgeTag) {
          setSelectedTags(prev => [...prev.filter(t => t !== existingAgeTag), tagName]);
        } else {
          setSelectedTags(prev => [...prev, tagName]);
        }
      } else {
        setSelectedTags(prev => [...prev, tagName]);
      }
    }

    setSearchQuery(''); // Clear input after adding tag
    setTagSuggestions([]);
    setIsSuggestionsVisible(false);
    searchInputRef.current?.focus(); // Keep focus on input
  };

  const handleRemoveTag = (tagToRemove: string, isNegative: boolean = false) => {
    if (isNegative) {
      setSelectedNegativeTags(selectedNegativeTags.filter(tag => tag !== tagToRemove));
    } else {
      setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const trimmedQuery = searchQuery.trim();
    // 半角スペースまたはEnterでタグを確定
    if ((event.key === ' ' || event.key === 'Enter') && trimmedQuery !== '') {
      event.preventDefault(); // スペースやEnterが入力フィールドに入らないようにする

      const isNegative = trimmedQuery.startsWith('-');
      const tagName = isNegative ? trimmedQuery.substring(1) : trimmedQuery;

      if (tagName === '') return; // プレフィックスのみの場合は追加しない

      // 候補が表示されていて、候補リストに要素がある場合 (Enterキーの場合のみ候補から追加)
      if (event.key === 'Enter' && isSuggestionsVisible && tagSuggestions.length > 0) {
         // 候補の最初の要素にプレフィックスを付けてhandleAddTagに渡す
         const tagToAdd = isNegative ? `-${tagSuggestions[0]}` : tagSuggestions[0];
         handleAddTag(tagToAdd);
      } else { // 候補がない、または表示されていない、またはスペースキーの場合
         // 入力値をタグとして追加
         handleAddTag(trimmedQuery);
      }

    } else if (event.key === 'Backspace' && searchQuery === '' && (selectedTags.length > 0 || selectedNegativeTags.length > 0)) {
      // 入力フィールドが空で、タグが選択されている場合にBackspaceで最後のタグを削除
      if (selectedNegativeTags.length > 0) {
        handleRemoveTag(selectedNegativeTags[selectedNegativeTags.length - 1], true);
      } else if (selectedTags.length > 0) {
        handleRemoveTag(selectedTags[selectedTags.length - 1], false);
      }
    }
  };

  const handleSearch = () => {
    setIsFilterSidebarOpen(false);
    console.log("Searching with:", {
      tags: selectedTags,
      negativeTags: selectedNegativeTags, // マイナス検索タグを追加
      detailedFilters,
    });

    const queryParams = new URLSearchParams();
    if (selectedTags.length > 0) {
      queryParams.append("tags", selectedTags.join(','));
    }
    if (selectedNegativeTags.length > 0) { // マイナス検索タグをクエリパラメータに追加
      queryParams.append("negativeTags", selectedNegativeTags.join(','));
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
    setSelectedNegativeTags([]); // マイナス検索タグもクリア
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
  // Helper to check if a specific negative tag is selected
  const isNegativeTagSelected = (tag: string) => selectedNegativeTags.includes(tag);


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
            {selectedNegativeTags.map(tag => ( // マイナス検索タグの表示
              <span key={`negative-${tag}`} className="flex items-center bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap line-through"> {/* 取り消し線を追加 */}
                -{tag} {/* プレフィックスを付けて表示 */}
                <button onClick={() => handleRemoveTag(tag, true)} className="ml-1 text-red-600 hover:text-red-800">
                  <X size={12} />
                </button>
              </span>
            ))}
            <Input
              type="text"
              placeholder="タグで検索 (-でマイナス検索)" // プレースホルダーを更新
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
                  onClick={() => handleAddTag(tag)} // サジェストからの追加時はプレフィックスなし
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
                <DropdownMenuItem key={tag.id} onSelect={() => handleAddTag(tag.name)} disabled={selectedTags.includes(tag.name) || selectedNegativeTags.includes(tag.name)}> {/* マイナス検索タグも考慮 */}
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
                  onSelect={() => {
                    // 通常タグとマイナス検索タグの両方から追加/削除を判定
                    if (isFeatureTagSelected(tag.name)) {
                      handleRemoveTag(tag.name, false);
                    } else if (isNegativeTagSelected(tag.name)) {
                      handleRemoveTag(tag.name, true);
                    }
                    else {
                      handleAddTag(tag.name);
                    }
                  }}
                  className={`${isFeatureTagSelected(tag.name) ? 'bg-accent' : isNegativeTagSelected(tag.name) ? 'bg-red-200 line-through' : ''}`} // 選択状態とマイナス検索状態をハイライト
                >
                  {tag.name} {isFeatureTagSelected(tag.name) || isNegativeTagSelected(tag.name) ? <X size={14} className="ml-auto" /> : ''}
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
                           <DropdownMenuItem key={tag.id} onSelect={() => handleAddTag(tag.name)} disabled={selectedTags.includes(tag.name) || selectedNegativeTags.includes(tag.name)} className="text-sm"> {/* マイナス検索タグも考慮 */}
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
                                variant={isFeatureTagSelected(tag.name) ? 'default' : isNegativeTagSelected(tag.name) ? 'destructive' : 'outline'} // マイナス検索タグはdestructive variant
                                size="sm"
                                onClick={() => {
                                  // 通常タグとマイナス検索タグの両方から追加/削除を判定
                                  if (isFeatureTagSelected(tag.name)) {
                                    handleRemoveTag(tag.name, false);
                                  } else if (isNegativeTagSelected(tag.name)) {
                                    handleRemoveTag(tag.name, true);
                                  }
                                  else {
                                    handleAddTag(tag.name);
                                  }
                                }}
                                className={`text-xs ${isNegativeTagSelected(tag.name) ? 'line-through' : ''}`} // 取り消し線を追加
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