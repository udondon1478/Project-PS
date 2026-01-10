'use client';

import { useState, useEffect } from 'react';
import { X, Workflow, ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { RatingFlowchart } from './RatingFlowchart';
import { RatingFlowchartDiagram } from './RatingFlowchartDiagram';
import { TagCategoryVisualizer } from './TagCategoryVisualizer';
import { FlowchartMode, RatingLevel } from '@/data/guidelines';

interface GuidelineSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'rating' | 'categories';
  initialRatingFlow?: boolean;
  onRatingSelected?: (rating: RatingLevel) => void;
}

export function GuidelineSidePanel({
  open,
  onOpenChange,
  initialTab = 'rating',
  initialRatingFlow = false,
  onRatingSelected,
}: GuidelineSidePanelProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [flowchartMode, setFlowchartMode] = useState<FlowchartMode>(
    initialRatingFlow ? 'interactive' : 'diagram'
  );

  // initialTabが変更されたら反映
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // フローチャート完了時のハンドラー
  const handleRatingFlowComplete = (rating: RatingLevel) => {
    // 親コンポーネントに通知
    onRatingSelected?.(rating);
    // タグカテゴリタブに切り替え
    setActiveTab('categories');
  };

  // Escキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <aside
      aria-label="タグ付けガイドライン"
      aria-hidden={!open}
      className={cn(
        "fixed left-0 top-0 h-screen w-[clamp(450px,40vw,600px)] z-60",
        "bg-background border-r shadow-lg",
        "transition-all duration-250 ease-in-out",
        "flex flex-col",
        open
          ? "translate-x-0 opacity-100"
          : "-translate-x-full opacity-0 pointer-events-none"
      )}
    >
      {/* 固定ヘッダー */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <h2 className="text-lg font-semibold">タグ付けガイドライン</h2>
          <p className="text-sm text-muted-foreground">
            商品に適切なタグを付与するためのガイドラインです
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          aria-label="ガイドラインを閉じる"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* タブコンテンツ */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'rating' | 'categories')}
        className="flex-1 flex flex-col min-h-0"
      >
        {/* 固定タブリスト */}
        <div className="px-6 mt-4 shrink-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rating">レーティング</TabsTrigger>
            <TabsTrigger value="categories">タグカテゴリ</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="rating"
          className="flex-1 mt-0 flex flex-col min-h-0 data-[state=inactive]:hidden"
        >
          {/* 固定モード切り替え */}
          <div className="flex items-center gap-2 px-6 py-3 shrink-0">
            <Toggle
              pressed={flowchartMode === 'interactive'}
              onPressedChange={() => setFlowchartMode('interactive')}
              aria-label="ステップ形式に切り替え"
            >
              <Workflow className="mr-2 h-4 w-4" />
              ステップ形式
            </Toggle>
            <Toggle
              pressed={flowchartMode === 'diagram'}
              onPressedChange={() => setFlowchartMode('diagram')}
              aria-label="図表で見る"
            >
              <ListTree className="mr-2 h-4 w-4" />
              図表で見る
            </Toggle>
          </div>

          {/* スクロール可能コンテンツエリア */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
            {flowchartMode === 'interactive' ? (
              <RatingFlowchart
                onComplete={handleRatingFlowComplete}
              />
            ) : (
              <RatingFlowchartDiagram />
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="categories"
          className="flex-1 mt-0 min-h-0 data-[state=inactive]:hidden overflow-y-auto px-6 py-4"
        >
          <TagCategoryVisualizer />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
