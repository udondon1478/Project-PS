'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from './TagInput';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GuidelineButton } from '@/components/guidelines/GuidelineButton';
import { GuidelineContainer } from '@/components/guidelines/GuidelineContainer';

import { RatingPolicyDialog } from './RatingPolicyDialog';

// 商品情報の型定義 (page.tsxから移動・再利用)
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
  productTags?: { tag: { id: string; name: string }; isOfficial: boolean }[];
  boothTags?: string[];
}

interface Tag {
  id: string;
  name: string;
}

interface ProductDetailsFormProps {
  productData: ProductInfo;
  ageRatingTags: Tag[];
  categoryTags: Tag[];
  featureTags: Tag[];
  manualTags: string[];
  setManualTags: Dispatch<SetStateAction<string[]>>;
  selectedAgeRatingTagId: string;
  setSelectedAgeRatingTagId: (id: string) => void;
  selectedCategoryTagId: string;
  setSelectedCategoryTagId: (id: string) => void;
  comment: string;
  setComment: (comment: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  message: string;
  isError?: boolean;
  ratingError?: string;
  onGuidelineOpen?: (tab: 'rating' | 'categories', ratingFlow?: boolean) => void;
}

// LocalStorage key for tracking if the user has seen the official tag warning
const OFFICIAL_TAG_WARNING_SHOWN_KEY = 'polyseek_official_tag_warning_shown';

export const ProductDetailsForm = memo(({
  productData,
  ageRatingTags,
  categoryTags,
  featureTags,
  manualTags,
  setManualTags,
  selectedAgeRatingTagId,
  setSelectedAgeRatingTagId,
  selectedCategoryTagId,
  setSelectedCategoryTagId,
  comment,
  setComment,
  onSubmit,
  isLoading,
  message,
  isError = false,
  ratingError,
  onGuidelineOpen,
}: ProductDetailsFormProps) => {
  // 公式タグ警告ダイアログの状態
  const [isOfficialTagWarningOpen, setIsOfficialTagWarningOpen] = useState(false);
  const [pendingOfficialTagName, setPendingOfficialTagName] = useState<string | null>(null);

  // レーティングポリシーダイアログの状態
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);

  // ガイドライン関連の状態（フォールバック用）
  const [showGuideline, setShowGuideline] = useState(false);
  const [showRatingFlow, setShowRatingFlow] = useState(false);

  const handleFeatureTagToggle = useCallback((tagName: string) => {
    setManualTags((prevTags) =>
      prevTags.includes(tagName)
        ? prevTags.filter((t) => t !== tagName)
        : [...prevTags, tagName]
    );
  }, [setManualTags]);

  // 公式タグクリック時のハンドラ
  const handleOfficialTagClick = useCallback((tagName: string) => {
    // 既に選択されている場合は解除のみ（警告不要）
    if (manualTags.includes(tagName)) {
      handleFeatureTagToggle(tagName);
      return;
    }

    // 初回クリック時に警告を表示するかどうかを確認
    const warningShown = typeof window !== 'undefined' && localStorage.getItem(OFFICIAL_TAG_WARNING_SHOWN_KEY);
    if (!warningShown) {
      // 警告ダイアログを表示
      setPendingOfficialTagName(tagName);
      setIsOfficialTagWarningOpen(true);
    } else {
      // 警告済みの場合は直接追加
      handleFeatureTagToggle(tagName);
    }
  }, [manualTags, handleFeatureTagToggle]);

  // 警告ダイアログで「追加」を選択した場合
  const handleConfirmOfficialTag = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(OFFICIAL_TAG_WARNING_SHOWN_KEY, 'true');
    }
    if (pendingOfficialTagName) {
      handleFeatureTagToggle(pendingOfficialTagName);
    }
    setIsOfficialTagWarningOpen(false);
    setPendingOfficialTagName(null);
  }, [pendingOfficialTagName, handleFeatureTagToggle]);

  // 警告ダイアログで「キャンセル」を選択した場合
  const handleCancelOfficialTag = useCallback(() => {
    setIsOfficialTagWarningOpen(false);
    setPendingOfficialTagName(null);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>商品情報の確認と登録</CardTitle>
        <CardDescription>取得した情報を確認し、必要な情報を追加してください。</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Product Info */}
        <div className="space-y-6">
          <Carousel className="w-full max-w-sm mx-auto">
            <CarouselContent>
              {productData.images.map((image, index) => (
                <CarouselItem key={`${image.order}-${image.imageUrl}`}>
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex aspect-square items-center justify-center p-0">
                        <Image
                          src={image.imageUrl}
                          alt={`${productData.title} の画像 ${index + 1}`}
                          width={400}
                          height={400}
                          className="rounded-lg object-cover w-full h-full"
                        />
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>

          <div>
            <h3 className="text-lg font-semibold">{productData.title}</h3>
            <p className="text-sm text-muted-foreground">
              by <a href={productData.sellerUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{productData.sellerName}</a>
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium">価格</h4>
            <p>¥{productData.lowPrice.toLocaleString()} ~ ¥{productData.highPrice.toLocaleString()}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium">説明</h4>
            <ScrollArea className="h-40 w-full rounded-md border p-4">
              <p className="whitespace-pre-wrap text-sm">{productData.description}</p>
            </ScrollArea>
          </div>
        </div>

        {/* Right Column: Input Form */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="ageRating">対象年齢</Label>
              <GuidelineButton
                tooltip="レーティング基準について"
                onClick={() => setIsPolicyDialogOpen(true)}
              />
            </div>
            <Select onValueChange={setSelectedAgeRatingTagId} value={selectedAgeRatingTagId} disabled={isLoading}>
              <SelectTrigger id="ageRating">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {ageRatingTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="link"
              size="sm"
              className="mt-1 h-auto p-0"
              onClick={() => {
                if (onGuidelineOpen) {
                  onGuidelineOpen('rating', true);
                } else {
                  setShowGuideline(true);
                  setShowRatingFlow(true);
                }
              }}
              disabled={isLoading}
            >
              <Sparkles className="mr-1 h-3 w-3" />
              レーティングを診断する
            </Button>
            {ratingError && (
              <p className="text-sm text-destructive mt-1" role="alert">
                {ratingError}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="category">カテゴリー</Label>
            <Select onValueChange={setSelectedCategoryTagId} value={selectedCategoryTagId} disabled={isLoading}>
              <SelectTrigger id="category">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {categoryTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>主要機能</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {featureTags.map((tag) => (
                <Button
                  key={tag.id}
                  type="button"
                  variant={manualTags.includes(tag.name) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFeatureTagToggle(tag.name)}
                  disabled={isLoading}
                  aria-pressed={manualTags.includes(tag.name)}
                >
                  {tag.name}
                </Button>
              ))}
            </div>
          </div>

          {/* productData.boothTags（新規取得時）または productTags（既存編集時）から公式タグを表示 */}
          {((productData.boothTags && productData.boothTags.length > 0) || (productData.productTags && productData.productTags.some(pt => pt.isOfficial))) && (
            <div>
              <Label>公式タグ（BOOTH由来）</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {/* boothTagsがある場合はそれを使用、なければproductTagsからisOfficial=trueのものを抽出 */}
                {(productData.boothTags && productData.boothTags.length > 0
                  ? productData.boothTags
                  : productData.productTags?.filter(pt => pt.isOfficial).map(pt => pt.tag.name) || []
                ).map((tagName) => (
                  <Button
                    key={tagName}
                    type="button"
                    variant={manualTags.includes(tagName) ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => handleOfficialTagClick(tagName)}
                    disabled={isLoading}
                    aria-pressed={manualTags.includes(tagName)}
                    className={manualTags.includes(tagName) ? "" : "bg-muted text-muted-foreground hover:bg-muted/80"}
                  >
                    {tagName}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                公式タグは自動的に登録されます。クリックすると「その他のタグ（独自タグ）」にもコピーされます。
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="otherTags">その他のタグ</Label>
            <TagInput
              id="otherTags"
              value={manualTags}
              onChange={setManualTags}
              disabled={isLoading}
              onGuidelineClick={onGuidelineOpen ? () => onGuidelineOpen('categories') : undefined}
            />
          </div>

          <div>
            <Label htmlFor="comment">編集コメント（任意）</Label>
            <Textarea
              id="comment"
              placeholder="タグの追加・削除の理由などを記入してください"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isLoading}
              className="mt-2 resize-none"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch">
        {message && (
            <Alert variant={isError ? 'destructive' : 'default'} className="mb-4" role={isError ? 'alert' : 'status'}>
              <AlertDescription className="whitespace-pre-wrap">{message}</AlertDescription>
            </Alert>
          )}
        <Button onClick={onSubmit} disabled={isLoading || !selectedAgeRatingTagId || !selectedCategoryTagId} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              登録中...
            </>
          ) : (
            '商品を登録'
          )}
        </Button>
      </CardFooter>

      {/* 公式タグコピー時の警告ダイアログ */}
      <AlertDialog open={isOfficialTagWarningOpen} onOpenChange={setIsOfficialTagWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>公式タグのコピーについて</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                公式タグは自動的に登録されます。<strong>この操作を行わなくても登録されます。</strong>
              </span>
              <span className="block">
                コピー機能は商品の特徴に適したタグのみ使用して下さい。
              </span>
              <span className="block text-muted-foreground text-xs mt-2">
                ※ この警告は初回のみ表示されます。
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelOfficialTag}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOfficialTag}>追加する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RatingPolicyDialog
        open={isPolicyDialogOpen}
        onOpenChange={setIsPolicyDialogOpen}
      />

      {/* ガイドラインダイアログ/シート */}
      <GuidelineContainer
        open={showGuideline}
        onOpenChange={setShowGuideline}
        initialTab="rating"
        initialRatingFlow={showRatingFlow}
      />
    </Card>
  );
});