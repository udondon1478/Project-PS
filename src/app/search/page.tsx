"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductGrid from "@/components/ProductGrid"; // ProductGridコンポーネントをインポート
import { Product } from "@/types/product"; // Product型をインポート

const SearchResultPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchTerm = searchParams.get("tags") || "";
  const initialAgeRatingTagId = searchParams.get("ageRatingTagId") || "";
  const initialCategoryTagId = searchParams.get("categoryTagId") || "";
  const initialFeatureTagIds = searchParams.get("featureTagIds")?.split(',') || [];

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ageRatingTags, setAgeRatingTags] = useState<{ id: string; name: string }[]>([]);
  const [categoryTags, setCategoryTags] = useState<{ id: string; name: string }[]>([]);
  const [featureTags, setFeatureTags] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgeRatingTagId, setSelectedAgeRatingTagId] = useState<string>(initialAgeRatingTagId);
  const [selectedCategoryTagId, setSelectedCategoryTagId] = useState<string>(initialCategoryTagId);
  const [selectedFeatureTagIds, setSelectedFeatureTagIds] = useState<string[]>(initialFeatureTagIds);

  useEffect(() => {
    const fetchTagsByType = async () => {
      try {
        const ageRatingsResponse = await fetch('/api/tags/by-type?categoryName=age_rating');
        const ageRatingData = await ageRatingsResponse.json();
        if (ageRatingsResponse.ok) {
          setAgeRatingTags(ageRatingData);
        } else {
          console.error('Failed to fetch age rating tags:', ageRatingData.message);
        }

        const categoriesResponse = await fetch('/api/tags/by-type?categoryName=product_category');
        const categoryData = await categoriesResponse.json();
        if (categoriesResponse.ok) {
          setCategoryTags(categoryData);
        } else {
          console.error('Failed to fetch category tags:', categoryData.message);
        }

        const featuresResponse = await fetch('/api/tags/by-type?categoryName=feature');
        const featureData = await featuresResponse.json();
        if (featuresResponse.ok) {
          setFeatureTags(featureData);
        } else {
          console.error('Failed to fetch feature tags:', featureData.message);
        }

      } catch (error) {
        console.error('Error fetching tags by type:', error);
      }
    };

    fetchTagsByType();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (searchTerm) queryParams.append("tags", searchTerm);
        if (selectedAgeRatingTagId) queryParams.append("ageRatingTagId", selectedAgeRatingTagId);
        if (selectedCategoryTagId) queryParams.append("categoryTagId", selectedCategoryTagId);
        if (selectedFeatureTagIds.length > 0) queryParams.append("featureTagIds", selectedFeatureTagIds.join(','));

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
  }, [searchTerm, selectedAgeRatingTagId, selectedCategoryTagId, selectedFeatureTagIds]);

  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (searchTerm) queryParams.append("tags", searchTerm);
    if (selectedAgeRatingTagId) queryParams.append("ageRatingTagId", selectedAgeRatingTagId);
    if (selectedCategoryTagId) queryParams.append("categoryTagId", selectedCategoryTagId);
    if (selectedFeatureTagIds.length > 0) queryParams.append("featureTagIds", selectedFeatureTagIds.join(','));
    router.replace(`/search?${queryParams.toString()}`);
  }, [searchTerm, selectedAgeRatingTagId, selectedCategoryTagId, selectedFeatureTagIds, router]);

  const handleFeatureTagToggle = (tagId: string) => {
    setSelectedFeatureTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

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
        {selectedAgeRatingTagId && <p>対象年齢タグID: {selectedAgeRatingTagId}</p>}
        {selectedCategoryTagId && <p>カテゴリータグID: {selectedCategoryTagId}</p>}
        {selectedFeatureTagIds.length > 0 && <p>主要機能タグID: {selectedFeatureTagIds.join(',')}</p>}
        <div>指定された条件に一致する商品は見つかりませんでした。</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      <p>検索キーワード: {searchTerm}</p>
      {selectedAgeRatingTagId && <p>対象年齢タグID: {selectedAgeRatingTagId}</p>}
      {selectedCategoryTagId && <p>カテゴリータグID: {selectedCategoryTagId}</p>}
      {selectedFeatureTagIds.length > 0 && <p>主要機能タグID: {selectedFeatureTagIds.join(',')}</p>}

      <ProductGrid products={products} showLikeButton={false} /> {/* ProductGridを使用 */}
    </div>
  );
};

export default SearchResultPage;