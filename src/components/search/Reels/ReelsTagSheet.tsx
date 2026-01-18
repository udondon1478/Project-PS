"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ProductDetail } from '@/types/product';
import { cn } from '@/lib/utils';

interface ReelsTagSheetProps {
  isOpen: boolean;
  onClose: () => void;
  detail: ProductDetail;
  currentTags: string[];
  onAddTag: (tagName: string) => void;
}

interface RippleState {
  x: number;
  y: number;
  id: number;
}

export function ReelsTagSheet({
  isOpen,
  onClose,
  detail,
  currentTags,
  onAddTag,
}: ReelsTagSheetProps) {
  const [openPopoverTag, setOpenPopoverTag] = useState<string | null>(null);
  const [ripples, setRipples] = useState<Map<string, RippleState[]>>(new Map());
  const rippleIdRef = useRef(0);
  const rippleTimeoutRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      rippleTimeoutRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      rippleTimeoutRef.current.clear();
    };
  }, []);

  const tags = detail.productTags.map(pt => ({
    name: pt.tag.displayName || pt.tag.name,
    rawName: pt.tag.name,
    categoryColor: pt.tag.tagCategory?.color || null,
    categoryName: pt.tag.tagCategory?.name || null,
  }));

  const groupedTags = tags.reduce((acc, tag) => {
    const category = tag.categoryName || 'その他';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, typeof tags>);

  const isTagActive = useCallback((tagRawName: string) => {
    return currentTags.includes(tagRawName);
  }, [currentTags]);

  const handleTagClick = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    tagRawName: string
  ) => {
    if (isTagActive(tagRawName)) return;

    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newRipple: RippleState = {
      x,
      y,
      id: rippleIdRef.current++,
    };

    setRipples(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(tagRawName) || [];
      newMap.set(tagRawName, [...existing, newRipple]);
      return newMap;
    });

    const timeoutId = setTimeout(() => {
      rippleTimeoutRef.current.delete(newRipple.id);
      setRipples(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(tagRawName) || [];
        newMap.set(tagRawName, existing.filter(r => r.id !== newRipple.id));
        return newMap;
      });
    }, 400);
    rippleTimeoutRef.current.set(newRipple.id, timeoutId);

    setOpenPopoverTag(tagRawName);
  }, [isTagActive]);

  const handleAddTag = useCallback((tagRawName: string) => {
    onAddTag(tagRawName);
    setOpenPopoverTag(null);
    onClose();
  }, [onAddTag, onClose]);

  const handleCancel = useCallback(() => {
    setOpenPopoverTag(null);
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="text-left">
          <SheetTitle>タグ一覧</SheetTitle>
          <SheetDescription className="sr-only">この商品のタグ一覧</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {Object.entries(groupedTags).map(([category, categoryTags]) => (
            <div key={category}>
              <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                {category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {categoryTags.map((tag) => {
                  const isActive = isTagActive(tag.rawName);
                  const tagRipples = ripples.get(tag.rawName) || [];

                  return (
                    <Popover
                      key={tag.rawName}
                      open={openPopoverTag === tag.rawName}
                      onOpenChange={(open) => {
                        if (!open) setOpenPopoverTag(null);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          disabled={isActive}
                          onClick={(e) => handleTagClick(e, tag.rawName)}
                          className={cn(
                            "group relative flex items-center gap-1 overflow-hidden rounded-full border px-3 py-1.5 text-sm transition-colors",
                            isActive
                              ? "cursor-not-allowed border-muted bg-muted text-muted-foreground"
                              : "bg-background hover:bg-muted"
                          )}
                        >
                          {tagRipples.map((ripple) => (
                            <span
                              key={ripple.id}
                              className="pointer-events-none absolute rounded-full bg-primary/30"
                              style={{
                                left: ripple.x,
                                top: ripple.y,
                                width: 10,
                                height: 10,
                                marginLeft: -5,
                                marginTop: -5,
                                animation: 'ripple 400ms ease-out forwards',
                              }}
                            />
                          ))}
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: isActive ? '#888' : (tag.categoryColor || '#888') }}
                          />
                          <span>{tag.name}</span>
                          {isActive && (
                            <Check className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        className="w-auto p-3"
                        sideOffset={8}
                      >
                        <div className="flex flex-col gap-3">
                          <p className="text-sm">
                            「{tag.name}」を追加しますか？
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCancel}
                            >
                              キャンセル
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAddTag(tag.rawName)}
                            >
                              追加
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            </div>
          ))}

          {tags.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              タグがありません
            </p>
          )}
        </div>

        <style jsx>{`
          @keyframes ripple {
            0% {
              transform: scale(0);
              opacity: 0.5;
            }
            100% {
              transform: scale(4);
              opacity: 0;
            }
          }
        `}</style>
      </SheetContent>
    </Sheet>
  );
}
