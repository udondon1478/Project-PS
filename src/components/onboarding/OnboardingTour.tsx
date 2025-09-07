'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface OnboardingStep {
  selector: string;
  title: string;
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  steps: OnboardingStep[];
  tourKey: string;
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  showSkip: boolean;
}

export function OnboardingTour({ steps, isOpen, onComplete, onSkip, showSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const step = useMemo(() => steps[currentStep], [steps, currentStep]);

  useEffect(() => {
    if (!isOpen || !step?.selector) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setIsWaiting(false);
        setTargetRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        return;
      }
    }

    // Element not found, start polling
    setIsWaiting(true);
    const intervalId = setInterval(() => {
      const el = document.querySelector(step.selector);
      if (el) {
        clearInterval(intervalId);
        setIsWaiting(false);
        setTargetRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 250); // Poll every 250ms

    return () => {
      clearInterval(intervalId);
    };
  }, [currentStep, isOpen, step]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen || !targetRect || !step || isWaiting) {
    // Also hide the tour while waiting for the element to appear
    return null;
  }

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />

      {/* Highlight Box */}
      <div
        className="fixed z-50 pointer-events-none border-2 border-primary ring-4 ring-primary/20 rounded-md transition-all duration-300"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
        }}
      />

      <Popover open={isOpen}>
        <PopoverAnchor
          style={{
            top: targetRect.top + targetRect.height / 2,
            left: targetRect.left + targetRect.width / 2,
          }}
          className="fixed z-50"
        />
        <PopoverContent
          side={step.side || 'bottom'}
          align="center"
          className="z-50 w-80 onboarding-popover-content"
          onInteractOutside={(e) => e.preventDefault()} // Prevents closing on outside click
        >
          <div className="space-y-4">
            <h3 className="font-bold text-lg">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.content}</p>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {currentStep + 1} / {steps.length}
              </span>

              <div className="flex items-center gap-2">
                {showSkip && (
                  <Button variant="ghost" size="sm" onClick={onSkip}>
                    Skip
                  </Button>
                )}
                {!isFirstStep && (
                  <Button variant="outline" size="icon" onClick={handleBack}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" onClick={handleNext}>
                  {isLastStep ? <X className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
