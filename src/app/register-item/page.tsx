'use client';

import { useState, useEffect, useRef } from 'react';
import { URLInputForm } from './components/URLInputForm';
import { ProductDetailsForm } from './components/ProductDetailsForm';
import { CompletionScreen } from './components/CompletionScreen';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

// 商品情報の型定義 (変更なし)
interface ProductInfo {
  id?: string;
  boothJpUrl: string;
  boothEnUrl: string;
  title: string;
  description: string;
  lowPrice: number;
  highPrice: number;
  publishedAt: string;
  sellerName: string;
  sellerUrl: string;
  sellerIconUrl: string;
  images: { imageUrl: string; isMain: boolean; order: number }[];
  ageRatingId?: string;
  categoryId?: string;
  productTags?: { tag: { id: string; name: string } }[];
}

// 画面の状態を示す型
type RegisterStep = 'url_input' | 'details_confirmation' | 'existing_product' | 'complete' | 'error';

async function getErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      const data = await response.json();
      return data.message || response.statusText;
    } catch (e) {
      return response.statusText;
    }
  }
  return response.text();
}

export default function RegisterItemPage() {
  const [step, setStep] = useState<RegisterStep>('url_input');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isUrlInputError, setIsUrlInputError] = useState(false);
  const [isDetailsError, setIsDetailsError] = useState(false);
  const [productData, setProductData] = useState<ProductInfo | null>(null);
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [selectedAgeRatingTagId, setSelectedAgeRatingTagId] = useState<string>('');
  const [selectedCategoryTagId, setSelectedCategoryTagId] = useState<string>('');
  const [ageRatingTags, setAgeRatingTags] = useState<{ id: string; name: string }[]>([]);
  const [categoryTags, setCategoryTags] = useState<{ id: string; name: string }[]>([]);
  const [featureTags, setFeatureTags] = useState<{ id: string; name: string }[]>([]);
  const fetchControllerRef = useRef<AbortController | null>(null);

  // URLから商品情報を取得するハンドラ
  const handleFetchProduct = async (url: string) => {
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    setIsLoading(true);
    setMessage('商品情報を取得中...');
    setIsUrlInputError(false);
    setProductData(null);

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const data = await response.json();

      if (response.ok) {
        if (data.status === 'existing') {
          setProductData(data.product);
          setStep('existing_product');
          setMessage(data.message);
        } else if (data.status === 'new') {
          setProductData(data.productInfo);
          setStep('details_confirmation');
          setMessage(''); // 成功時はメッセージをクリア
          setManualTags([]);
        } else {
          setStep('url_input');
          setMessage('未知のレスポンスステータスです。');
          setIsUrlInputError(true);
        }
      } else {
        const errorMsg = await getErrorMessage(response);
        setStep('url_input');
        setMessage(`情報の取得に失敗しました: ${errorMsg}`);
        setIsUrlInputError(true);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // ユーザーによるキャンセルのため、エラーメッセージは表示しない
        return;
      }
      setStep('url_input');
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setMessage(`情報の取得中にエラーが発生しました: ${errorMessage}`);
      setIsUrlInputError(true);
    } finally {
      if (fetchControllerRef.current === controller) {
        fetchControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  // 既存商品を更新するハンドラ
  const handleUpdateProduct = async () => {
    if (!productData?.id) {
      setMessage('商品IDが見つかりません。');
      setStep('error');
      return;
    }
    const productId = productData.id;

    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    setIsLoading(true);
    setMessage('商品情報を更新中...');

    try {
      const response = await fetch('/api/items/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
        signal: controller.signal,
      });

      if (response.ok) {
        setStep('complete');
        setMessage('商品情報が正常に更新されました。');
        setProductData(null);
      } else {
        const errorMsg = await getErrorMessage(response);
        setStep('error');
        setMessage(`更新に失敗しました: ${errorMsg}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      setStep('error');
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setMessage(`更新中にエラーが発生しました: ${errorMessage}`);
    } finally {
      if (fetchControllerRef.current === controller) {
        fetchControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  // 新規商品を作成するハンドラ
  const handleCreateProduct = async () => {
    if (!productData) {
      setMessage('商品情報がありません。');
      setStep('error');
      return;
    }

    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    setIsLoading(true);
    setMessage('商品を登録中...');
    setIsDetailsError(false);

    try {
      const response = await fetch('/api/items/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productInfo: productData,
          tags: manualTags,
          ageRatingTagId: selectedAgeRatingTagId,
          categoryTagId: selectedCategoryTagId,
        }),
        signal: controller.signal,
      });
      const data = await response.json();

      if (response.ok) {
        setStep('complete');
        setMessage('商品が正常に登録されました。');
        setProductData(null);
        setManualTags([]);
      } else {
        const errorMsg = await getErrorMessage(response);
        setStep('details_confirmation');
        setMessage(`登録に失敗しました: ${errorMsg}`);
        setIsDetailsError(true);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      setStep('details_confirmation');
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setMessage(`登録中にエラーが発生しました: ${errorMessage}`);
      setIsDetailsError(true);
    } finally {
      if (fetchControllerRef.current === controller) {
        fetchControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  // タグ選択肢をフェッチ & unmount時のクリーンアップ
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchTagsByType = async () => {
      setIsDetailsError(false);
      try {
        const responses = await Promise.all([
          fetch('/api/tags/by-type?categoryNames=age_rating', { signal }),
          fetch('/api/tags/by-type?categoryNames=product_category', { signal }),
          fetch('/api/tags/by-type?categoryNames=feature', { signal }),
        ]);

        const [ageRatingsResponse, categoriesResponse, featuresResponse] = responses;
        const errorMessages: string[] = [];

        if (ageRatingsResponse.ok) {
          setAgeRatingTags(await ageRatingsResponse.json());
        } else {
          errorMessages.push(`年齢レーティングの取得に失敗しました: ${ageRatingsResponse.statusText}`);
        }

        if (categoriesResponse.ok) {
          setCategoryTags(await categoriesResponse.json());
        } else {
          errorMessages.push(`カテゴリーの取得に失敗しました: ${categoriesResponse.statusText}`);
        }

        if (featuresResponse.ok) {
          setFeatureTags(await featuresResponse.json());
        } else {
          errorMessages.push(`主要機能の取得に失敗しました: ${featuresResponse.statusText}`);
        }

        if (errorMessages.length > 0) {
          setMessage(errorMessages.join('\n'));
          setIsDetailsError(true);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Component unmounted, fetch aborted.
          return;
        }
        console.error('Error fetching tags by type:', error);
        setMessage('タグ情報の取得中にネットワークエラーが発生しました。');
        setIsDetailsError(true);
      }
    };
    fetchTagsByType();

    // アンマウント時に保留中のリクエストをすべてキャンセルする
    return () => {
      controller.abort(); // タグ取得リクエストをキャンセル
      fetchControllerRef.current?.abort(); // 商品情報取得リクエストをキャンセル
    };
  }, []);

  const resetFlow = () => {
    fetchControllerRef.current?.abort();
    setStep('url_input');
    setProductData(null);
    setMessage('');
    setManualTags([]);
    setIsUrlInputError(false);
    setIsDetailsError(false);
    setSelectedAgeRatingTagId('');
    setSelectedCategoryTagId('');
  };

  const renderStep = () => {
    switch (step) {
      case 'url_input':
        return (
          <URLInputForm
            onSubmit={handleFetchProduct}
            isLoading={isLoading}
            message={isUrlInputError ? message : ''}
            isError={isUrlInputError}
          />
        );
      case 'details_confirmation':
        if (!productData) {
          return (
            <Card className="w-full max-w-lg mx-auto">
              <CardHeader>
                <CardTitle>エラー</CardTitle>
                <CardDescription>商品データを表示できませんでした。</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={resetFlow} className="w-full">
                  最初からやり直す
                </Button>
              </CardFooter>
            </Card>
          );
        }
        return (
          <ProductDetailsForm
            productData={productData}
            ageRatingTags={ageRatingTags}
            categoryTags={categoryTags}
            featureTags={featureTags}
            manualTags={manualTags}
            setManualTags={setManualTags}
            selectedAgeRatingTagId={selectedAgeRatingTagId}
            setSelectedAgeRatingTagId={setSelectedAgeRatingTagId}
            selectedCategoryTagId={selectedCategoryTagId}
            setSelectedCategoryTagId={setSelectedCategoryTagId}
            onSubmit={handleCreateProduct}
            isLoading={isLoading}
            message={message}
            isError={isDetailsError}
          />
        );
      case 'existing_product':
        return (
          <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>既存の商品</CardTitle>
              <CardDescription>この商品はすでにデータベースに登録されています。</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription asChild>
                  <output className="block whitespace-pre-wrap" aria-live="polite" aria-atomic="true">{message}</output>
                </AlertDescription>
              </Alert>
              {productData && (
                <div className="mt-4 p-4 border rounded-md">
                  <h4 className="font-semibold">{productData.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    by {productData.sellerName}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={resetFlow} disabled={isLoading}>
                キャンセル
              </Button>
              <Button onClick={handleUpdateProduct} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    更新中...
                  </>
                ) : (
                  '最新情報に更新'
                )}
              </Button>
            </CardFooter>
          </Card>
        );
      case 'complete':
        return <CompletionScreen message={message} onReset={resetFlow} isError={false} />;
      case 'error':
        return <CompletionScreen message={message} onReset={resetFlow} isError={true} />;
      default:
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _: never = step;
        return <div>不明なステップです。</div>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-20 md:pt-40">
      <h1 className="text-3xl font-bold mb-8 text-center">商品登録</h1>
      {renderStep()}
    </div>
  );
}