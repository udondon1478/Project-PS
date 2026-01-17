'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Workflow, ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { RatingFlowchart } from './RatingFlowchart';
import { RatingFlowchartDiagram } from './RatingFlowchartDiagram';
import { TagCategoryVisualizer } from './TagCategoryVisualizer';
import { TaggingGuide } from './TaggingGuide';
import { FlowchartMode, RatingLevel } from '@/data/guidelines';

type PanelPosition = 'left' | 'right';

// タブに基づいて位置を決定するヘルパー関数
function getPositionForTab(tab: 'rating' | 'categories' | 'guide'): PanelPosition {
  return tab === 'rating' ? 'right' : 'left';
}

interface GuidelineSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'rating' | 'categories' | 'guide';
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
  const [activeTab, setActiveTab] = useState<'rating' | 'categories' | 'guide'>(initialTab);
  const [flowchartMode, setFlowchartMode] = useState<FlowchartMode>(
    initialRatingFlow ? 'interactive' : 'diagram'
  );

  // 位置管理: タブに基づいて決定
  const [position, setPosition] = useState<PanelPosition>(getPositionForTab(initialTab));
  // アニメーション状態: 位置変更時の退場/登場を制御
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingPositionRef = useRef<PanelPosition | null>(null);

  // initialTabが変更されたら反映
  useEffect(() => {
    setActiveTab(initialTab);
    setPosition(getPositionForTab(initialTab));
  }, [initialTab]);

  // タブ変更時の位置変更アニメーション
  const handleTabChange = (newTab: 'rating' | 'categories' | 'guide') => {
    const newPosition = getPositionForTab(newTab);

    if (newPosition !== position && open) {
      // 位置が変わる場合: 退場→位置変更→登場のアニメーション
      pendingPositionRef.current = newPosition;
      setIsTransitioning(true);

      // 退場アニメーション完了後に位置を変更
      setTimeout(() => {
        setPosition(newPosition);
        pendingPositionRef.current = null;
        // 位置変更後、CSSが画面外の状態を適用するまで待ってから登場アニメーションを開始
        // 50msの遅延でブラウザにCSSの再計算を確実に行わせる
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 300); // アニメーション時間と同じ
    }

    setActiveTab(newTab);
  };

  // フローチャート完了時のハンドラー
  const handleRatingFlowComplete = (rating: RatingLevel) => {
    // 親コンポーネントに通知
    onRatingSelected?.(rating);
    // タグカテゴリタブに切り替え（位置も連動して変更される）
    handleTabChange('categories');
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
      style={{
        // transform と opacity のみトランジション（left/right の切り替えはアニメーションしない）
        transitionProperty: 'transform, opacity',
        transitionDuration: '300ms',
        transitionTimingFunction: 'ease-in-out',
      }}
      className={cn(
        "fixed top-0 h-screen w-[clamp(450px,40vw,600px)] z-60",
        "bg-background shadow-lg",
        "flex flex-col",
        // 位置に応じたスタイル
        position === 'left' ? "left-0 border-r" : "right-0 border-l",
        // 表示/非表示のアニメーション
        open && !isTransitioning
          ? "translate-x-0 opacity-100"
          : position === 'left'
            ? "-translate-x-full opacity-0 pointer-events-none"
            : "translate-x-full opacity-0 pointer-events-none"
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
        onValueChange={(value) => handleTabChange(value as 'rating' | 'categories' | 'guide')}
        className="flex-1 flex flex-col min-h-0"
      >
        {/* 固定タブリスト */}
        <div className="px-6 mt-4 shrink-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rating">レーティング</TabsTrigger>
            <TabsTrigger value="categories">タグカテゴリ</TabsTrigger>
            <TabsTrigger value="guide">タグ付けガイド</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="rating"
          className="flex-1 mt-0 flex flex-col min-h-0 data-[state=inactive]:hidden"
        >
          {/* 固定モード切り替え */}
          <fieldset className="flex items-center gap-2 px-6 py-3 shrink-0">
            <legend className="sr-only">表示モード切り替え</legend>
            <div className="flex gap-2">
              <label className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm font-medium",
                flowchartMode === 'interactive'
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-muted-foreground hover:text-accent-foreground"
              )}>
                <input
                  type="radio"
                  name="flowchart-mode"
                  value="interactive"
                  checked={flowchartMode === 'interactive'}
                  onChange={() => setFlowchartMode('interactive')}
                  className="sr-only"
                />
                <Workflow className="h-4 w-4" />
                <span>ステップ形式</span>
              </label>
              <label className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm font-medium",
                flowchartMode === 'diagram'
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-muted-foreground hover:text-accent-foreground"
              )}>
                <input
                  type="radio"
                  name="flowchart-mode"
                  value="diagram"
                  checked={flowchartMode === 'diagram'}
                  onChange={() => setFlowchartMode('diagram')}
                  className="sr-only"
                />
                <ListTree className="h-4 w-4" />
                <span>図表で見る</span>
              </label>
            </div>
          </fieldset>

          {/* スクロール可能コンテンツエリア */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
            <ErrorBoundary>
              {flowchartMode === 'interactive' ? (
                <RatingFlowchart
                  onComplete={handleRatingFlowComplete}
                />
              ) : (
                <RatingFlowchartDiagram />
              )}
            </ErrorBoundary>
          </div>
        </TabsContent>

        <TabsContent
          value="categories"
          className="flex-1 mt-0 min-h-0 data-[state=inactive]:hidden overflow-y-auto px-6 py-4"
        >
          <ErrorBoundary>
            <TagCategoryVisualizer />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent
          value="guide"
          className="flex-1 mt-0 min-h-0 data-[state=inactive]:hidden overflow-y-auto px-6 py-4"
        >
          <ErrorBoundary>
            <TaggingGuide />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
