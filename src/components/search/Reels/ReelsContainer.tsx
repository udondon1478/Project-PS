"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product, ProductDetail } from '@/types/product';
import { ReelsCard } from './ReelsCard';
import { ReelsCardSkeleton } from './ReelsCardSkeleton';
import useEmblaCarousel from 'embla-carousel-react';

interface ReelsContainerProps {
  initialProducts: Product[];
  searchParams: URLSearchParams;
  totalProducts: number;
  onClose: () => void;
  initialTags?: string[];
}

const PAGE_SIZE = 24;
const PREFETCH_DISTANCE = 3;

export function ReelsContainer({
  initialProducts,
  searchParams,
  totalProducts,
  onClose,
  initialTags = [],
}: ReelsContainerProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(products.length < totalProducts);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTags, setCurrentTags] = useState<string[]>(initialTags);
  const [internalSearchParams, setInternalSearchParams] = useState(searchParams);

  const detailCache = useRef<Map<string, ProductDetail>>(new Map());
  const [loadedDetails, setLoadedDetails] = useState<Map<string, ProductDetail>>(new Map());

  const loadMoreControllerRef = useRef<AbortController | null>(null);
  const tagSearchControllerRef = useRef<AbortController | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    dragFree: false,
    containScroll: 'trimSnaps',
    skipSnaps: false,
    duration: 15,
  });

  const fetchProductDetail = useCallback(async (productId: string) => {
    if (detailCache.current.has(productId)) {
      return detailCache.current.get(productId)!;
    }

    try {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error('Failed to fetch product detail');
      const data = await res.json();
      const detail = data.product as ProductDetail;
      detailCache.current.set(productId, detail);
      setLoadedDetails(prev => new Map(prev).set(productId, detail));
      return detail;
    } catch (error) {
      console.error('Failed to fetch product detail:', error);
      return null;
    }
  }, []);

  const prefetchDetails = useCallback(async (centerIndex: number) => {
    const start = Math.max(0, centerIndex - PREFETCH_DISTANCE);
    const end = Math.min(products.length - 1, centerIndex + PREFETCH_DISTANCE);

    const promises: Promise<ProductDetail | null>[] = [];
    for (let i = start; i <= end; i++) {
      const productId = products[i].id;
      if (!detailCache.current.has(productId)) {
        promises.push(fetchProductDetail(productId));
      }
    }

    await Promise.all(promises);
  }, [products, fetchProductDetail]);

  const loadMoreProducts = useCallback(async () => {
    if (isLoading || !hasMore) return;

    loadMoreControllerRef.current?.abort();
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;

    setIsLoading(true);
    try {
      const nextPage = currentPage + 1;
      const params = new URLSearchParams(internalSearchParams);
      params.set('page', nextPage.toString());
      params.set('pageSize', PAGE_SIZE.toString());

      const res = await fetch(`/api/products?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Failed to load more products');

      const data = await res.json();

      if (controller.signal.aborted) return;

      const newProducts = data.products as Product[];

      if (newProducts.length > 0) {
        setProducts(prev => [...prev, ...newProducts]);
        setCurrentPage(nextPage);
        setHasMore(products.length + newProducts.length < data.total);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Failed to load more products:', error);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [isLoading, hasMore, currentPage, internalSearchParams, products.length]);

  const handleAddTag = useCallback(async (tagName: string) => {
    if (currentTags.includes(tagName)) return;

    loadMoreControllerRef.current?.abort();
    tagSearchControllerRef.current?.abort();
    const controller = new AbortController();
    tagSearchControllerRef.current = controller;

    const newTags = [...currentTags, tagName];
    setCurrentTags(newTags);

    const newParams = new URLSearchParams(internalSearchParams);
    // カンマ区切り形式に統一（SearchResultsでget('tags').split(',')として解析される）
    newParams.set('tags', newTags.join(','));
    newParams.delete('page');
    setInternalSearchParams(newParams);

    const newUrl = `/search?${newParams.toString()}`;
    router.push(newUrl, { scroll: false });

    detailCache.current.clear();
    setLoadedDetails(new Map());
    setCurrentPage(1);
    setCurrentIndex(0);
    setIsLoading(false);

    try {
      const fetchParams = new URLSearchParams(newParams);
      fetchParams.set('pageSize', PAGE_SIZE.toString());

      const res = await fetch(`/api/products?${fetchParams.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Failed to fetch products with new tag');

      const data = await res.json();

      if (controller.signal.aborted) return;

      const newProducts = data.products as Product[];

      setProducts(newProducts);
      setHasMore(newProducts.length < data.total);

      if (emblaApi) {
        emblaApi.scrollTo(0, true);
      }

      if (newProducts.length > 0) {
        prefetchDetails(0);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Failed to fetch products with new tag:', error);
    }
  }, [currentTags, internalSearchParams, router, emblaApi, prefetchDetails]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      setCurrentIndex(index);
      prefetchDetails(index);

      if (index >= products.length - PREFETCH_DISTANCE) {
        loadMoreProducts();
      }
    };

    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, prefetchDetails, loadMoreProducts, products.length]);

  useEffect(() => {
    if (products.length > 0) {
      prefetchDetails(0);
    }
  }, [prefetchDetails, products.length]);

  useEffect(() => {
    const handlePopState = () => {
      onClose();
    };

    history.pushState({ reelsMode: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    return () => {
      loadMoreControllerRef.current?.abort();
      tagSearchControllerRef.current?.abort();
    };
  }, []);

  if (products.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4 z-10 h-10 w-10"
          onClick={onClose}
          aria-label="閉じる"
        >
          <X className="h-6 w-6" />
        </Button>
        <p className="text-muted-foreground">商品が見つかりませんでした</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-4 z-10 h-10 w-10 bg-background/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="閉じる"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <X className="h-6 w-6" />
      </Button>

      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full flex-col">
          {products.map((product, index) => {
            const detail = loadedDetails.get(product.id);
            const isVisible = Math.abs(index - currentIndex) <= 1;

            return (
              <div
                key={product.id}
                className="h-full w-full flex-shrink-0"
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              >
                {isVisible ? (
                  detail ? (
                    <ReelsCard
                      product={product}
                      detail={detail}
                      currentTags={currentTags}
                      onAddTag={handleAddTag}
                    />
                  ) : (
                    <ReelsCardSkeleton product={product} />
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
