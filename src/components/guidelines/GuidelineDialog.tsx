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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
          onValueChange={(value) => setActiveTab(value as 'rating' | 'categories')}
          className="flex-1 flex flex-col px-6 pb-6 min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="rating">レーティング</TabsTrigger>
            <TabsTrigger value="categories">タグカテゴリ</TabsTrigger>
          </TabsList>

          <TabsContent value="rating" className="flex-1 mt-4 flex flex-col min-h-0">
            {/* モード切り替え */}
            <RadioGroup
              value={flowchartMode}
              onValueChange={(value) => setFlowchartMode(value as FlowchartMode)}
              className="flex items-center gap-2 mb-4 shrink-0"
            >
              <div className="flex items-center">
                <RadioGroupItem value="interactive" id="mode-interactive" className="sr-only" />
                <Label
                  htmlFor="mode-interactive"
                  className={cn(
                    buttonVariants({ variant: flowchartMode === 'interactive' ? 'default' : 'outline', size: 'sm' }),
                    "cursor-pointer"
                  )}
                >
                  <Workflow className="mr-2 h-4 w-4" />
                  ステップ形式
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="diagram" id="mode-diagram" className="sr-only" />
                <Label
                  htmlFor="mode-diagram"
                  className={cn(
                    buttonVariants({ variant: flowchartMode === 'diagram' ? 'default' : 'outline', size: 'sm' }),
                    "cursor-pointer"
                  )}
                >
                  <ListTree className="mr-2 h-4 w-4" />
                  図表で見る
                </Label>
              </div>
            </RadioGroup>

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
