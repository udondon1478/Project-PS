'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RatingFlowchart } from '@/components/guidelines/RatingFlowchart';
import { RatingFlowchartDiagram } from '@/components/guidelines/RatingFlowchartDiagram';
import { TagCategoryVisualizer } from '@/components/guidelines/TagCategoryVisualizer';
import { Toggle } from '@/components/ui/toggle';
import { Workflow, ListTree, BookOpen, Lightbulb, Sparkles } from 'lucide-react';
import { FlowchartMode } from '@/data/guidelines';
import { VRChatGuidelineSection } from './sections/VRChatGuidelineSection';
import { BestPracticesSection } from './sections/BestPracticesSection';

export function GuidelinesContent() {
  const [activeTab, setActiveTab] = useState<string>('rating');
  const [flowchartMode, setFlowchartMode] = useState<FlowchartMode>('diagram');

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">タグ付けガイドライン</h1>
        <p className="text-lg text-muted-foreground">
          商品に適切なタグを付与し、レーティングを設定するための総合ガイド
        </p>
      </div>

      {/* メインコンテンツ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="rating" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">レーティング</span>
            <span className="sm:hidden">Rating</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">タグカテゴリ</span>
            <span className="sm:hidden">Tags</span>
          </TabsTrigger>
          <TabsTrigger value="vrchat" className="flex items-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
            <span className="hidden sm:inline">VRChat</span>
            <span className="sm:hidden">VRC</span>
          </TabsTrigger>
          <TabsTrigger value="best-practices" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">ベストプラクティス</span>
            <span className="sm:hidden">Tips</span>
          </TabsTrigger>
        </TabsList>

        {/* レーティングタブ */}
        <TabsContent value="rating" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>レーティングガイドライン</CardTitle>
              <CardDescription>
                商品の対象年齢を適切に設定するためのガイドラインです
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">レーティングの種類</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-2 border-green-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        ✅ General（全年齢）
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p>誰にでも安全なコンテンツ。裸体や性的暗示を含まない。</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-yellow-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        👙 Sensitive（性的暗示）
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p>水着、下着、露出度の高い服装、または性的なニュアンスを含むポーズなど。</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-orange-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        ⚠️ Questionable（軽度の露出）
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p>乳首の露出、裸の臀部、衣服越しの性器の強調、擬似性行為など。</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-red-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        🔞 Explicit（成人向け）
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p>露骨な性行為、性器の露出（修正有無問わず）、体液描写、激しい暴力描写など。</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">レーティング判定ツール</h3>
                  <div className="flex items-center gap-2">
                    <Toggle
                      pressed={flowchartMode === 'interactive'}
                      onPressedChange={() => setFlowchartMode('interactive')}
                      size="sm"
                    >
                      <Workflow className="mr-2 h-4 w-4" />
                      ステップ形式
                    </Toggle>
                    <Toggle
                      pressed={flowchartMode === 'diagram'}
                      onPressedChange={() => setFlowchartMode('diagram')}
                      size="sm"
                    >
                      <ListTree className="mr-2 h-4 w-4" />
                      図表で見る
                    </Toggle>
                  </div>
                </div>
                {flowchartMode === 'interactive' ? (
                  <RatingFlowchart />
                ) : (
                  <RatingFlowchartDiagram />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* タグカテゴリタブ */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>タグカテゴリガイドライン</CardTitle>
              <CardDescription>
                タグの種類と使い方について
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TagCategoryVisualizer />
            </CardContent>
          </Card>
        </TabsContent>

        {/* VRChatタブ */}
        <TabsContent value="vrchat" className="space-y-6">
          <VRChatGuidelineSection />
        </TabsContent>

        {/* ベストプラクティスタブ */}
        <TabsContent value="best-practices" className="space-y-6">
          <BestPracticesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
