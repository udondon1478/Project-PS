'use client';

import { tagCategories } from '@/data/guidelines/tagCategories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TagCategoryBadge } from './TagCategoryBadge';
import { getCategoryCardStyle } from '@/lib/guidelines/categoryColors';
import { ScrollArea } from '@/components/ui/scroll-area';

export function TagCategoryVisualizer() {
  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">タグカテゴリについて</h3>
          <p className="text-sm text-muted-foreground mb-4">
            PolySeekでは、タグを8つのカテゴリに分類しています。各カテゴリには固有の色が割り当てられており、タグの目的を視覚的に理解しやすくなっています。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tagCategories.map((category) => {
            const cardStyle = getCategoryCardStyle(category.name);

            return (
              <Card
                key={category.id}
                className="border-2 transition-shadow hover:shadow-md"
                style={{
                  borderColor: cardStyle.borderColor,
                }}
              >
                <CardHeader
                  className="pb-3"
                  style={{
                    backgroundColor: cardStyle.backgroundColor,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TagCategoryBadge categoryName={category.name} size="md" />
                  </div>
                  <CardTitle className="text-base">{category.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      例
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {category.examples.map((example, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted">
          <h4 className="text-sm font-semibold mb-2">タグ付けのベストプラクティス</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>商品の主要な特徴を表すタグを優先的に付ける</li>
            <li>複数のカテゴリからバランスよくタグを選択する</li>
            <li>あまりにも一般的すぎるタグ（「3D」「モデル」など）は避ける</li>
            <li>公式タグ（BOOTH由来）は自動的に登録されるため、手動で追加する必要はありません</li>
            <li>曖昧な表現よりも具体的な表現を使用する</li>
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
}
