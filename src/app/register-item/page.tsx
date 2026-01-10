'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { URLInputForm } from './components/URLInputForm';
import { ProductDetailsForm } from './components/ProductDetailsForm';
import { CompletionScreen } from './components/CompletionScreen';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { getErrorMessage } from './utils/errorHandling';
import { GuidelineContainer } from '@/components/guidelines/GuidelineContainer';
import { useGuidelineFirstVisit } from '@/hooks/useGuidelineFirstVisit';
import { GuidelineOnboardingModal } from '@/components/guidelines/GuidelineOnboardingModal';
import { RatingLevel, RATING_TAG_MAPPING } from '@/data/guidelines';

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
  boothTags?: string[];
}

// 画面の状態を示す型
type RegisterStep = 'url_input' | 'details_confirmation' | 'existing_product' | 'complete' | 'error';



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
  const hasShownOnboardingRef = useRef(false);

  // ガイドラインサイドパネルの状態管理
  const isFirstVisit = useGuidelineFirstVisit('register');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // 統合されたガイドライン状態
  const [guidelineState, setGuidelineState] = useState({
    isOpen: false,
    shouldMount: false,
    initialTab: 'rating' as 'rating' | 'categories',
    initialRatingFlow: false,
  });

  // レーティング保留状態 (タグ読み込み完了待ち)
  const [pendingRating, setPendingRating] = useState<RatingLevel | null>(null);

  // ガイドラインを開く処理
  const handleOpenGuideline = useCallback((tab: 'rating' | 'categories', ratingFlow = false) => {
    setGuidelineState({
      shouldMount: true,
      isOpen: true,
      initialTab: tab,
      initialRatingFlow: ratingFlow,
    });
  }, [setGuidelineState]);

  // 「ガイドラインを見る」ボタンのハンドラ
  const handleViewGuideline = useCallback(() => {
    setShowOnboardingModal(false);
    setGuidelineState({
      shouldMount: true,
      isOpen: true,
      initialTab: 'rating',
      initialRatingFlow: true,
    });
  }, []);

  // レーティング設定を適用するヘルパー関数
  const resolveAndApplyRating = useCallback((rating: RatingLevel) => {
    const tagName = RATING_TAG_MAPPING[rating];
    const matchedTag = ageRatingTags.find((tag) => tag.name === tagName);

    if (matchedTag) {
      setSelectedAgeRatingTagId(matchedTag.id);
      setPendingRating(null);
      setIsDetailsError(false);
      setMessage('');
    } else {
      console.warn(`Tag not found for rating: ${rating} (expected tag name: ${tagName})`);
      setMessage(`レーティング「${tagName}」の自動設定に失敗しました。手動で選択してください。`);
      setIsDetailsError(true);
      setPendingRating(null);
    }
  }, [ageRatingTags]);

  // レーティング診断完了時のハンドラ
  const handleRatingSelected = useCallback((rating: RatingLevel) => {
    // タグがまだ読み込まれていない場合は保留
    if (ageRatingTags.length === 0) {
      setPendingRating(rating);
      return;
    }
    resolveAndApplyRating(rating);
  }, [ageRatingTags, resolveAndApplyRating]);

  // ガイドラインの開閉ハンドラ
  const handleGuidelineOpenChange = useCallback((isOpen: boolean) => {
    setGuidelineState((prev) => ({ ...prev, isOpen }));
  }, []);

  // 保留中のレーティングがあれば、タグ読み込み完了後に適用
  useEffect(() => {
    if (pendingRating && ageRatingTags.length > 0) {
      resolveAndApplyRating(pendingRating);
    }
  }, [ageRatingTags, pendingRating, resolveAndApplyRating]);

  // details_confirmationステップでオンボーディングを表示（1回のみ）
  useEffect(() => {
    if (
      step === 'details_confirmation' &&
      isFirstVisit &&
      !hasShownOnboardingRef.current
    ) {
      setShowOnboardingModal(true);
      hasShownOnboardingRef.current = true;
    }
  }, [step, isFirstVisit]);

  // URLから商品情報を取得するハンドラ
  const handleFetchProduct = useCallback(async (url: string) => {
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

      if (response.ok) {
        const data = await response.json();
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
  }, []);

  // 既存商品を更新するハンドラ
  const handleUpdateProduct = useCallback(async () => {
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
  }, [productData]);

  // 新規商品を作成するハンドラ
  const handleCreateProduct = useCallback(async () => {
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


      if (response.ok) {
        await response.json();
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
  }, [productData, manualTags, selectedAgeRatingTagId, selectedCategoryTagId]);

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
        } else if (ageRatingsResponse.status !== 404) {
          errorMessages.push(`年齢レーティングの取得に失敗しました: ${ageRatingsResponse.statusText}`);
        }

        if (categoriesResponse.ok) {
          setCategoryTags(await categoriesResponse.json());
        } else if (categoriesResponse.status !== 404) {
          errorMessages.push(`カテゴリーの取得に失敗しました: ${categoriesResponse.statusText}`);
        }

        if (featuresResponse.ok) {
          setFeatureTags(await featuresResponse.json());
        } else if (featuresResponse.status !== 404) {
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
            onGuidelineOpen={handleOpenGuideline}
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
                <AlertDescription>
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">商品登録</h1>
      {renderStep()}

      {/* オンボーディングモーダル */}
      {showOnboardingModal && (
        <GuidelineOnboardingModal
          open={showOnboardingModal}
          onOpenChange={setShowOnboardingModal}
          onViewGuideline={handleViewGuideline}
        />
      )}

      {/* ガイドラインサイドパネル - 条件付きマウント */}
      {guidelineState.shouldMount && (
        <GuidelineContainer
          mode="sidepanel"
          open={guidelineState.isOpen}
          onOpenChange={handleGuidelineOpenChange}
          initialTab={guidelineState.initialTab}
          initialRatingFlow={guidelineState.initialRatingFlow}
          onRatingSelected={handleRatingSelected}
        />
      )}
    </div>
  );
}