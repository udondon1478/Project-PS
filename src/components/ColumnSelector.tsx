"use client";

import React from 'react';
import { Slider } from "@/components/ui/slider";
import { LayoutGrid } from "lucide-react";

interface ColumnSelectorProps {
  columns: number;
  onColumnsChange: (columns: number) => void;
  min?: number;
  max?: number;
}

export function ColumnSelector({
  columns,
  onColumnsChange,
  min = 2,
  max = 6
}: ColumnSelectorProps) {
  return (
    <div className="hidden lg:flex items-center gap-4 bg-muted/30 px-4 py-2 rounded-full border border-border/50">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
        <LayoutGrid className="w-4 h-4" />
        <span>表示列数: {columns}</span>
      </div>
      <Slider
        aria-label="表示列数"
        value={[columns]}
        onValueChange={(values) => {
          const next = values[0];
          if (typeof next !== "number") return;
          const clamped = Math.min(max, Math.max(min, next));
          onColumnsChange(clamped);
        }}
        min={min}
        max={max}
        step={1}
        className="w-32 cursor-pointer"
      />
    </div>
  );
}
