"use client";

import React, { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TagEditor from "@/components/TagEditor";
import TagEditHistoryItem from "@/components/TagEditHistoryItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TagDetailModal } from '@/components/TagDetailModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import ProductDetailSkeleton from '@/components/ProductDetailSkeleton';
import MobileProductActions from '@/components/MobileProductActions';
import MobileTagSheet from '@/components/MobileTagSheet';
import { TagList } from "@/components/TagList";
import { ProductTag, TagEditHistory } from "@/types/product";


interface ProductDetail {
  id: string;
  boothJpUrl: string;
  boothEnUrl: string;
  title: string;
  description: string | null;
  seller: {
    name: string;
    iconUrl: string | null;
    sellerUrl: string;
  } | null;
  isLiked?: boolean;
  isOwned?: boolean;
  images: {
    imageUrl: string;
    caption: string | null;
    order: number;
    isMain: boolean;
  }[];
  productTags: ProductTag[];
  tagEditHistory: TagEditHistory[];
};

const ProductDetailPage = () => {
  const params = useParams();
  const productId = params.productId as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [tagMap, setTagMap] = useState<{ [key: string]: { name: string; displayName: string | null } }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isOwned, setIsOwned] = useState(false);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const [isProcessingOwn, setIsProcessingOwn] = useState(false);
  const [isTagSheetOpen, setIsTagSheetOpen] = useState(false);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const { product: productData, tagIdToNameMap } = await response.json();
      setProduct(productData);
      setIsLiked(productData.isLiked || false);
      setIsOwned(productData.isOwned || false);
      setTagMap(tagIdToNameMap);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId, fetchProduct]);

  const [thumbnailApi, setThumbnailApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onThumbClick = useCallback(
    (index: number) => {
      if (!api || !thumbnailApi) return;
      api.scrollTo(index);
    },
    [api, thumbnailApi]
  );

  const onSelect = useCallback(() => {
    if (!api || !thumbnailApi) return;
    setSelectedIndex(api.selectedScrollSnap());
    thumbnailApi.scrollTo(api.selectedScrollSnap());
  }, [api, thumbnailApi, setSelectedIndex]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
  }, [api, onSelect]);

  const handleViewTagDetails = (tagId: string) => {
    setSelectedTagId(tagId);
    setIsDetailModalOpen(true);
  };

  const updateSearchTagsInSessionStorage = (tags: string[], negativeTags: string[]) => {
    sessionStorage.setItem('polyseek-search-tags', JSON.stringify(tags));
    sessionStorage.setItem('polyseek-search-negative-tags', JSON.stringify(negativeTags));
    // Optionally, you can dispatch a custom event to notify the header to update its state
    window.dispatchEvent(new Event('storage'));
  };

  const addTagToSearch = (tagName: string) => {
    const currentTags = JSON.parse(sessionStorage.getItem('polyseek-search-tags') || '[]');
    const currentNegativeTags = JSON.parse(sessionStorage.getItem('polyseek-search-negative-tags') || '[]');

    // もしネガティブタグに存在すれば、そこから削除する
    const newNegativeTags = currentNegativeTags.filter((t: string) => t !== tagName);

    // ポジティブタグに追加（重複は避ける）
    const newTags = currentTags.includes(tagName) ? currentTags : [...currentTags, tagName];

    updateSearchTagsInSessionStorage(newTags, newNegativeTags);
  };

  const addNegativeTagToSearch = (tagName: string) => {
    const currentTags = JSON.parse(sessionStorage.getItem('polyseek-search-tags') || '[]');
    const currentNegativeTags = JSON.parse(sessionStorage.getItem('polyseek-search-negative-tags') || '[]');

    // もしポジティブタグに存在すれば、そこから削除する
    const newTags = currentTags.filter((t: string) => t !== tagName);

    // ネガティブタグに追加（重複は避ける）
    const newNegativeTags = currentNegativeTags.includes(tagName) ? currentNegativeTags : [...currentNegativeTags, tagName];

    updateSearchTagsInSessionStorage(newTags, newNegativeTags);
  };

  const translateErrorMessage = (message: string): string => {
    if (message.includes('URL-like strings are not allowed')) {
      const tagName = message.match(/Invalid tag "([^"]+)"/)?.[1];
      return `タグ「${tagName}」の更新に失敗しました: URL形式の文字列は許可されていません。`;
    }
    if (message.includes('Input is empty after sanitization')) {
      const tagName = message.match(/Invalid tag "([^"]+)"/)?.[1];
      return `タグ「${tagName}」の更新に失敗しました: タグ名が空です。`;
    }
    // Add other translations here if needed
    return message;
  };

  const handleTagsUpdate = async (data: { tags: { id: string; name: string; }[], comment: string }) => {
    try {
      const response = await fetch(`/api/products/${productId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: data.tags, comment: data.comment }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      // 成功した場合のみダイアログを閉じ、データを再取得
      await fetchProduct();
      setIsTagEditorOpen(false);
      console.log("Tags updated successfully!");

    } catch (err) {
      console.error("Failed to update tags:", err);
      if (err instanceof Error) {
        const translatedMessage = translateErrorMessage(err.message);
        alert(`タグの更新に失敗しました: ${translatedMessage}`);
      } else {
        alert('タグの更新に失敗しました: 不明なエラーが発生しました。');
      }
    }
  };

  const handleLikeToggle = async () => {
    if (isProcessingLike) return;
    setIsProcessingLike(true);
    const originalIsLiked = isLiked;
    setIsLiked(!originalIsLiked);

    try {
      const response = await fetch(`/api/products/${productId}/like`, {
        method: !originalIsLiked ? 'POST' : 'DELETE',
        
      });

      // 401 Unauthorized or Redirect (unexpected for API) means we should revert
      if (response.status === 401 || response.redirected) {
        setIsLiked(originalIsLiked);
        if (response.status === 401) {
          alert('この操作を行うにはログインが必要です。');
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 成功時は何もしない（楽観的更新を維持）
    } catch (error) {
      console.error("Failed to toggle like status:", error);
      setIsLiked(originalIsLiked);
    } finally {
      setIsProcessingLike(false);
    }
  };

  const handleOwnToggle = async () => {
    if (isProcessingOwn) return;
    setIsProcessingOwn(true);
    const originalIsOwned = isOwned;
    setIsOwned(!originalIsOwned);
    try {
      const response = await fetch(`/api/products/${productId}/own`, {
        method: !originalIsOwned ? 'POST' : 'DELETE',
      });
      // 401 Unauthorized or Redirect (unexpected for API) means we should revert
      if (response.status === 401 || response.redirected) {
        setIsOwned(originalIsOwned);
        if (response.status === 401) {
          alert('この操作を行うにはログインが必要です。');
        }
        return;
      }
      if (!response.ok) setIsOwned(originalIsOwned);
    } catch (error) {
      console.error("Failed to toggle owned status:", error);
      setIsOwned(originalIsOwned);
    } finally {
      setIsProcessingOwn(false);
    }
  };

  if (loading) return <ProductDetailSkeleton />;
  if (error) return <div className="container mx-auto px-4 py-8 text-center text-red-500">Error: {error}</div>;
  if (!product) return <div className="container mx-auto px-4 py-8 text-center">商品が見つかりませんでした。</div>;

  const polyseekTags = product.productTags?.filter(pt => !pt.isOfficial) || [];
  const officialTags = product.productTags?.filter(pt => pt.isOfficial) || [];


  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <main className="lg:col-span-8">
            <div className="mb-6">
              <h1 className="text-3xl lg:text-4xl font-extrabold mb-3 tracking-tight text-gray-900 dark:text-gray-50" aria-label={product.title}>{product.title}</h1>
              {product.seller && (
                <a href={product.seller.sellerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 hover:underline">
                  <Image
                    src={product.seller.iconUrl || '/images/PolySeek_10_export_icon.svg'}
                    alt={product.seller.name}
                    width={28} height={28} className="rounded-full"
                  />
                  <span className="font-semibold">{product.seller.name}</span>
                </a>
              )}
            </div>

            {product.images && product.images.length > 0 && (
              <section className="mb-8">
                <Carousel setApi={setApi} className="w-full rounded-lg overflow-hidden border dark:border-gray-800">
                  <CarouselContent>
                    {product.images.map((image, index) => (
                      <CarouselItem key={index} className="aspect-video flex justify-center items-center bg-gray-100 dark:bg-gray-900">
                        <Image src={image.imageUrl} alt={`商品画像 ${index + 1}`} width={800} height={450} className="max-w-full h-auto max-h-[70vh] object-contain"/>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-4 size-12 lg:size-8" />
                  <CarouselNext className="right-4 size-12 lg:size-8" />
                </Carousel>
                <Carousel setApi={setThumbnailApi} opts={{ containScroll: 'keepSnaps', dragFree: true }} className="w-full mt-4">
                  <CarouselContent className="-ml-2">
                    {product.images.map((image, index) => (
                      <CarouselItem key={index} onClick={() => onThumbClick(index)} className="pl-2 basis-1/4 md:basis-1/5 lg:basis-1/6">
                        <div className={`aspect-square rounded-md overflow-hidden cursor-pointer transition-all ${index === selectedIndex ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-950' : 'opacity-60 hover:opacity-100'}`}>
                          <Image src={image.imageUrl} alt={`サムネイル ${index + 1}`} width={100} height={100} className="w-full h-full object-cover"/>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </section>
            )}

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4 border-b pb-2 dark:border-gray-700">説明</h2>
              {product.description ? (
                <div className="prose dark:prose-invert max-w-none break-words bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg border dark:border-gray-800">
                  <ReactMarkdown>{product.description}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">説明文はありません。</p>
              )}
            </section>
          </main>

          <aside className="hidden lg:block lg:col-span-4">
            <div className="lg:sticky lg:top-header-desktop space-y-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-700">
                <h2 className="text-xl font-semibold mb-4">アクション</h2>
                <div className="space-y-3">
                  <Button onClick={handleLikeToggle} disabled={isProcessingLike} variant={isLiked ? "default" : "outline"} className="w-full justify-start">
                    <Heart className="mr-2 h-4 w-4" fill={isLiked ? "currentColor" : "none"} />
                    {isLiked ? '欲しいものから外す' : '欲しいものに追加'}
                  </Button>
                  <Button onClick={handleOwnToggle} disabled={isProcessingOwn} variant={isOwned ? "default" : "outline"} className="w-full justify-start">
                    <Check className="mr-2 h-4 w-4" />
                    {isOwned ? '所有済みから外す' : '所有済みにする'}
                  </Button>
                  <a href={product.boothJpUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full justify-start">
                      <FontAwesomeIcon icon={faLink} className="mr-2" />
                      Boothで見る (JP)
                    </Button>
                  </a>
                </div>
              </div>

              {/* PolySeekタグ（独自タグ）ブロック */}
              <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-300">PolySeekタグ</h2>
                  <Dialog open={isTagEditorOpen} onOpenChange={setIsTagEditorOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">編集</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader><DialogTitle>タグを編集</DialogTitle></DialogHeader>
                      <TagEditor initialTags={polyseekTags.map(pt => pt.tag)} onTagsChange={handleTagsUpdate} />
                    </DialogContent>
                  </Dialog>
                </div>
                <TooltipProvider>
                  {polyseekTags.length > 0 ? (
                    <ScrollArea className="h-48">
                       <TagList
                          tags={polyseekTags.map(pt => pt.tag)}
                          onAddTagToSearch={addTagToSearch}
                          onAddNegativeTagToSearch={addNegativeTagToSearch}
                          onViewTagDetails={handleViewTagDetails}
                          variant="manual"
                          viewMode="desktop"
                        />
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg text-sm text-blue-600 dark:text-blue-400">
                      <p>PolySeekタグはまだありません。</p>
                      <Button variant="link" className="text-blue-600 dark:text-blue-400" onClick={() => setIsTagEditorOpen(true)}>タグを追加する</Button>
                    </div>
                  )}
                </TooltipProvider>
                <div className="mt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" disabled={!product.tagEditHistory || product.tagEditHistory.length === 0}>
                        タグ編集履歴を閲覧
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-xl lg:max-w-3xl h-[90vh] flex flex-col">
                      <DialogHeader className="flex-shrink-0"><DialogTitle>タグ編集履歴</DialogTitle></DialogHeader>
                      <div className="flex-grow min-h-0">
                        <ScrollArea className="h-full">
                          <div className="space-y-4 pr-6">
                            {product.tagEditHistory?.length > 0 ? (
                              product.tagEditHistory.map((history) => (
                                <TagEditHistoryItem key={history.id} history={history} tagMap={tagMap} />
                              ))
                            ) : (
                              <p>編集履歴はありません。</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* 公式タグ（BOOTH由来）ブロック */}
              {officialTags.length > 0 && (
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-4">公式タグ（BOOTH由来）</h2>
                  <TooltipProvider>
                    <ScrollArea className="h-32">
                        <TagList
                          tags={officialTags.map(pt => pt.tag)}
                          onAddTagToSearch={addTagToSearch}
                          onAddNegativeTagToSearch={addNegativeTagToSearch}
                          onViewTagDetails={handleViewTagDetails}
                          variant="official"
                          viewMode="desktop"
                        />
                    </ScrollArea>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
      <TagDetailModal tagId={selectedTagId} open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen} />

      {/* モバイル用フローティングアクション */}
      <MobileProductActions
        isLiked={isLiked}
        isOwned={isOwned}
        isProcessingLike={isProcessingLike}
        isProcessingOwn={isProcessingOwn}
        onLikeToggle={handleLikeToggle}
        onOwnToggle={handleOwnToggle}
        boothJpUrl={product.boothJpUrl}
        tagCount={product.productTags?.length || 0}
        onOpenTags={() => setIsTagSheetOpen(true)}
      />

      {/* モバイル用タグシート */}
      <MobileTagSheet
        open={isTagSheetOpen}
        onOpenChange={setIsTagSheetOpen}
        productTags={product.productTags || []}
        tagMap={tagMap}
        tagEditHistory={product.tagEditHistory || []}
        onAddTagToSearch={addTagToSearch}
        onAddNegativeTagToSearch={addNegativeTagToSearch}
        onViewTagDetails={handleViewTagDetails}
        onTagsUpdate={handleTagsUpdate}
      />
    </>
  );
};

export default ProductDetailPage;