'use client';

import { useState, useEffect } from 'react';
import { URLInputForm } from './components/URLInputForm';
import { ProductDetailsForm } from './components/ProductDetailsForm';
import { CompletionScreen } from './components/CompletionScreen';

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
type RegisterStep = 'url_input' | 'details_confirmation' | 'existing_product' | 'complete';

export default function RegisterItemPage() {
  const [step, setStep] = useState<RegisterStep>('url_input');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [productData, setProductData] = useState<ProductInfo | null>(null);
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [selectedAgeRatingTagId, setSelectedAgeRatingTagId] = useState<string>('');
  const [selectedCategoryTagId, setSelectedCategoryTagId] = useState<string>('');
  const [ageRatingTags, setAgeRatingTags] = useState<{ id: string; name: string }[]>([]);
  const [categoryTags, setCategoryTags] = useState<{ id: string; name: string }[]>([]);
  const [featureTags, setFeatureTags] = useState<{ id: string; name: string }[]>([]);

  // URLから商品情報を取得するハンドラ
  const handleFetchProduct = async (url: string) => {
    setIsLoading(true);
    setMessage('商品情報を取得中...');
    setProductData(null);

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
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
        }
      } else {
        setStep('url_input');
        setMessage(`情報の取得に失敗しました: ${data.message || response.statusText}`);
      }
    } catch (error: unknown) {
      setStep('url_input');
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setMessage(`情報の取得中にエラーが発生しました: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 既存商品を更新するハンドラ
  const handleUpdateProduct = async () => {
    setIsLoading(true);
    setMessage('商品情報を更新中...');

    try {
      const response = await fetch('/api/items/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: productData?.id }),
      });
      const data = await response.json();

      if (response.ok) {
        setStep('complete');
        setMessage('商品情報が正常に更新されました。');
        setProductData(null);
      } else {
        setStep('existing_product');
        setMessage(`更新に失敗しました: ${data.message || response.statusText}`);
      }
    } catch (error: unknown) {
      setStep('existing_product');
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setMessage(`更新中にエラーが発生しました: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 新規商品を作成するハンドラ
  const handleCreateProduct = async () => {
    if (!productData) {
      setMessage('商品情報がありません。');
      return;
    }
    setIsLoading(true);
    setMessage('商品を登録中...');

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
      });
      const data = await response.json();

      if (response.ok) {
        setStep('complete');
        setMessage('商品が正常に登録されました。');
        setProductData(null);
        setManualTags([]);
      } else {
        setStep('details_confirmation');
        setMessage(`登録に失敗しました: ${data.message || response.statusText}`);
      }
    } catch (error: unknown) {
      setStep('details_confirmation');
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      setMessage(`登録中にエラーが発生しました: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // タグ選択肢をフェッチ
  useEffect(() => {
    const fetchTagsByType = async () => {
      try {
        const [ageRatingsResponse, categoriesResponse, featuresResponse] = await Promise.all([
          fetch('/api/tags/by-type?categoryNames=age_rating'),
          fetch('/api/tags/by-type?categoryNames=product_category'),
          fetch('/api/tags/by-type?categoryNames=feature'),
        ]);
        if (ageRatingsResponse.ok) setAgeRatingTags(await ageRatingsResponse.json());
        if (categoriesResponse.ok) setCategoryTags(await categoriesResponse.json());
        if (featuresResponse.ok) setFeatureTags(await featuresResponse.json());
      } catch (error) {
        console.error('Error fetching tags by type:', error);
        setMessage('タグ情報の取得に失敗しました。');
      }
    };
    fetchTagsByType();
  }, []);

  const resetFlow = () => {
    setStep('url_input');
    setProductData(null);
    setMessage('');
    setManualTags([]);
  };

  const renderStep = () => {
    switch (step) {
      case 'url_input':
        return (
          <URLInputForm
            onSubmit={handleFetchProduct}
            isLoading={isLoading}
            message={message}
          />
        );
      case 'details_confirmation':
        if (!productData) return null; // or a loading/error state
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
                <AlertDescription>{message}</AlertDescription>
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
        return <CompletionScreen message={message} onReset={resetFlow} />;
      default:
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