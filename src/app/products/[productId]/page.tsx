"use client"; // Client Componentとしてマーク

import React, { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams, useRouter, useSearchParams } from 'next/navigation'; // useRouterとuseSearchParamsを追加
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
import TagEditor from "@/components/TagEditor"; // TagEditorコンポーネントをインポート
import TagEditHistoryItem from "@/components/TagEditHistoryItem"; // TagEditHistoryItemコンポーネントをインポート
import { ScrollArea } from "@/components/ui/scroll-area"; // ScrollAreaをインポート
import { PlusCircle, MinusCircle, Info } from 'lucide-react'; // アイコンをインポート

interface ProductDetail {
  id: string;
  boothJpUrl: string;
  boothEnUrl: string;
  title: string;
  description: string | null;
  images: {
    imageUrl: string;
    caption: string | null;
    order: number;
    isMain: boolean;
  }[];
  productTags: { // 商品に紐づくタグ情報
    tag: { // タグ情報
      id: string;
      name: string;
      tagCategoryId: string;
      tagCategory: { // タグカテゴリ情報
        id: string;
        name: string;
      };
    };
  }[];
  tagEditHistory: { // タグ編集履歴
    id: string;
    editor: { // 編集者情報
      id: string;
      name: string | null;
      image: string | null;
    };
    version: number;
    addedTags: string[]; // 追加されたタグのID配列
    removedTags: string[]; // 削除されたタグのID配列
    keptTags: string[]; // 維持されたタグのID配列
    comment: string | null;
    score: number;
    createdAt: string; // ISO文字列として取得
  }[];
};

