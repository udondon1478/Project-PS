'use client';

import type { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { TagInput } from './TagInput';

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
  onSubmit: () => void;
  isLoading: boolean;
  message: string;
  isError?: boolean;
}

export const ProductDetailsForm = ({
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
  onSubmit,
  isLoading,
  message,
  isError = false,
}: ProductDetailsFormProps) => {
  const handleFeatureTagToggle = (tagName: string) => {
    setManualTags((prevTags) =>
      prevTags.includes(tagName)
        ? prevTags.filter((t) => t !== tagName)
        : [...prevTags, tagName]
    );
  };

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
            <Label htmlFor="ageRating">対象年齢</Label>
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

          <div>
            <Label htmlFor="otherTags">その他のタグ</Label>
            <TagInput
              id="otherTags"
              value={manualTags}
              onChange={setManualTags}
              disabled={isLoading}
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
    </Card>
  );
};