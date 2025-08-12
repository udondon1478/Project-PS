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
import { Button } from "@/components/ui/button"; // Buttonコンポーネントも必要
import TagEditor from "@/components/TagEditor"; // TagEditorコンポーネントをインポート

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

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        // 仮のAPIエンドポイントからデータを取得
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const text = await response.text();
        console.log("API Response:", text);
        const data: ProductDetail = JSON.parse(text);
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
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]); // productIdが変更されたら再フェッチ

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

  // URLのクエリパラメータを更新するヘルパー関数
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
    router.push(`?${currentParams.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // タグを検索クエリに追加する関数
  const addTagToSearch = (tagName: string) => {
    const currentTags = searchParams.get('tags')?.split(',').filter(tag => tag.length > 0) || [];
    const currentNegativeTags = searchParams.get('negativeTags')?.split(',').filter(tag => tag.length > 0) || [];

    if (!currentTags.includes(tagName)) {
      const newTags = [...currentTags, tagName];
      updateQueryParams(newTags, currentNegativeTags);
    }
  };

  // マイナス検索タグを検索クエリに追加する関数
  const addNegativeTagToSearch = (tagName: string) => {
    const currentTags = searchParams.get('tags')?.split(',').filter(tag => tag.length > 0) || [];
    const currentNegativeTags = searchParams.get('negativeTags')?.split(',').filter(tag => tag.length > 0) || [];

    if (!currentNegativeTags.includes(tagName)) {
      const newNegativeTags = [...currentNegativeTags, tagName];
      updateQueryParams(currentTags, newNegativeTags);
    }
  };


 if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!product) {
    return <div>Product not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-40">
      <h1 className="text-2xl font-bold mb-4">{product.title}</h1>
      <p className="mb-2">商品ID: {product.id}</p>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Booth URL</h2>
        <p>日本語版: <a href={product.boothJpUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{product.boothJpUrl}</a></p>
        <p>英語版: <a href={product.boothEnUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{product.boothEnUrl}</a></p>
      </div>

      {product.images && product.images.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">商品画像</h2>
          <Carousel setApi={setApi} opts={{ loop: true }}>
            <CarouselContent>
              {product.images.map((image, index) => (
                <CarouselItem key={index} className="flex justify-center items-center">
                  <Image src={image.imageUrl} alt={image.caption || `商品画像 ${index + 1}`} width={500} height={500} className="max-w-full h-auto max-h-96 object-contain"/>
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
                className={`w-2 h-2 rounded-full ${
                  index === currentSlide - 1 ? "bg-blue-500" : "bg-gray-300"
                }`}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Description (仮表示)</h2>
        {product.description ? (
          <div className="prose">
            <ReactMarkdown>{product.description}</ReactMarkdown>
          </div>
        ) : (
          <p>Descriptionはありません。</p>
        )}
      </div>

      {/* タグリスト表示 */}
      {product.productTags && product.productTags.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">タグ</h2>
          <div className="flex flex-wrap gap-2">
            {product.productTags.map(({ tag }) => (
              <div key={tag.id} className="flex items-center bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">
                <button onClick={() => addNegativeTagToSearch(tag.name)} className="mr-1 text-red-500 hover:text-red-700">-</button>
                <span>{tag.name}</span>
                <button onClick={() => addTagToSearch(tag.name)} className="ml-1 text-green-500 hover:text-green-700">+</button>
              </div>
            ))}
          </div>
          {/* タグ編集ボタンとモーダル */}
          <div className="mt-4">
            <Dialog open={isTagEditorOpen} onOpenChange={setIsTagEditorOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">タグを編集</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>タグを編集</DialogTitle>
                </DialogHeader>
                {product.productTags && (
                  <TagEditor
                    initialTags={product.productTags.map(pt => pt.tag)}
                    onTagsChange={async (newTags) => {
                      try {
                        const response = await fetch(`/api/products/${productId}/tags`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ tags: newTags }),
                        });

                        if (!response.ok) {
                          throw new Error(`Error: ${response.status}`);
                        }

                        // タグ更新成功後、商品情報を再フェッチしてUIを更新
                        const reFetchResponse = await fetch(`/api/products/${productId}`);
                        if (!reFetchResponse.ok) {
                          throw new Error(`Error re-fetching product: ${reFetchResponse.status}`);
                        }
                        const reFetchedData: ProductDetail = await reFetchResponse.json();
                        setProduct(reFetchedData);
                        setIsTagEditorOpen(false); // モーダルを閉じる

                        console.log("Tags updated successfully!");
                      } catch (err) {
                        console.error("Failed to update tags:", err);
                        // エラーハンドリング（ユーザーへの通知など）
                      }
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* タグ編集履歴表示 */}
      {product.tagEditHistory && product.tagEditHistory.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">タグ編集履歴</h2>
          <div className="space-y-4">
            {product.tagEditHistory.map((history) => (
              <div key={history.id} className="border p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">
                  バージョン: {history.version} | 編集者: {history.editor.name || '不明なユーザー'} |
                  日時: {new Date(history.createdAt).toLocaleString()}
                </p>
                {history.comment && (
                  <p className="mt-2 text-gray-700">コメント: {history.comment}</p>
                )}
                <div className="mt-2">
                  {history.addedTags.length > 0 && (
                    <p className="text-green-600">追加タグ: {history.addedTags.join(', ')}</p>
                  )}
                  {history.removedTags.length > 0 && (
                    <p className="text-red-600">削除タグ: {history.removedTags.join(', ')}</p>
                  )}
                  {history.keptTags.length > 0 && (
                    <p className="text-gray-600">維持タグ: {history.keptTags.join(', ')}</p>
                  )}
                </div>
                <div className="flex items-center mt-2">
                  <span className="font-semibold mr-2">評価: {history.score}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-2"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/tag-edit-history/${history.id}/vote`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ score: 1 }),
                        });
                        if (!response.ok) {
                          throw new Error(`Error: ${response.status}`);
                        }
                        console.log("Vote +1 recorded!");
                        // UIを更新するために再フェッチ
                        const reFetchResponse = await fetch(`/api/products/${productId}`);
                        if (!reFetchResponse.ok) {
                          throw new Error(`Error re-fetching product: ${reFetchResponse.status}`);
                        }
                        const reFetchedData: ProductDetail = await reFetchResponse.json();
                        setProduct(reFetchedData);
                      } catch (err) {
                        console.error("Failed to record vote:", err);
                      }
                    }}
                  >
                    👍
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/tag-edit-history/${history.id}/vote`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ score: -1 }),
                        });
                        if (!response.ok) {
                          throw new Error(`Error: ${response.status}`);
                        }
                        console.log("Vote -1 recorded!");
                        // UIを更新するために再フェッチ
                        const reFetchResponse = await fetch(`/api/products/${productId}`);
                        if (!reFetchResponse.ok) {
                          throw new Error(`Error re-fetching product: ${reFetchResponse.status}`);
                        }
                        const reFetchedData: ProductDetail = await reFetchResponse.json();
                        setProduct(reFetchedData);
                      } catch (err) {
                        console.error("Failed to record vote:", err);
                      }
                    }}
                  >
                    👎
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;