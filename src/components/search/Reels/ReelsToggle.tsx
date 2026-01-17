"use client";

import React from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReelsToggleProps {
  onClick: () => void;
}

export function ReelsToggle({ onClick }: ReelsToggleProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg sm:hidden"
      aria-label="Reelsモードを開始"
    >
      <Play className="h-6 w-6 fill-current" />
    </Button>
  );
}
