"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductGrid from "@/components/ProductGrid"; // ProductGridコンポーネントをインポート
import { Product } from "@/types/product"; // Product型をインポート

const SearchResultPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchTerm = searchParams.get("tags") || "";
  const initialAgeRatingTags = searchParams.get("ageRatingTags")?.split(',') || [];
  const initialCategoryTagId = searchParams.get("categoryTagId") || "";
  const initialFeatureTagIds = searchParams.get("featureTagIds")?.split(',') || [];
  const initialNegativeTags = searchParams.get("negativeTags")?.split(',') || []; // negativeTagsを取得

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedNegativeTags, setSelectedNegativeTags] = useState<string[]>(initialNegativeTags); // negativeTagsステートを追加
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgeRatingTags, setSelectedAgeRatingTags] = useState<string[]>(initialAgeRatingTags);
  const [selectedCategoryTagId, setSelectedCategoryTagId] = useState<string>(initialCategoryTagId);
  const [selectedFeatureTagIds, setSelectedFeatureTagIds] = useState<string[]>(initialFeatureTagIds);


  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (searchTerm) queryParams.append("tags", searchTerm);
        if (selectedAgeRatingTags.length > 0) queryParams.append("ageRatingTags", selectedAgeRatingTags.join(','));
        if (selectedCategoryTagId) queryParams.append("categoryTagId", selectedCategoryTagId);

        if (selectedFeatureTagIds.length > 0) queryParams.append("featureTagIds", selectedFeatureTagIds.join(','));
        if (selectedNegativeTags.length > 0) queryParams.append("negativeTags", selectedNegativeTags.join(',')); // negativeTagsを追加
        const minPrice = searchParams.get('minPrice'); // URLから最小価格を取得
        const maxPrice = searchParams.get('maxPrice'); // URLから最大価格を取得
        if (minPrice) queryParams.append("minPrice", minPrice); // 最小価格をクエリに追加
        if (maxPrice) queryParams.append("maxPrice", maxPrice); // 最大価格をクエリに追加

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
        setLoading(false);
      }
    };

    fetchProducts();

  }, [searchTerm, selectedAgeRatingTags, selectedCategoryTagId, selectedFeatureTagIds, selectedNegativeTags, searchParams.get('minPrice'), searchParams.get('maxPrice')]); // 依存配列に価格帯クエリパラメータを追加

  useEffect(() => {
    const currentSearchParams = new URLSearchParams(window.location.search); // 既存のURLSearchParamsを取得
    // タグ関連のパラメータを更新または削除
    if (searchTerm) {
      currentSearchParams.set("tags", searchTerm);
    } else {
      currentSearchParams.delete("tags");
    }
    if (selectedAgeRatingTags.length > 0) {
      currentSearchParams.set("ageRatingTags", selectedAgeRatingTags.join(','));
    } else {
      currentSearchParams.delete("ageRatingTags");
    }
    if (selectedCategoryTagId) {
      currentSearchParams.set("categoryTagId", selectedCategoryTagId);
    } else {
      currentSearchParams.delete("categoryTagId");
    }
    if (selectedFeatureTagIds.length > 0) {
      currentSearchParams.set("featureTagIds", selectedFeatureTagIds.join(','));
    } else {
      currentSearchParams.delete("featureTagIds");
    }
    if (selectedNegativeTags.length > 0) {
      currentSearchParams.set("negativeTags", selectedNegativeTags.join(','));
    } else {
      currentSearchParams.delete("negativeTags");
    }

    // 価格帯パラメータはそのまま引き継がれる

    router.replace(`/search?${currentSearchParams.toString()}`);
  }, [searchTerm, selectedAgeRatingTags, selectedCategoryTagId, selectedFeatureTagIds, selectedNegativeTags, router]);

  // URLのクエリパラメータ変更を監視し、ステートを更新
  useEffect(() => {
    const currentNegativeTags = searchParams.get("negativeTags")?.split(',') || [];
    setSelectedNegativeTags(currentNegativeTags);

    const currentAgeRatingTags = searchParams.get("ageRatingTags")?.split(',') || [];
    setSelectedAgeRatingTags(currentAgeRatingTags);

    const currentCategoryTagId = searchParams.get("categoryTagId") || "";
    setSelectedCategoryTagId(currentCategoryTagId);

    const currentFeatureTagIds = searchParams.get("featureTagIds")?.split(',') || [];
    setSelectedFeatureTagIds(currentFeatureTagIds);

    // searchTerm は useSearchParams から直接取得しているのでステート更新は不要

  }, [searchParams.toString()]); // searchParams の文字列表現が変更されたときに実行



  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (products.length === 0 && !loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-40">
        <p>検索キーワード: {searchTerm}</p>
        {selectedAgeRatingTags.length > 0 && <p>対象年齢タグ: {selectedAgeRatingTags.join(',')}</p>}
        {selectedCategoryTagId && <p>カテゴリータグID: {selectedCategoryTagId}</p>}
        {selectedFeatureTagIds.length > 0 && <p>主要機能タグID: {selectedFeatureTagIds.join(',')}</p>}
        <div>指定された条件に一致する商品は見つかりませんでした。</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      <p>検索キーワード: {searchTerm}</p>
      {selectedAgeRatingTags.length > 0 && <p>対象年齢タグ: {selectedAgeRatingTags.join(',')}</p>}
      {selectedCategoryTagId && <p>カテゴリータグID: {selectedCategoryTagId}</p>}
      {selectedFeatureTagIds.length > 0 && <p>主要機能タグID: {selectedFeatureTagIds.join(',')}</p>}

      <ProductGrid products={products} showLikeButton={false} /> {/* ProductGridを使用 */}
    </div>
  );
};

export default SearchResultPage;