"use client";

import React, { useEffect, createContext, useContext } from 'react';
import { TourProvider, useTour, type StepType, type Components } from '@reactour/tour';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';

type OnboardingContextType = {
  markAsCompleted: (status?: 'completed' | 'skipped') => void;
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated';
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const useOnboardingContext = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within an OnboardingTour');
  }
  return context;
};

type OnboardingTourProps = {
  tourKey: string;
  steps: StepType[];
};

function TourLauncher() {
  const { setIsOpen } = useTour();
  useEffect(() => {
    setIsOpen(true);
  }, [setIsOpen]);
  return null;
}

const CustomNavigation: Components['Navigation'] = (props) => {
  const { sessionStatus, markAsCompleted } = useOnboardingContext();

  const handleSkip = () => {
    markAsCompleted('skipped');
    props.setIsOpen(false);
  };

  const handleFinish = () => {
    markAsCompleted('completed');
    props.setIsOpen(false);
  };

  const isLastStep = props.currentStep === props.steps.length - 1;

  return (
    <div className="flex justify-between items-center w-full pt-4">
      <div>
        {sessionStatus === 'authenticated' && (
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip Tour
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {props.currentStep > 0 && (
          <Button variant="outline" onClick={() => props.setCurrentStep(s => s - 1)}>
            Back
          </Button>
        )}
        <Button onClick={() => isLastStep ? handleFinish() : props.setCurrentStep(s => s + 1)}>
          {isLastStep ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
};

const CustomClose: Components['Close'] = (props) => {
    const { markAsCompleted } = useOnboardingContext();
    return (
        <button {...props} onClick={() => {
            markAsCompleted('completed');
            props.setIsOpen(false);
        }} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
        </button>
    )
}

export function OnboardingTour({ tourKey, steps }: OnboardingTourProps) {
  const { shouldStart, isLoading, markAsCompleted, sessionStatus } = useOnboarding(tourKey);

  if (isLoading || !shouldStart) {
    return null;
  }

  return (
    <OnboardingContext.Provider value={{ markAsCompleted, sessionStatus }}>
      <TourProvider
        steps={steps}
        styles={{
          popover: (base) => ({
            ...base,
            '--reactour-accent': '#1e88e5',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            padding: '20px',
          }),
          maskArea: (base) => ({ ...base, rx: '12px' }),
          badge: (base) => ({ ...base, backgroundColor: '#1e88e5' }),
        }}
        components={{
          Navigation: CustomNavigation,
          Close: CustomClose,
        }}
        showDots={false}
      >
        <TourLauncher />
      </TourProvider>
    </OnboardingContext.Provider>
  );
}
