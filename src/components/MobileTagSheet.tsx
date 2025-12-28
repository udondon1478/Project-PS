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

interface ProductTag {
  tag: {
    id: string;
    name: string;
    description: string | null;
    tagCategoryId: string;
    tagCategory: {
      id: string;
      name: string;
    };
  };
}

interface TagEditHistory {
  id: string;
  editor: {
    id: string;
    name: string | null;
    image: string | null;
  };
  version: number;
  addedTags: string[];
  removedTags: string[];
  keptTags: string[];
  comment: string | null;
  score: number;
  createdAt: string;
  userVote: { score: number } | null;
}

interface MobileTagSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTags: ProductTag[];
  tagMap: { [key: string]: string };
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] flex flex-col">
        <SheetHeader className="flex-shrink-0 flex flex-row items-center justify-between pr-8">
          <SheetTitle>タグ ({productTags?.length || 0})</SheetTitle>
          <Dialog open={isTagEditorOpen} onOpenChange={setIsTagEditorOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">編集</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader><DialogTitle>タグを編集</DialogTitle></DialogHeader>
              {productTags && (
                <TagEditor
                  initialTags={productTags.map(pt => pt.tag)}
                  onTagsChange={async (data) => {
                    await onTagsUpdate(data);
                    setIsTagEditorOpen(false);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </SheetHeader>

        <TooltipProvider>
          <div className="flex-grow min-h-0 py-4">
            {productTags && productTags.length > 0 ? (
              <ScrollArea className="h-full">
                <div className="pr-4 space-y-1">
                  {productTags.map(({ tag }) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-accent dark:hover:bg-gray-700/50 transition-colors"
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
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                <p className="mb-2">この商品にはまだタグがありません。</p>
                <Button variant="link" onClick={() => setIsTagEditorOpen(true)}>
                  最初のタグを追加する
                </Button>
              </div>
            )}
          </div>
        </TooltipProvider>

        <SheetFooter className="flex-shrink-0 border-t pt-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default MobileTagSheet;
