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
import { TaggingGuide } from './TaggingGuide';
import { FlowchartMode } from '@/data/guidelines';

interface GuidelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'rating' | 'categories' | 'guide';
  initialRatingFlow?: boolean;
}

export function GuidelineDialog({
  open,
  onOpenChange,
  initialTab = 'rating',
  initialRatingFlow = false,
}: GuidelineDialogProps) {
  const [activeTab, setActiveTab] = useState<'rating' | 'categories' | 'guide'>(initialTab);
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
            if (value === 'rating' || value === 'categories' || value === 'guide') {
              setActiveTab(value);
            }
          }}
          className="flex-1 flex flex-col px-6 pb-6 min-h-0"
        >
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="rating">レーティング</TabsTrigger>
            <TabsTrigger value="categories">タグカテゴリ</TabsTrigger>
            <TabsTrigger value="guide">タグ付けガイド</TabsTrigger>
          </TabsList>

          <TabsContent value="rating" className="flex-1 mt-4 flex flex-col min-h-0">
            {/* モード切り替え */}
            <div className="flex items-center gap-2 mb-4 shrink-0">
              {[
                { id: 'interactive', label: 'ステップ形式', icon: Workflow, aria: 'ステップ形式で表示' },
                { id: 'diagram', label: '図表で見る', icon: ListTree, aria: '図表で表示' }
              ].map((mode) => {
                const Icon = mode.icon;
                return (
                  <Toggle
                    key={mode.id}
                    pressed={flowchartMode === mode.id}
                    onPressedChange={(pressed) => pressed && setFlowchartMode(mode.id as 'interactive' | 'diagram')}
                    variant="outline"
                    size="sm"
                    className={cn(
                      flowchartMode === mode.id && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    )}
                    aria-label={mode.aria}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {mode.label}
                  </Toggle>
                );
              })}
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

          <TabsContent value="guide" className="flex-1 mt-4 min-h-0">
            <div className="h-full -mx-6 overflow-y-auto">
              <div className="px-6 pb-4">
                <TaggingGuide />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
