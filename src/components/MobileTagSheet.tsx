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

import { PlusCircle, MinusCircle, Info } from 'lucide-react';
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
                    {productTags && (
                      <TagEditor
                        initialTags={polyseekTags.map(pt => pt.tag)}
                        onTagsChange={async (data) => {
                          await onTagsUpdate(data);
                          setIsTagEditorOpen(false);
                        }}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              {polyseekTags.length > 0 ? (
                <ScrollArea className="h-40">
                  <div className="pr-2 space-y-1">
                    {polyseekTags.map(({ tag }) => (
                      <div
                        key={`manual-${tag.id}`}
                        className="flex items-center justify-between p-3 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
                      >
                        <span className="text-sm font-medium pr-2 flex-1 min-w-0 truncate">
                          {tag.name}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50"
                            onClick={() => onAddNegativeTagToSearch(tag.name)}
                            aria-label={`${tag.name}を検索から除外`}
                          >
                            <MinusCircle size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-green-500 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/50"
                            onClick={() => onAddTagToSearch(tag.name)}
                            aria-label={`${tag.name}を検索に追加`}
                          >
                            <PlusCircle size={18} />
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                onClick={() => onViewTagDetails(tag.id)}
                                aria-label={`${tag.name}の詳細を見る`}
                              >
                                <Info size={18} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{tag.description || '説明文はありません。'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
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
                          {tagEditHistory?.length > 0 ? (
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
                  <div className="pr-2 space-y-1">
                    {officialTags.map(({ tag }) => (
                      <div
                        key={`official-${tag.id}`}
                        className="flex items-center justify-between p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <span className="text-sm pr-2 flex-1 min-w-0 truncate text-gray-600 dark:text-gray-400">
                          {tag.name}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"
                            onClick={() => onAddNegativeTagToSearch(tag.name)}
                            aria-label={`${tag.name}を検索から除外`}
                          >
                            <MinusCircle size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-green-400 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50"
                            onClick={() => onAddTagToSearch(tag.name)}
                            aria-label={`${tag.name}を検索に追加`}
                          >
                            <PlusCircle size={18} />
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                                onClick={() => onViewTagDetails(tag.id)}
                                aria-label={`${tag.name}の詳細を見る`}
                              >
                                <Info size={18} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{tag.description || '説明文はありません。'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
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
