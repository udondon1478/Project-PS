'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toggle } from '@/components/ui/toggle';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Workflow, ListTree } from 'lucide-react';
import { RatingFlowchart } from './RatingFlowchart';
import { RatingFlowchartDiagram } from './RatingFlowchartDiagram';
import { TagCategoryVisualizer } from './TagCategoryVisualizer';
import { FlowchartMode } from '@/data/guidelines';

interface GuidelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'rating' | 'categories';
  initialRatingFlow?: boolean;
}

export function GuidelineDialog({
  open,
  onOpenChange,
  initialTab = 'rating',
  initialRatingFlow = false,
}: GuidelineDialogProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [flowchartMode, setFlowchartMode] = useState<FlowchartMode>(
    initialRatingFlow ? 'interactive' : 'diagram'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl h-[85vh] flex flex-col p-0"
        aria-labelledby="guideline-title"
        aria-describedby="guideline-description"
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle id="guideline-title">
            タグ付けガイドライン
          </DialogTitle>
          <DialogDescription id="guideline-description">
            商品に適切なタグを付与するためのガイドラインです
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (value === 'rating' || value === 'categories') {
              setActiveTab(value);
            }
          }}
          className="flex-1 flex flex-col px-6 pb-6 min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="rating">レーティング</TabsTrigger>
            <TabsTrigger value="categories">タグカテゴリ</TabsTrigger>
          </TabsList>

          <TabsContent value="rating" className="flex-1 mt-4 flex flex-col min-h-0">
            {/* モード切り替え */}
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <Toggle
                pressed={flowchartMode === 'interactive'}
                onPressedChange={(pressed) => {
                  if (pressed) setFlowchartMode('interactive');
                }}
                variant="outline"
                size="sm"
                className={cn(
                  flowchartMode === 'interactive' && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
                aria-label="ステップ形式で表示"
              >
                <Workflow className="mr-2 h-4 w-4" />
                ステップ形式
              </Toggle>
              <Toggle
                pressed={flowchartMode === 'diagram'}
                onPressedChange={(pressed) => {
                  if (pressed) setFlowchartMode('diagram');
                }}
                variant="outline"
                size="sm"
                className={cn(
                  flowchartMode === 'diagram' && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
                aria-label="図表で表示"
              >
                <ListTree className="mr-2 h-4 w-4" />
                図表で見る
              </Toggle>
            </div>

            <div className="flex-1 -mx-6 overflow-y-auto min-h-0">
              <div className="px-6 pb-4">
                {flowchartMode === 'interactive' ? (
                  <RatingFlowchart onClose={() => onOpenChange(false)} />
                ) : (
                  <RatingFlowchartDiagram />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="flex-1 mt-4 min-h-0">
            <div className="h-full -mx-6 overflow-y-auto">
              <div className="px-6 pb-4">
                <TagCategoryVisualizer />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
