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
import { PlusCircle, MinusCircle, Info, Heart, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TagDetailModal } from '@/components/TagDetailModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { OnboardingTour } from '@/components/OnboardingTour';
import { productPageSteps } from '@/lib/onboarding/productPageSteps';
import { faLink } from '@fortawesome/free-solid-svg-icons';

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
  productTags: {
    tag: {
      id: string;
      name: string;
      description: string | null;
      tagCategoryId: string;
      tagCategory: {
        id: string;
        name: string;
      };
    };
  }[];
  tagEditHistory: {
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
  }[];
};

const ProductDetailPage = () => {
  const params = useParams();
  const productId = params.productId as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [tagMap, setTagMap] = useState<{ [key: string]: string }>({});
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

  const handleTagsUpdate = async (data: { tags: { id: string; name: string; }[], comment: string }) => {
    try {
      const response = await fetch(`/api/products/${productId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: data.tags, comment: data.comment }),
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      await fetchProduct();
      setIsTagEditorOpen(false);
      console.log("Tags updated successfully!");
    } catch (err) {
      console.error("Failed to update tags:", err);
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
      if (!response.ok) setIsLiked(originalIsLiked);
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
      if (!response.ok) setIsOwned(originalIsOwned);
    } catch (error) {
      console.error("Failed to toggle owned status:", error);
      setIsOwned(originalIsOwned);
    } finally {
      setIsProcessingOwn(false);
    }
  };

  if (loading) return <div className="container mx-auto px-4 py-8 pt-40 text-center">Loading...</div>;
  if (error) return <div className="container mx-auto px-4 py-8 pt-40 text-center text-red-500">Error: {error}</div>;
  if (!product) return <div className="container mx-auto px-4 py-8 pt-40 text-center">Product not found.</div>;

  return (
    <>
      <OnboardingTour tourKey="product-page" steps={productPageSteps} />
      <div className="container mx-auto px-4 py-8 pt-40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <main className="lg:col-span-8">
            <div className="mb-6">
              <h1 className="text-3xl lg:text-4xl font-extrabold mb-3 tracking-tight text-gray-900 dark:text-gray-50">{product.title}</h1>
              {product.seller && (
                <a href={product.seller.sellerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 hover:underline">
                  <Image
                    src={product.seller.iconUrl || '/pslogo.svg'}
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
                  <CarouselPrevious className="left-4" />
                  <CarouselNext className="right-4" />
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
              <h2 className="text-2xl font-bold mb-4 border-b pb-2 dark:border-gray-700">Description</h2>
              {product.description ? (
                <div className="prose dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg border dark:border-gray-800">
                  <ReactMarkdown>{product.description}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Descriptionはありません。</p>
              )}
            </section>
          </main>

          <aside className="lg:col-span-4">
            <div className="sticky top-32 space-y-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-700">
                <h2 className="text-xl font-semibold mb-4">アクション</h2>
                <div className="space-y-3">
                  <Button data-tour="like-button" onClick={handleLikeToggle} disabled={isProcessingLike} variant={isLiked ? "default" : "outline"} className="w-full justify-start">
                    <Heart className="mr-2 h-4 w-4" fill={isLiked ? "currentColor" : "none"} />
                    {isLiked ? '欲しいものから外す' : '欲しいものに追加'}
                  </Button>
                  <Button data-tour="own-button" onClick={handleOwnToggle} disabled={isProcessingOwn} variant={isOwned ? "default" : "outline"} className="w-full justify-start">
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

              <div data-tour="tags-list" className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">タグ</h2>
                  <Dialog open={isTagEditorOpen} onOpenChange={setIsTagEditorOpen}>
                    <DialogTrigger asChild>
                      <Button data-tour="edit-tags-button" variant="outline" size="sm">編集</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader><DialogTitle>タグを編集</DialogTitle></DialogHeader>
                      {product.productTags && <TagEditor initialTags={product.productTags.map(pt => pt.tag)} onTagsChange={handleTagsUpdate} />}
                    </DialogContent>
                  </Dialog>
                </div>
                <TooltipProvider>
                  {product.productTags && product.productTags.length > 0 ? (
                    <div className="flex flex-col">
                      <ScrollArea className="h-64 w-full">
                        <div className="pr-4 space-y-1">
                          {product.productTags.map(({ tag }) => (
                            <div key={tag.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent dark:hover:bg-gray-700/50 transition-colors">
                              <span className="text-sm font-medium pr-2">{tag.name}</span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50" onClick={() => addNegativeTagToSearch(tag.name)}><MinusCircle size={16} /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/50" onClick={() => addTagToSearch(tag.name)}><PlusCircle size={16} /></Button>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50" onClick={() => handleViewTagDetails(tag.id)}><Info size={16} /></Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{tag.description || 'No description available.'}</p></TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="mt-4 flex-shrink-0">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button data-tour="tag-history-button" variant="outline" className="w-full" disabled={!product.tagEditHistory || product.tagEditHistory.length === 0}>
                              タグ編集履歴を閲覧
                            </Button>
                          </DialogTrigger>
                           <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
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
                  ) : (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg text-sm text-gray-500 dark:text-gray-400">
                      <p>この商品にはまだタグがありません。</p>
                      <Button variant="link" onClick={() => setIsTagEditorOpen(true)}>最初のタグを追加する</Button>
                    </div>
                  )}
                </TooltipProvider>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <TagDetailModal tagId={selectedTagId} open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen} />
    </>
  );
};

export default ProductDetailPage;