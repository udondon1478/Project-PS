"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';

import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider'; // Sliderコンポーネントをインポート
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
import { Checkbox } from '@/components/ui/checkbox'; // Checkboxコンポーネントをインポート




import { useRouter, useSearchParams } from 'next/navigation'; // useRouterとuseSearchParamsを追加

// Placeholder for tag suggestions - include age ratings and features
// const allTags: string[] = []; // 重複定義のためコメントアウト

// Define options for dropdowns


export default function ProductSearch() {

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedNegativeTags, setSelectedNegativeTags] = useState<string[]>([]); // マイナス検索用タグを追加
  const [isComposing, setIsComposing] = useState(false); // IME変換中かどうかを管理するstateを追加



  const searchParams = useSearchParams(); // useSearchParams フックを追加
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]); // タグ候補ステートを追加
  
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [detailedFilters, setDetailedFilters] = useState({
    category: null as string | null,
    // priceRange: null as string | null, // 価格帯はSliderのstateで管理するため削除
  });

  // 価格帯スライダー用のstate
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]); // 初期値は0円から10000円（仮）

  // 高額商品フィルタリング用のstate
  const [isHighPriceFilterEnabled, setIsHighPriceFilterEnabled] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter(); // useRouterを初期化
  const suggestionsRef = useRef<HTMLUListElement>(null);

  // 新しい状態変数を追加 (カテゴリの色情報を含むように型を変更)
  const [ageRatingTags, setAgeRatingTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [categoryTags, setCategoryTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [featureTags, setFeatureTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [selectedAgeRatingTags, setSelectedAgeRatingTags] = useState<string[]>([]); // 新しく追加

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
  // URLのクエリパラメータまたはセッションストレージからタグを読み込む (コンポーネントマウント時)
  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const urlTags = urlSearchParams.get("tags")?.split(',').filter(tag => tag.length > 0) || [];
    const urlNegativeTags = urlSearchParams.get("negativeTags")?.split(',').filter(tag => tag.length > 0) || [];
    const urlAgeRatingTags = urlSearchParams.get("ageRatingTags")?.split(',').filter(tag => tag.length > 0) || [];

    if (urlTags.length > 0 || urlNegativeTags.length > 0 || urlAgeRatingTags.length > 0) {
      // URLにタグ情報がある場合はURLから読み込む
      setSelectedTags(urlTags);
      setSelectedNegativeTags(urlNegativeTags);
      setSelectedAgeRatingTags(urlAgeRatingTags);
    } else {
      // URLにタグ情報がない場合はセッションストレージから読み込む
      const savedTags = sessionStorage.getItem('polyseek-search-tags');
      const savedNegativeTags = sessionStorage.getItem('polyseek-search-negative-tags');
      const savedAgeRatingTags = sessionStorage.getItem('polyseek-search-age-rating-tags');

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

      if (savedNegativeTags) {
        try {
          const parsedNegativeTags = JSON.parse(savedNegativeTags);
          if (Array.isArray(parsedNegativeTags)) {
            setSelectedNegativeTags(parsedNegativeTags);
          }
        } catch (error) {
          console.error("Failed to parse negative tags from sessionStorage:", error);
        }
      }

      if (savedAgeRatingTags) {
        try {
          const parsedAgeRatingTags = JSON.parse(savedAgeRatingTags);
          if (Array.isArray(parsedAgeRatingTags)) {
            setSelectedAgeRatingTags(parsedAgeRatingTags);
          }
        } catch (error) {
          console.error("Failed to parse age rating tags from sessionStorage:", error);
        }
      }
    }
    // 価格帯の読み込み (URL優先)
    const urlMinPrice = urlSearchParams.get("minPrice");
    const urlMaxPrice = urlSearchParams.get("maxPrice");
    const urlIsHighPrice = urlSearchParams.get("isHighPrice"); // isHighPriceパラメータを取得

    if (urlMinPrice !== null || urlMaxPrice !== null || urlIsHighPrice === 'true') {
      const min = urlMinPrice !== null ? parseInt(urlMinPrice, 10) : 0;
      let max = urlMaxPrice !== null ? parseInt(urlMaxPrice, 10) : 10000; // デフォルト最大値

      // URLにisHighPriceがtrueで渡された場合
      if (urlIsHighPrice === 'true') {
        max = 100000; // 高額商品フィルタリングが有効な場合は最大値を100000に設定
        setIsHighPriceFilterEnabled(true); // 高額商品フィルタリングを有効にする
        setPriceRange([min, max]);
      } else { // 通常の価格範囲指定
        setIsHighPriceFilterEnabled(false); // 高額商品フィルタリングを無効にする
        setPriceRange([min, max]);
      }
    }






  }, [searchParams]); // URLのクエリパラメータ変更を検知して実行

  // Fetch tag suggestions based on input with debounce
  useEffect(() => {
    if (searchQuery.length === 0) {
      setTagSuggestions([]);
      setIsSuggestionsVisible(false);
      return;
    }

    const timerId = setTimeout(async () => {
      try {
        // マイナス検索のプレフィックスを考慮してクエリを調整
        const isNegativeSearch = searchQuery.startsWith('-');
        const actualQuery = isNegativeSearch ? searchQuery.substring(1) : searchQuery;

        if (actualQuery.length === 0) { // プレフィックスのみの場合は候補を表示しない
          setTagSuggestions([]);
          setIsSuggestionsVisible(false);
          return;
        }

        const response = await fetch(`/api/tags/search?query=${encodeURIComponent(actualQuery)}`);
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
  }, [searchQuery, selectedTags, selectedNegativeTags]); // selectedNegativeTagsも依存配列に追加

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
    sessionStorage.setItem('polyseek-search-age-rating-tags', JSON.stringify(selectedAgeRatingTags)); // 年齢制限タグも保存
  }, [selectedTags, selectedNegativeTags, selectedAgeRatingTags]); // 全てのタグステートを依存配列に追加

  // 高額商品フィルタリングの状態に応じて価格スライダーの範囲と値を更新
  useEffect(() => {
    if (isHighPriceFilterEnabled) {
      // 高額商品フィルタリングがオンの場合
      setPriceRange([10000, 100000]); // 最低10000円〜最高100000円（仮）
      // スライダーのmaxとstepもここで動的に変更する必要があるが、
      // shadcn/uiのSliderコンポーネントはpropsの変更で対応できるか確認が必要。
      // 一旦stateで管理するが、必要に応じてrefなどを検討。
    } else {
      // 高額商品フィルタリングがオフの場合
      setPriceRange([0, 10000]); // デフォルトの範囲に戻す
    }
  }, [isHighPriceFilterEnabled]); // isHighPriceFilterEnabledが変更されたときに実行

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

    let newSelectedTags = [...selectedTags];
    let newSelectedNegativeTags = [...selectedNegativeTags];
    let newSelectedAgeRatingTags = [...selectedAgeRatingTags];

    if (isNegative) {
      // マイナス検索タグとして追加
      if (!newSelectedNegativeTags.includes(tagName)) {
        newSelectedNegativeTags = [...newSelectedNegativeTags, tagName];
      }
    } else {
      // 通常タグとして追加
      // 対象年齢タグの場合は一つだけ選択可能にするロジックを維持
      const ageRatingTagNames = ageRatingTags.map(tag => tag.name);
      if (ageRatingTagNames.includes(tagName)) {
        // 年齢制限タグの場合、既に選択されていなければ追加
        if (!newSelectedAgeRatingTags.includes(tagName)) {
          newSelectedAgeRatingTags = [...newSelectedAgeRatingTags, tagName];
        }
      } else {
        if (!newSelectedTags.includes(tagName)) {
          newSelectedTags = [...newSelectedTags, tagName];
        }
      }
    }

    setSearchQuery(''); // Clear input after adding tag
    setTagSuggestions([]);
    setIsSuggestionsVisible(false);
    searchInputRef.current?.focus(); // Keep focus on input

    setSelectedTags(newSelectedTags);
    setSelectedNegativeTags(newSelectedNegativeTags);
    setSelectedAgeRatingTags(newSelectedAgeRatingTags);

    // URLSearchParamsを更新
    const currentSearchParams = new URLSearchParams(window.location.search);
    const queryParams = new URLSearchParams();
    if (newSelectedTags.length > 0) {
      queryParams.append("tags", newSelectedTags.join(','));
    }
    if (newSelectedNegativeTags.length > 0) {
      queryParams.append("negativeTags", newSelectedNegativeTags.join(','));
    }
    if (newSelectedAgeRatingTags.length > 0) {
      queryParams.append("ageRatingTags", newSelectedAgeRatingTags.join(','));
    }

    // 価格帯フィルターと高額商品フィルタリングの状態を維持
    const minPrice = currentSearchParams.get("minPrice");
    const maxPrice = currentSearchParams.get("maxPrice");
    const isHighPrice = currentSearchParams.get("isHighPrice");
    const categoryName = currentSearchParams.get("categoryName");

    if (minPrice) queryParams.append("minPrice", minPrice);
    if (maxPrice) queryParams.append("maxPrice", maxPrice);
    if (isHighPrice) queryParams.append("isHighPrice", isHighPrice);
    if (categoryName) queryParams.append("categoryName", categoryName);

    router.replace(`/search?${queryParams.toString()}`);
  };

  const handleRemoveTag = (tagToRemove: string, isNegative: boolean = false) => {
    const currentSearchParams = new URLSearchParams(window.location.search);
    let newSelectedTags = [...selectedTags];
    let newSelectedNegativeTags = [...selectedNegativeTags];
    let newSelectedAgeRatingTags = [...selectedAgeRatingTags];

    const ageRatingTagNames = ageRatingTags.map(tag => tag.name);

    if (ageRatingTagNames.includes(tagToRemove)) {
      newSelectedAgeRatingTags = newSelectedAgeRatingTags.filter(tag => tag !== tagToRemove);
      setSelectedAgeRatingTags(newSelectedAgeRatingTags);
    } else if (isNegative) {
      newSelectedNegativeTags = newSelectedNegativeTags.filter(tag => tag !== tagToRemove);
      setSelectedNegativeTags(newSelectedNegativeTags);
    } else {
      newSelectedTags = newSelectedTags.filter(tag => tag !== tagToRemove);
      setSelectedTags(newSelectedTags);
    }

    // URLSearchParamsを更新
    const queryParams = new URLSearchParams();
    if (newSelectedTags.length > 0) {
      queryParams.append("tags", newSelectedTags.join(','));
    }
    if (newSelectedNegativeTags.length > 0) {
      queryParams.append("negativeTags", newSelectedNegativeTags.join(','));
    }
    if (newSelectedAgeRatingTags.length > 0) {
      queryParams.append("ageRatingTags", newSelectedAgeRatingTags.join(','));
    }

    // 価格帯フィルターと高額商品フィルタリングの状態を維持
    const minPrice = currentSearchParams.get("minPrice");
    const maxPrice = currentSearchParams.get("maxPrice");
    const isHighPrice = currentSearchParams.get("isHighPrice");
    const categoryName = currentSearchParams.get("categoryName");

    if (minPrice) queryParams.append("minPrice", minPrice);
    if (maxPrice) queryParams.append("maxPrice", maxPrice);
    if (isHighPrice) queryParams.append("isHighPrice", isHighPrice);
    if (categoryName) queryParams.append("categoryName", categoryName);

    router.replace(`/search?${queryParams.toString()}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const trimmedQuery = searchQuery.trim();
    // IME変換中はスペースキーまたはEnterキーでのタグ確定を抑制
    if ((event.key === ' ' || event.key === 'Enter') && isComposing) {
      return;
    }

    // 半角スペース、Enter、またはTabでタグを確定
    if ((event.key === ' ' || (event.key === 'Enter' && !isComposing) || (event.key === 'Tab' && !isComposing)) && trimmedQuery !== '') {
      event.preventDefault(); // スペース、Enter、Tabが入力フィールドに入らないようにする

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

  const handleSearch = useCallback(() => {
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
    if (selectedAgeRatingTags.length > 0) { // 年齢制限タグをクエリパラメータに追加
      queryParams.append("ageRatingTags", selectedAgeRatingTags.join(','));
    }
    if (detailedFilters.category) {
      // カテゴリーはIDではなく名前で検索することを想定
      // 必要であれば、カテゴリー名からIDを取得する処理を追加

      queryParams.append("categoryName", detailedFilters.category);
    }
    // 価格帯フィルターを追加
    // minPriceが0の場合、minPriceクエリパラメータを省略
    if (priceRange[0] !== 0) {
      queryParams.append("minPrice", priceRange[0].toString());
    }
    // maxPriceが10000でisHighPriceFilterEnabledがfalseの場合、maxPriceを省略
    // maxPriceが10000でisHighPriceFilterEnabledがfalseの場合、またはisHighPriceFilterEnabledがtrueかつpriceRange[1]が100000の場合、maxPriceを省略
    if (!((priceRange[1] === 10000 && !isHighPriceFilterEnabled) || (isHighPriceFilterEnabled && priceRange[1] === 100000))) {
      queryParams.append("maxPrice", priceRange[1].toString());
    }
    if (isHighPriceFilterEnabled) {
      queryParams.append("isHighPrice", "true");
    }

    router.replace(`/search?${queryParams.toString()}`);
  }, [selectedTags, selectedNegativeTags, selectedAgeRatingTags, detailedFilters, priceRange, isHighPriceFilterEnabled, router]); // 依存配列にisHighPriceFilterEnabledとselectedAgeRatingTagsを追加

  const handleDetailedFilterChange = (filterType: keyof typeof detailedFilters, value: string | null) => {
    setDetailedFilters(prev => ({ ...prev, [filterType]: value }));
  };

   const clearAllTagsAndFilters = () => {
    setSelectedTags([]);
    setSelectedNegativeTags([]); // マイナス検索タグもクリア
    setSelectedAgeRatingTags([]); // 年齢制限タグもクリア
    setDetailedFilters({ category: null });
  };


  const applyFiltersAndSearch = () => {
     handleSearch();
     setIsFilterSidebarOpen(false);
  };

  // Helper to check if a specific feature tag is selected
  const isFeatureTagSelected = (feature: string) => selectedTags.includes(feature);
  // Helper to check if a specific negative tag is selected
  const isNegativeTagSelected = (tag: string) => selectedNegativeTags.includes(tag);


  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto flex items-center gap-2 md:gap-4">
        {/* Search Bar and Tag Input */}
        <div className="relative flex-grow" ref={searchInputRef}>
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 p-1 flex-wrap gap-1 min-h-[40px]">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-300 mx-1 flex-shrink-0" />
            {selectedTags.map(tag => (
              <span key={tag} className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="ml-1 text-blue-600 hover:text-blue-800">
                  <X size={12} />
                </button>
              </span>
            ))}
            {selectedNegativeTags.map(tag => ( // マイナス検索タグの表示
              <span key={`negative-${tag}`} className="flex items-center bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap"> {/* 取り消し線を追加 */}
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
              onCompositionStart={() => setIsComposing(true)} // IME変換開始
              onCompositionEnd={() => setIsComposing(false)}   // IME変換終了
              onFocus={() => searchQuery.length > 0 && setIsSuggestionsVisible(true)}
              className="flex-grow border-none focus:ring-0 focus:outline-none p-1 h-auto text-sm min-w-[100px]"
            />
          </div>
          {isSuggestionsVisible && tagSuggestions.length > 0 && (
            <ul ref={suggestionsRef} className="absolute z-20 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
              {tagSuggestions.map(tag => (
                <li
                  key={tag}
                  onClick={() => handleAddTag(searchQuery.startsWith('-') ? `-${tag}` : tag)} // マイナス検索のプレフィックスを考慮してタグを追加
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
                {selectedAgeRatingTags.length > 0
                  ? `対象年齢: ${selectedAgeRatingTags.map(tagId => ageRatingTags.find(t => t.name === tagId)?.name || tagId).join(', ')}`
                  : "対象年齢"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>対象年齢</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ageRatingTags.map(tag => (
                <DropdownMenuItem key={tag.id} onSelect={(e) => e.preventDefault()}> {/* Prevent closing on select */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`age-rating-${tag.id}`}
                      checked={selectedAgeRatingTags.includes(tag.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAgeRatingTags(prev => [...prev, tag.name]);
                        } else {
                          setSelectedAgeRatingTags(prev => prev.filter(name => name !== tag.name));
                        }
                      }}
                    />
                    <label
                      htmlFor={`age-rating-${tag.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {tag.name}
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
                           {selectedAgeRatingTags.length > 0
                             ? `対象年齢: ${selectedAgeRatingTags.map(tagId => ageRatingTags.find(t => t.name === tagId)?.name || tagId).join(', ')}`
                             : "対象年齢"}
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                         {ageRatingTags.map(tag => (
                           <DropdownMenuItem key={tag.id} onSelect={(e) => e.preventDefault()}> {/* Prevent closing on select */}
                             <div className="flex items-center space-x-2">
                               <Checkbox
                                 id={`mobile-age-rating-${tag.id}`}
                                 checked={selectedAgeRatingTags.includes(tag.name)}
                                 onCheckedChange={(checked) => {
                                   if (checked) {
                                     setSelectedAgeRatingTags(prev => [...prev, tag.name]);
                                   } else {
                                     setSelectedAgeRatingTags(prev => prev.filter(name => name !== tag.name));
                                   }
                                 }}
                               />
                               <label
                                 htmlFor={`mobile-age-rating-${tag.id}`}
                                 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                               >
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
                  {/* 高額商品フィルタリングチェックボックス */}
                  <div className="flex items-center space-x-2 px-2 mb-4">
                    <Checkbox
                      id="high-price-filter"
                      checked={isHighPriceFilterEnabled}
                      onCheckedChange={(checked) => setIsHighPriceFilterEnabled(!!checked)}
                    />
                    <label
                      htmlFor="high-price-filter"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      高額商品のみ (10000円以上)
                    </label>
                  </div>
                  {/* 価格帯スライダーを追加 */}
                  <div className="px-2"> {/* スライダーの左右に余白を追加 */}
                    <Slider
                      min={isHighPriceFilterEnabled ? 10000 : 0}
                      max={isHighPriceFilterEnabled ? 100000 : 10000} // 高額商品フィルタリング時は最大100000
                      step={isHighPriceFilterEnabled ? 1000 : 100} // 高額商品フィルタリング時はステップを大きく
                      value={priceRange}
                      onValueChange={(value) => setPriceRange([value[0], value[1]])}
                      className="w-full" // スライダーの全体的な幅を制御
                      rangeClassName={isHighPriceFilterEnabled ? 'bg-blue-500' : ''} // レンジの色を動的に変更
                      thumbClassName={isHighPriceFilterEnabled ? 'border-blue-700' : ''} // サムの輪郭色のみを動的に変更
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