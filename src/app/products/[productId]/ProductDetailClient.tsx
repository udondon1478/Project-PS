"use client";

import React, { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { TagDetailModal } from '@/components/TagDetailModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import MobileProductActions from '@/components/MobileProductActions';
import MobileTagSheet from '@/components/MobileTagSheet';
import { TagList } from "@/components/TagList";

interface ProductTagData {
  tag: {
    id: string;
    name: string;
    displayName?: string | null;
    description: string | null;
    tagCategoryId: string | null;
    tagCategory: {
      id: string;
      name: string;
      color?: string;
    };
  };
  isOfficial: boolean;
}

interface TagEditHistoryData {
  id: string;
  editor: {
    id: string;
    name: string | null;
    image: string | null;
  };
  version: number;
  addedTags: string[];
  removedTags: string[];
  keptTags: string[];
  comment: string | null;
  score: number;
  createdAt: string;
  userVote: { score: number } | null;
}

interface ProductDetailData {
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
  productTags: ProductTagData[];
  tagEditHistory: TagEditHistoryData[];
}

interface ProductDetailClientProps {
  initialProduct: ProductDetailData;
  initialTagMap: { [key: string]: { name: string; displayName: string | null } };
}

const ProductDetailClient = ({ initialProduct, initialTagMap }: ProductDetailClientProps) => {
  const [product, setProduct] = useState<ProductDetailData>(initialProduct);
  const [tagMap, setTagMap] = useState<{ [key: string]: { name: string; displayName: string | null } }>(initialTagMap);
  const [api, setApi] = useState<CarouselApi>();
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(initialProduct.isLiked || false);
  const [isOwned, setIsOwned] = useState(initialProduct.isOwned || false);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const [isProcessingOwn, setIsProcessingOwn] = useState(false);
  const [isTagSheetOpen, setIsTagSheetOpen] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      const response = await fetch(`/api/products/${product.id}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const { product: productData, tagIdToNameMap } = await response.json();
      setProduct(productData);
      setIsLiked(productData.isLiked || false);
      setIsOwned(productData.isOwned || false);
      setTagMap(tagIdToNameMap);
    } catch (err: unknown) {
      console.error('Failed to refresh product data:', err);
    }
  }, [product.id]);

  const [thumbnailApi, setThumbnailApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onThumbClick = useCallback(
    (index: number) => {
      // Both APIs must be ready for synchronized scrolling between main and thumbnail carousels
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
    return () => {
      api?.off("select", onSelect);
      api?.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  const handleViewTagDetails = (tagId: string) => {
    setSelectedTagId(tagId);
    setIsDetailModalOpen(true);
  };

  const updateSearchTagsInSessionStorage = (tags: string[], negativeTags: string[]) => {
    try {
      sessionStorage.setItem('polyseek-search-tags', JSON.stringify(tags));
      sessionStorage.setItem('polyseek-search-negative-tags', JSON.stringify(negativeTags));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('Failed to update sessionStorage:', e);
    }
  };

  const addTagToSearch = (tagName: string) => {
    try {
      const currentTags = JSON.parse(sessionStorage.getItem('polyseek-search-tags') || '[]');
      const currentNegativeTags = JSON.parse(sessionStorage.getItem('polyseek-search-negative-tags') || '[]');
      const newNegativeTags = currentNegativeTags.filter((t: string) => t !== tagName);
      const newTags = currentTags.includes(tagName) ? currentTags : [...currentTags, tagName];
      updateSearchTagsInSessionStorage(newTags, newNegativeTags);
    } catch (e) {
      console.warn('Failed to access sessionStorage:', e);
    }
  };

  const addNegativeTagToSearch = (tagName: string) => {
    try {
      const currentTags = JSON.parse(sessionStorage.getItem('polyseek-search-tags') || '[]');
      const currentNegativeTags = JSON.parse(sessionStorage.getItem('polyseek-search-negative-tags') || '[]');
      const newTags = currentTags.filter((t: string) => t !== tagName);
      const newNegativeTags = currentNegativeTags.includes(tagName) ? currentNegativeTags : [...currentNegativeTags, tagName];
      updateSearchTagsInSessionStorage(newTags, newNegativeTags);
    } catch (e) {
      console.warn('Failed to access sessionStorage:', e);
    }
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
    return message;
  };

  const handleTagsUpdate = async (data: { tags: { id: string; name: string; }[], comment: string }) => {
    try {
      const response = await fetch(`/api/products/${product.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: data.tags, comment: data.comment }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

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
      const response = await fetch(`/api/products/${product.id}/like`, {
        method: !originalIsLiked ? 'POST' : 'DELETE',
      });

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
      const response = await fetch(`/api/products/${product.id}/own`, {
        method: !originalIsOwned ? 'POST' : 'DELETE',
      });
      if (response.status === 401 || response.redirected) {
        setIsOwned(originalIsOwned);
        if (response.status === 401) {
          alert('この操作を行うにはログインが必要です。');
        }
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to toggle owned status:", error);
      setIsOwned(originalIsOwned);
    } finally {
      setIsProcessingOwn(false);
    }
  };

  // Normalize productTags for compatibility with external components:
  // - displayName: null → undefined (optional field)
  // - tagCategoryId: null → '' (ProductTag type requires string for type safety)
  const normalizeProductTag = (pt: ProductTagData) => ({
    isOfficial: pt.isOfficial,
    tag: {
      id: pt.tag.id,
      name: pt.tag.name,
      displayName: pt.tag.displayName ?? undefined,
      description: pt.tag.description,
      tagCategoryId: pt.tag.tagCategoryId ?? '',
      tagCategory: pt.tag.tagCategory,
    },
  });

  const normalizedProductTags = product.productTags?.map(normalizeProductTag) || [];
  const polyseekTags = normalizedProductTags.filter(pt => !pt.isOfficial);
  const officialTags = normalizedProductTags.filter(pt => pt.isOfficial);


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
                      <CarouselItem key={index} className="pl-2 basis-1/4 md:basis-1/5 lg:basis-1/6">
                        <button
                          type="button"
                          onClick={() => onThumbClick(index)}
                          aria-label={`サムネイル ${index + 1}`}
                          aria-pressed={index === selectedIndex}
                          className={`aspect-square w-full rounded-md overflow-hidden transition-all ${index === selectedIndex ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-950' : 'opacity-60 hover:opacity-100'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
                        >
                          <Image src={image.imageUrl} alt={`サムネイル ${index + 1}`} width={100} height={100} className="w-full h-full object-cover"/>
                        </button>
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
            <div className="lg:sticky lg:top-header-desktop lg:max-h-[calc(100vh-var(--header-height-desktop))] lg:overflow-y-auto space-y-6">
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
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={product.boothJpUrl} target="_blank" rel="noopener noreferrer">
                      <FontAwesomeIcon icon={faLink} className="mr-2" />
                      Boothで見る (JP)
                    </a>
                  </Button>
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
                      <TagEditor initialTags={polyseekTags.map(pt => ({
                        id: pt.tag.id,
                        name: pt.tag.name,
                        displayName: pt.tag.displayName ?? undefined,
                      }))} onTagsChange={handleTagsUpdate} />
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
        productTags={normalizedProductTags}
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

export default ProductDetailClient;