const ProductDetailPage = () => {
  const params = useParams();
  const productId = params.productId as string; // URLからproductIdを取得

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data: ProductDetail = await response.json();
      setProduct(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId, fetchProduct]);

  useEffect(() => {
    if (!api) {
      return;
    }
    setSlideCount(api.scrollSnapList().length);
    setCurrentSlide(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  const router = useRouter();
  const searchParams = useSearchParams();

  const updateQueryParams = useCallback((newTags: string[], newNegativeTags: string[]) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    if (newTags.length > 0) {
      currentParams.set('tags', newTags.join(','));
    } else {
      currentParams.delete('tags');
    }
    if (newNegativeTags.length > 0) {
      currentParams.set('negativeTags', newNegativeTags.join(','));
    } else {
      currentParams.delete('negativeTags');
    }
    // 検索ページに遷移せず、現在のページのURLクエリパラメータのみを更新
    router.push(`?${currentParams.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const addTagToSearch = (tagName: string) => {
    const currentTags = searchParams.get('tags')?.split(',').filter(tag => tag.length > 0) || [];
    const currentNegativeTags = searchParams.get('negativeTags')?.split(',').filter(tag => tag.length > 0) || [];

    if (!currentTags.includes(tagName)) {
      const newTags = [...currentTags, tagName];
      updateQueryParams(newTags, currentNegativeTags);
    }
  };

  const addNegativeTagToSearch = (tagName: string) => {
    const currentTags = searchParams.get('tags')?.split(',').filter(tag => tag.length > 0) || [];
    const currentNegativeTags = searchParams.get('negativeTags')?.split(',').filter(tag => tag.length > 0) || [];

    if (!currentNegativeTags.includes(tagName) && !currentTags.includes(tagName)) {
      const newNegativeTags = [...currentNegativeTags, tagName];
      updateQueryParams(currentTags, newNegativeTags);
    }
  };

  const handleTagsUpdate = async (newTags: { id: string; name: string; }[]) => {
    try {
      const response = await fetch(`/api/products/${productId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });

      if (!response.ok) throw new Error(`Error: ${response.status}`);

      await fetchProduct(); // 商品情報を再フェッチ
      setIsTagEditorOpen(false); // モーダルを閉じる
      console.log("Tags updated successfully!");
    } catch (err) {
      console.error("Failed to update tags:", err);
      // TODO: ユーザーへのエラー通知
    }
  };

  const handleVote = async (historyId: string, score: number) => {
    try {
      const response = await fetch(`/api/tag-edit-history/${historyId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      // For simplicity and accuracy, let's just refetch the product data
      // to get the latest scores.
      fetchProduct();

    } catch (err) {
      console.error("Failed to vote:", err);
      // TODO: Show error to user
    }
  };


 if (loading) {
    return <div className="container mx-auto px-4 py-8 pt-40 text-center">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto px-4 py-8 pt-40 text-center text-red-500">Error: {error}</div>;
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-8 pt-40 text-center">Product not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* === メインコンテンツエリア === */}
        <main className="lg:col-span-9">
          <h1 className="text-3xl font-extrabold mb-4 tracking-tight">{product.title}</h1>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">商品ID: {product.id}</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Booth URL</h2>
            <div className="space-y-1 text-sm">
              <p>日本語版: <a href={product.boothJpUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{product.boothJpUrl}</a></p>
              <p>英語版: <a href={product.boothEnUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{product.boothEnUrl}</a></p>
            </div>
          </section>

          {product.images && product.images.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">商品画像</h2>
              <Carousel setApi={setApi} opts={{ loop: true }} className="w-full max-w-2xl mx-auto">
                <CarouselContent>
                  {product.images.map((image, index) => (
                    <CarouselItem key={index} className="flex justify-center items-center">
                      <Image src={image.imageUrl} alt={image.caption || `商品画像 ${index + 1}`} width={600} height={600} className="max-w-full h-auto max-h-[600px] object-contain rounded-lg shadow-md"/>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: slideCount }).map((_, index) => (
                  <button
                    key={index}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      index === currentSlide - 1 ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                    }`}
                    onClick={() => api?.scrollTo(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Description</h2>
            {product.description ? (
              <div className="prose dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border dark:border-gray-700">
                <ReactMarkdown>{product.description}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Descriptionはありません。</p>
            )}
          </section>
        </main>

        {/* === 右サイドバー (タグリスト) === */}
        <aside className="lg:col-span-3">
          <div className="sticky top-32">
            <h2 className="text-xl font-semibold mb-4">タグ</h2>
            {product.productTags && product.productTags.length > 0 ? (
              <div className="flex flex-col h-full">
                <ScrollArea className="flex-grow h-[calc(100vh-350px)] w-full rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800/50">
                  <div className="p-2">
                    {product.productTags.map(({ tag }) => (
                      <div key={tag.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent dark:hover:bg-gray-700/50 transition-colors">
                        <span className="text-sm font-medium pr-2">{tag.name}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50" onClick={() => addNegativeTagToSearch(tag.name)}>
                            <MinusCircle size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/50" onClick={() => addTagToSearch(tag.name)}>
                            <PlusCircle size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50">
                            <Info size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-4 flex-shrink-0 space-y-2">
                  <Dialog open={isTagEditorOpen} onOpenChange={setIsTagEditorOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">タグを編集</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>タグを編集</DialogTitle>
                      </DialogHeader>
                      {product.productTags && (
                        <TagEditor
                          initialTags={product.productTags.map(pt => pt.tag)}
                          onTagsChange={handleTagsUpdate}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" disabled={!product.tagEditHistory || product.tagEditHistory.length === 0}>
                        タグ編集履歴を閲覧
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>タグ編集履歴</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="flex-grow">
                        <div className="space-y-4 pr-6">
                          {product.tagEditHistory && product.tagEditHistory.length > 0 ? (
                            product.tagEditHistory.map((history) => (
                              <TagEditHistoryItem
                                key={history.id}
                                history={history}
                                onVote={handleVote}
                              />
                            ))
                          ) : (
                            <p>編集履歴はありません。</p>
                          )}
                        </div>
                      </ScrollArea>
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
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProductDetailPage;
