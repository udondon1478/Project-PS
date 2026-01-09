'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuidelineButtonProps {
  variant?: 'icon' | 'text' | 'inline';
  tooltip?: string;
  className?: string;
  onClick?: () => void;
}

export function GuidelineButton({
  variant = 'icon',
  tooltip = 'ガイドラインを見る',
  className,
  onClick,
}: GuidelineButtonProps) {
  if (variant === 'text') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className={className}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            ガイドライン
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'inline') {
    return (
      <Button
        variant="link"
        size="sm"
        onClick={onClick}
        className={cn('h-auto p-0 text-xs', className)}
      >
        <HelpCircle className="mr-1 h-3 w-3" />
        {tooltip}
      </Button>
    );
  }

  // Default: icon variant
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={className}
          aria-label={tooltip}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
