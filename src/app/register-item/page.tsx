'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { PRODUCT_CATEGORY_WHITELIST, FEATURE_TAG_WHITELIST } from '@/lib/constants';

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
  productTags?: { tag: { id: string; name: string }; isOfficial: boolean }[];
  boothTags?: string[];
}

// 画面の状態を示す型
type RegisterStep = 'url_input' | 'details_confirmation' | 'existing_product' | 'complete' | 'error';

function RegisterItemContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editProductId = searchParams.get('edit_product_id');

  const [step, setStep] = useState<RegisterStep>('url_input');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [isUrlInputError, setIsUrlInputError] = useState(false);
  const [isDetailsError, setIsDetailsError] = useState(false);
  const [productData, setProductData] = useState<ProductInfo | null>(null);
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [selectedAgeRatingTagId, setSelectedAgeRatingTagId] = useState<string>('');
  const [selectedCategoryTagId, setSelectedCategoryTagId] = useState<string>('');
  const [ageRatingTags, setAgeRatingTags] = useState<{ id: string; name: string }[]>([]);
  const [categoryTags, setCategoryTags] = useState<{ id: string; name: string }[]>([]);
  const [featureTags, setFeatureTags] = useState<{ id: string; name: string }[]>([]);
  const [tagsLoaded, setTagsLoaded] = useState(false);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const hasShownOnboardingRef = useRef(false);

  // ガイドラインサイドパネルの状態管理
  const [isFirstVisit, markAsVisited] = useGuidelineFirstVisit('register-item');
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

  // 初期化エフェクト：編集モードの場合
  useEffect(() => {
    if (editProductId) {
      const controller = new AbortController();
      const fetchProductForEdit = async () => {
        setIsLoading(true);
        setMessage('編集する商品情報を取得中...');

        try {
          const response = await fetch(`/api/items/${editProductId}`, { signal: controller.signal });
          if (response.ok) {
            const data = await response.json();
            setProductData(data.product);
            // 商品データセット後にタグのマッピング処理を行うために一度待つ
            // 実際のタグマッピングは productData がセットされた後の useEffect (handleEditExistingProduct相当) で行う
          } else {
            const errorMsg = await getErrorMessage(response);
            setMessage(`商品情報の取得に失敗しました: ${errorMsg}`);
            setStep('error');
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
          console.error("Error fetching product for edit:", error);
          setMessage('商品情報の取得中にエラーが発生しました。');
          setStep('error');
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      };

      fetchProductForEdit();

      return () => {
        controller.abort();
      };
    }
  }, [editProductId]);

  // 商品データがロードされ、かつタグ情報が揃ったら編集モードへ移行して値をセットする
  useEffect(() => {
    if (editProductId && productData && tagsLoaded && step === 'url_input') {
       // handleEditExistingProduct と同等のロジックを実行
       // productTagsはoptionalなので、存在しない場合は空配列として扱う
       const tags = productData.productTags || [];

       let foundAgeRatingId = '';
       let foundCategoryId = '';
       const otherTags: string[] = [];

       tags.forEach((productTag) => {
         if (productTag.isOfficial) return;

         const { tag } = productTag;

         // Check if it matches an age rating tag
         const ageRatingMatch = ageRatingTags.find(t => t.id === tag.id);
         if (ageRatingMatch) {
           foundAgeRatingId = tag.id;
           return;
         }

         // Check if it matches a category tag
         const categoryMatch = categoryTags.find(t => t.id === tag.id);
         if (categoryMatch) {
           foundCategoryId = tag.id;
           return;
         }

         // Otherwise add to manual tags (names)
         otherTags.push(tag.name);
       });

       setSelectedAgeRatingTagId(foundAgeRatingId);
       setSelectedCategoryTagId(foundCategoryId);
       setManualTags(otherTags);

       setMessage('');
       setIsDetailsError(false);
       setComment('');

       setStep('details_confirmation');
    }
  }, [editProductId, productData, ageRatingTags, categoryTags, step, tagsLoaded]);

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
      setRatingError('');
    } else {
      console.warn(`Tag not found for rating: ${rating} (expected tag name: ${tagName})`);
      setRatingError(`レーティング「${tagName}」の自動設定に失敗しました。手動で選択してください。`);
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
  // 編集モード(editProductIdがある場合)はオンボーディングを表示しない
  useEffect(() => {
    if (
      step === 'details_confirmation' &&
      isFirstVisit &&
      !hasShownOnboardingRef.current &&
      !editProductId
    ) {
      setShowOnboardingModal(true);
      markAsVisited(); // ここで「表示した」とマークする
      hasShownOnboardingRef.current = true;
    }
  }, [step, isFirstVisit, markAsVisited, editProductId]);

  // 手動で年齢レーティングが変更された場合、保留中の自動適用を無効化する
  const handleManualAgeRatingChange = useCallback((id: string) => {
    setSelectedAgeRatingTagId(id);
    setPendingRating(null); // 上書き防止ガード
  }, []);

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

  // 既存の商品情報を編集モードで開くハンドラ
  const handleEditExistingProduct = useCallback(() => {
    if (!productData) {
      setMessage('編集に必要な商品データが不足しています。');
      return;
    }

    let foundAgeRatingId = '';
    let foundCategoryId = '';
    const otherTags: string[] = [];
    const tags = productData.productTags || [];

    // productData.productTags は { tag: { id, name }, isOfficial: boolean }[] の形状
    tags.forEach((productTag) => {
      // 公式タグは「その他のタグ」欄（manualTags）には含めない
      // (ProductDetailsFormで productData.boothTags または productData.productTags から別途表示される想定)
      if (productTag.isOfficial) {
        return;
      }

      const { tag } = productTag;

      // Check if it matches an age rating tag
      const ageRatingMatch = ageRatingTags.find(t => t.id === tag.id);
      if (ageRatingMatch) {
        foundAgeRatingId = tag.id;
        return;
      }

      // Check if it matches a category tag
      const categoryMatch = categoryTags.find(t => t.id === tag.id);
      if (categoryMatch) {
        foundCategoryId = tag.id;
        return;
      }

      // Otherwise add to manual tags (names)
      otherTags.push(tag.name);
    });

    setSelectedAgeRatingTagId(foundAgeRatingId);
    setSelectedCategoryTagId(foundCategoryId);
    setManualTags(otherTags);

    // Clear any previous messages
    setMessage('');
    setIsDetailsError(false);
    setComment(''); // コメントをリセット

    // Move to details form
    setStep('details_confirmation');
  }, [productData, ageRatingTags, categoryTags]);

  // 新規商品登録・既存商品更新を行うハンドラ
  const handleSubmitProduct = useCallback(async () => {
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
    setIsDetailsError(false);

    const isUpdate = !!productData.id;
    const url = isUpdate ? '/api/items/update' : '/api/items/create';
    const actionName = isUpdate ? '更新' : '登録';

    setMessage(`商品を${actionName}中...`);

    try {
      const body = isUpdate
        ? {
            productId: productData.id,
            ageRatingTagId: selectedAgeRatingTagId,
            categoryTagId: selectedCategoryTagId,
            tags: manualTags,
            comment: comment
          }
        : {
            productInfo: productData,
            tags: manualTags,
            ageRatingTagId: selectedAgeRatingTagId,
            categoryTagId: selectedCategoryTagId,
            comment: comment
          };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });


      if (response.ok) {
        await response.json();

        // 編集モードからの更新だった場合、完了画面ではなく元のページに戻すなどの分岐も可能だが、
        // 今回は完了画面を表示し、そこに詳細ページへのリンクを表示するのが親切
        setStep('complete');
        setMessage(`商品が正常に${actionName}されました。`);
        setProductData(null);
        setManualTags([]);
        setComment('');
      } else {
        const errorMsg = await getErrorMessage(response);
        setStep('details_confirmation');
        setMessage(`${actionName}に失敗しました: ${errorMsg}`);
        setIsDetailsError(true);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      setStep('details_confirmation');
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setMessage(`${actionName}中にエラーが発生しました: ${errorMessage}`);
      setIsDetailsError(true);
    } finally {
      if (fetchControllerRef.current === controller) {
        fetchControllerRef.current = null;
      }
      setIsLoading(false);
    }
  }, [productData, manualTags, selectedAgeRatingTagId, selectedCategoryTagId, comment]);

  // タグ選択肢をフェッチ & unmount時のクリーンアップ
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchTagsByType = async () => {
      setIsDetailsError(false);
      try {
        const responses = await Promise.all([
          fetch('/api/tags/by-type?categoryNames=rating', { signal }),
          fetch('/api/tags/by-type?categoryNames=product_type', { signal }), // Updated to correct ID
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
          const allCategories = await categoriesResponse.json();
          if (process.env.NODE_ENV === 'development') {
            console.log('[Debug] All Categories fetched:', allCategories.length, allCategories.map((t: any) => t.name));
          }

          // Filter and sort based on whitelist
          const filteredCategories = PRODUCT_CATEGORY_WHITELIST
            .map(name => allCategories.find((tag: { name: string }) => tag.name.trim() === name))
            .filter((tag): tag is { id: string; name: string } => tag !== undefined);

          if (process.env.NODE_ENV === 'development') {
            console.log('[Debug] Filtered Categories:', filteredCategories.length, filteredCategories.map((t) => t.name));
          }
          setCategoryTags(filteredCategories);
        } else if (categoriesResponse.status !== 404) {
          errorMessages.push(`カテゴリーの取得に失敗しました: ${categoriesResponse.statusText}`);
        }

        if (featuresResponse.ok) {
          const allFeatures = await featuresResponse.json();
          if (process.env.NODE_ENV === 'development') {
            console.log('[Debug] All Features fetched:', allFeatures.length, allFeatures.map((t: any) => t.name));
          }

          // Filter and sort based on whitelist
          const filteredFeatures = FEATURE_TAG_WHITELIST
            .map(name => allFeatures.find((tag: { name: string }) => tag.name.trim() === name))
            .filter((tag): tag is { id: string; name: string } => tag !== undefined);

          if (process.env.NODE_ENV === 'development') {
            console.log('[Debug] Filtered Features:', filteredFeatures.length, filteredFeatures.map((t) => t.name));
          }
          setFeatureTags(filteredFeatures);
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
      } finally {
        if (!signal.aborted) {
          setTagsLoaded(true);
        }
      }
    };
    fetchTagsByType();

    // アンマウント時に保留中のリクエストをすべてキャンセルする
    return () => {
      controller.abort(); // タグ取得リクエストをキャンセル
      fetchControllerRef.current?.abort(); // 商品情報取得リクエストをキャンセル
    };
  }, []);

  const resetFlow = useCallback(() => {
    fetchControllerRef.current?.abort();
    setStep('url_input');
    setProductData(null);
    setMessage('');
    setManualTags([]);
    setComment('');
    setIsUrlInputError(false);
    setIsDetailsError(false);
    setSelectedAgeRatingTagId('');
    setSelectedCategoryTagId('');

    // URLパラメータがある場合はそれを取り除く
    if (editProductId) {
       router.replace('/register-item');
    }
  }, [editProductId, router]);

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
            setSelectedAgeRatingTagId={handleManualAgeRatingChange}
            selectedCategoryTagId={selectedCategoryTagId}
            setSelectedCategoryTagId={setSelectedCategoryTagId}
            comment={comment}
            setComment={setComment}
            onSubmit={handleSubmitProduct}
            isLoading={isLoading}
            message={message}
            isError={isDetailsError}
            ratingError={ratingError}
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
            <CardFooter className="flex justify-between flex-wrap gap-2">
              <Button variant="outline" onClick={resetFlow} disabled={isLoading}>
                キャンセル
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleEditExistingProduct} disabled={isLoading}>
                   タグを編集して更新
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
              </div>
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
      <h1 className="text-3xl font-bold mb-8 text-center">{editProductId ? '商品タグの編集' : '商品登録'}</h1>
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

export default function RegisterItemPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 flex justify-center">
         <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <RegisterItemContent />
    </Suspense>
  );
}
