"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // useRouterを追加
import Image from "next/image"; // next/imageをインポート
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'; // DropdownMenuコンポーネントをインポート

// src/app/page.tsx の Product インターフェースに合わせる
interface Product {
  id: string;
  title: string;
  lowPrice: number;
  highPrice: number; // highPriceを追加
  mainImageUrl: string | null;
  tags: string[];
  ageRatingId?: string | null; // 対象年齢IDを追加
  categoryId?: string | null; // カテゴリーIDを追加
  variations?: { // variationsを追加
    id: string;
    name: string;
    price: number;
  }[];
}

// 価格表示コンポーネント (src/app/page.tsx からコピー)
const PriceDisplay = ({ product }: { product: Product }) => {
  const hasMultipleVariations = product.highPrice > product.lowPrice;

  if (!hasMultipleVariations || !product.variations || product.variations.length === 0) {
    return <p className="text-gray-700 font-bold">¥{product.lowPrice.toLocaleString()}</p>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-gray-700 font-bold flex items-center cursor-pointer">
          ¥{product.lowPrice.toLocaleString()}
          {' ~ '}¥{product.highPrice.toLocaleString()}
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {product.variations.map((variation) => (
          <DropdownMenuItem key={variation.id}>
            <div className="flex flex-col">
              <div className="font-medium">{variation.name}</div>
              <div className="text-gray-700">¥{variation.price.toLocaleString()}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


const SearchResultPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter(); // useRouterを初期化
  const searchTerm = searchParams.get("tags") || "";
  const initialAgeRatingId = searchParams.get("ageRatingId") || "";
  const initialCategoryId = searchParams.get("categoryId") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true); // ローディング状態を追加
  const [error, setError] = useState<string | null>(null); // エラー状態を追加
  const [ageRatings, setAgeRatings] = useState<{ id: string; name: string }[]>([]); // 対象年齢の選択肢
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]); // カテゴリーの選択肢
  const [selectedAgeRatingId, setSelectedAgeRatingId] = useState<string>(initialAgeRatingId); // 選択された対象年齢ID
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId); // 選択されたカテゴリーID

  // 対象年齢とカテゴリーの選択肢をフェッチ
  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const ageRatingsResponse = await fetch('/api/age-ratings');
        const ageRatingsData = await ageRatingsResponse.json();
        if (ageRatingsResponse.ok) {
          setAgeRatings(ageRatingsData);
        } else {
          console.error('Failed to fetch age ratings:', ageRatingsData.message);
        }

        const categoriesResponse = await fetch('/api/categories');
        const categoriesData = await categoriesResponse.json();
        if (categoriesResponse.ok) {
          setCategories(categoriesData);
        } else {
          console.error('Failed to fetch categories:', categoriesData.message);
        }
      } catch (error) {
        console.error('Error fetching attributes:', error);
      }
    };

    fetchAttributes();
  }, []); // コンポーネントマウント時に一度だけ実行

  // 商品をフェッチ
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true); // フェッチ開始時にローディングをtrueに
      setError(null); // エラーをリセット
      try {
        // 作成したAPIエンドポイントを呼び出す
        const queryParams = new URLSearchParams();
        if (searchTerm) queryParams.append("tags", searchTerm);
        if (selectedAgeRatingId) queryParams.append("ageRatingId", selectedAgeRatingId);
        if (selectedCategoryId) queryParams.append("categoryId", selectedCategoryId);

        const response = await fetch(`/api/products?${queryParams.toString()}`);
        if (!response.ok) {
           throw new Error(`Error: ${response.status}`);
        }
        const data: Product[] = await response.json();
        setProducts(data);
      } catch (err: unknown) {
         if (err instanceof Error) {
           setError(err.message);
         } else {
           setError('An unknown error occurred');
         }
      } finally {
        setLoading(false); // フェッチ完了時にローディングをfalseに
      }
    };

    fetchProducts();
  }, [searchTerm, selectedAgeRatingId, selectedCategoryId]); // 依存配列に新しい状態変数を追加

  // 検索条件が変更されたらURLを更新
  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (searchTerm) queryParams.append("tags", searchTerm);
    if (selectedAgeRatingId) queryParams.append("ageRatingId", selectedAgeRatingId);
    if (selectedCategoryId) queryParams.append("categoryId", selectedCategoryId);
    router.replace(`/search?${queryParams.toString()}`);
  }, [searchTerm, selectedAgeRatingId, selectedCategoryId, router]);


  if (loading) {
    return <div>Loading...</div>; // ローディング表示
  }

  if (error) {
    return <div>Error: {error}</div>; // エラー表示
  }

  // 検索結果がない場合の表示を追加
  if (products.length === 0 && !loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-40">
        <p>検索キーワード: {searchTerm}</p>
        {selectedAgeRatingId && <p>対象年齢ID: {selectedAgeRatingId}</p>}
        {selectedCategoryId && <p>カテゴリーID: {selectedCategoryId}</p>}
        <div>指定された条件に一致する商品は見つかりませんでした。</div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 pt-40"> {/* トップページのデザインに合わせる */}
      <p>検索キーワード: {searchTerm}</p>
      {selectedAgeRatingId && <p>対象年齢ID: {selectedAgeRatingId}</p>}
      {selectedCategoryId && <p>カテゴリーID: {selectedCategoryId}</p>}

      {/* 対象年齢選択ドロップダウン */}
      <div className="mb-4">
        <label htmlFor="ageRating" className="block text-sm font-medium text-gray-700">
          対象年齢:
        </label>
        <select
          id="ageRating"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={selectedAgeRatingId}
          onChange={(e) => setSelectedAgeRatingId(e.target.value)}
        >
          <option value="">全て</option>
          {ageRatings.map((rating) => (
            <option key={rating.id} value={rating.id}>
              {rating.name}
            </option>
          ))}
        </select>
      </div>

      {/* カテゴリー選択ドロップダウン */}
      <div className="mb-4">
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          カテゴリー:
        </label>
        <select
          id="category"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
        >
          <option value="">全て</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"> {/* トップページのデザインに合わせる */}
        {products.map((product) => (
          <div
            key={product.id}
            className="border rounded-lg overflow-hidden shadow-lg" // トップページのデザインに合わせる
          >
            <div className="relative w-full h-89"> {/* トップページのデザインに合わせる */}
              {product.mainImageUrl ? (
                <Image // next/image を使用
                  src={product.mainImageUrl}
                  alt={product.title} // alt を title に変更
                  layout="fill"
                  objectFit="cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between w-full h-10 mb-2"> {/* トップページのデザインに合わせる */}
                <a href={`/products/${product.id}`} className="flex-grow overflow-hidden"
                   style={{
                     display: '-webkit-box',
                     WebkitLineClamp: 2,
                     WebkitBoxOrient: 'vertical',
                   }}> {/* 商品詳細ページへのリンク */}
                  <h3 className="font-medium line-clamp-2 hover:underline"> {/* トップページのデザインに合わせる */}
                    {product.title} {/* name を title に変更 */}
                  </h3>
                </a>
                {/* いいねボタンはトップページにないので削除 */}
              </div>
              <div className="flex flex-wrap gap-1 mb-2"> {/* トップページのデザインに合わせる */}
                {product.tags.map((tag, index) => (
                  <div
                    key={index} // key を index に変更 (タグ名が重複する可能性を考慮)
                    className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full" // トップページのデザインに合わせる
                  >
                    {tag}
                  </div>
                ))}
              </div>
              <PriceDisplay product={product} /> {/* PriceDisplayコンポーネントを使用 */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResultPage;