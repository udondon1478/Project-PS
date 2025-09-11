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

    let element: HTMLElement | null = null;
    let originalStyles: { position: string; zIndex: string; boxShadow: string; } | null = null;

    // Cleanup function to restore the element's original styles
    const cleanup = () => {
      if (element && originalStyles) {
        element.style.position = originalStyles.position;
        element.style.zIndex = originalStyles.zIndex;
        element.style.boxShadow = originalStyles.boxShadow;
      }
    };

    // Sets up the element for highlighting
    const setupElement = (el: HTMLElement) => {
      element = el;
      originalStyles = {
        position: el.style.position,
        zIndex: el.style.zIndex,
        boxShadow: el.style.boxShadow,
      };

      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setIsWaiting(false);
        setTargetRect(rect);
        el.style.position = 'relative';
        el.style.zIndex = '50';
        el.style.boxShadow = '0 0 0 4px hsl(var(--primary))';
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    };

    const initialElement = document.querySelector<HTMLElement>(step.selector);
    if (initialElement) {
      const rect = initialElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setupElement(initialElement);
        return cleanup;
      }
    }

    // Element not found or not visible, start polling
    setIsWaiting(true);
    const intervalId = setInterval(() => {
      const el = document.querySelector<HTMLElement>(step.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          clearInterval(intervalId);
          setIsWaiting(false);
          setupElement(el);
        }
      }
    }, 250); // Poll every 250ms

    return () => {
      clearInterval(intervalId);
      cleanup();
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
          sideOffset={16}
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
