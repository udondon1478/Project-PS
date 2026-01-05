"use client";

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { TagList } from "@/components/TagList";
import TagEditor from "@/components/TagEditor";
import TagEditHistoryItem from "@/components/TagEditHistoryItem";
import { ProductTag, TagEditHistory } from "@/types/product";



interface MobileTagSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTags: ProductTag[];
  tagMap: { [key: string]: { name: string; displayName: string | null } };
  tagEditHistory: TagEditHistory[];
  onAddTagToSearch: (tagName: string) => void;
  onAddNegativeTagToSearch: (tagName: string) => void;
  onViewTagDetails: (tagId: string) => void;
  onTagsUpdate: (data: { tags: { id: string; name: string }[]; comment: string }) => Promise<void>;
}

const MobileTagSheet: React.FC<MobileTagSheetProps> = ({
  open,
  onOpenChange,
  productTags,
  tagMap,
  tagEditHistory,
  onAddTagToSearch,
  onAddNegativeTagToSearch,
  onViewTagDetails,
  onTagsUpdate,
}) => {
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);

  const polyseekTags = productTags?.filter(pt => !pt.isOfficial) || [];
  const officialTags = productTags?.filter(pt => pt.isOfficial) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col">
        <SheetHeader className="flex-shrink-0 flex flex-row items-center justify-between pr-8">
          <SheetTitle>タグ</SheetTitle>
        </SheetHeader>

        <TooltipProvider>
          <div className="flex-grow min-h-0 py-4 space-y-4 overflow-y-auto">
            {/* PolySeekタグ（独自タグ）ブロック */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  PolySeekタグ ({polyseekTags.length})
                </h3>
                <Dialog open={isTagEditorOpen} onOpenChange={setIsTagEditorOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">編集</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader><DialogTitle>タグを編集</DialogTitle></DialogHeader>
                    {/* productTags && を削除 */}
                    <TagEditor
                        initialTags={polyseekTags.map(pt => pt.tag)}
                        onTagsChange={async (data) => {
                          await onTagsUpdate(data);
                          setIsTagEditorOpen(false);
                        }}
                      />
                  </DialogContent>
                </Dialog>
              </div>

              {polyseekTags.length > 0 ? (
                <ScrollArea className="h-40">
                  <TagList
                    tags={polyseekTags.map(pt => pt.tag)}
                    onAddTagToSearch={onAddTagToSearch}
                    onAddNegativeTagToSearch={onAddNegativeTagToSearch}
                    onViewTagDetails={onViewTagDetails}
                    variant="manual"
                    viewMode="mobile"
                  />
                </ScrollArea>
              ) : (
                <div className="text-center py-4 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg text-sm text-blue-600 dark:text-blue-400">
                  <p>PolySeekタグはまだありません。</p>
                  <Button variant="link" className="text-blue-600 dark:text-blue-400" onClick={() => setIsTagEditorOpen(true)}>
                    タグを追加する
                  </Button>
                </div>
              )}

              <div className="mt-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={!tagEditHistory || tagEditHistory.length === 0}
                    >
                      タグ編集履歴を閲覧
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-xl lg:max-w-3xl h-[90vh] flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                      <DialogTitle>タグ編集履歴</DialogTitle>
                    </DialogHeader>
                    <div className="flex-grow min-h-0">
                      <ScrollArea className="h-full">
                        <div className="space-y-4 pr-6">
                          {tagEditHistory.length > 0 ? (
                            tagEditHistory.map((history) => (
                              <TagEditHistoryItem
                                key={history.id}
                                history={history}
                                tagMap={tagMap}
                              />
                            ))
                          ) : (
                            <p>編集履歴はありません。</p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* 公式タグ（BOOTH由来）ブロック */}
            {officialTags.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                  公式タグ（BOOTH由来） ({officialTags.length})
                </h3>
                <ScrollArea className="h-32">
                  <TagList
                    tags={officialTags.map(pt => pt.tag)}
                    onAddTagToSearch={onAddTagToSearch}
                    onAddNegativeTagToSearch={onAddNegativeTagToSearch}
                    onViewTagDetails={onViewTagDetails}
                    variant="official"
                    viewMode="mobile"
                  />
                </ScrollArea>
              </div>
            )}
          </div>
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
};

export default MobileTagSheet;
