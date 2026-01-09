'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toggle } from '@/components/ui/toggle';
import { Workflow, ListTree } from 'lucide-react';
import { RatingFlowchart } from './RatingFlowchart';
import { RatingFlowchartDiagram } from './RatingFlowchartDiagram';
import { TagCategoryVisualizer } from './TagCategoryVisualizer';
import { FlowchartMode } from '@/data/guidelines';

interface GuidelineSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'rating' | 'categories';
  initialRatingFlow?: boolean;
}

export function GuidelineSheet({
  open,
  onOpenChange,
  initialTab = 'rating',
  initialRatingFlow = false,
}: GuidelineSheetProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [flowchartMode, setFlowchartMode] = useState<FlowchartMode>(
    initialRatingFlow ? 'interactive' : 'diagram'
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] flex flex-col p-0"
      >
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
          <SheetTitle>タグ付けガイドライン</SheetTitle>
          <SheetDescription>
            商品に適切なタグを付与するためのガイドラインです
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'rating' | 'categories')}
          className="flex-1 flex flex-col px-4 pb-4 min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="rating">レーティング</TabsTrigger>
            <TabsTrigger value="categories">タグカテゴリ</TabsTrigger>
          </TabsList>

          <TabsContent value="rating" className="flex-1 mt-4 flex flex-col min-h-0 data-[state=inactive]:hidden">
            {/* モード切り替え */}
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <Toggle
                pressed={flowchartMode === 'interactive'}
                onPressedChange={() => setFlowchartMode('interactive')}
                aria-label="ステップ形式に切り替え"
                className="text-xs"
              >
                <Workflow className="mr-1 h-3 w-3" />
                ステップ
              </Toggle>
              <Toggle
                pressed={flowchartMode === 'diagram'}
                onPressedChange={() => setFlowchartMode('diagram')}
                aria-label="図表で見る"
                className="text-xs"
              >
                <ListTree className="mr-1 h-3 w-3" />
                図表
              </Toggle>
            </div>

            <div className="flex-1 -mx-4 overflow-y-auto min-h-0">
              <div className="px-4 pb-4">
                {flowchartMode === 'interactive' ? (
                  <RatingFlowchart onClose={() => onOpenChange(false)} />
                ) : (
                  <RatingFlowchartDiagram />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="flex-1 mt-4 min-h-0 data-[state=inactive]:hidden">
            <div className="h-full -mx-4 overflow-y-auto">
              <div className="px-4 pb-4">
                <TagCategoryVisualizer />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
