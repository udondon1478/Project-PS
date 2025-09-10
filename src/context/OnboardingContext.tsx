"use client";

import React, { createContext, useContext, useState, useRef, RefObject, ReactNode } from 'react';

// Define the shape of the context state
interface OnboardingContextType {
  isTourActive: boolean;
  currentStep: number;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  setStep: (step: number) => void;
  searchInputRef: RefObject<HTMLDivElement> | null;
  productGridRef: RefObject<HTMLDivElement> | null;
  registerSearchInputRef: (ref: RefObject<HTMLDivElement>) => void;
  registerProductGridRef: (ref: RefObject<HTMLDivElement>) => void;
}

// Create the context with a default undefined value
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Create a provider component
export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Use state to hold the refs
  const [searchInputRef, setSearchInputRef] = useState<RefObject<HTMLDivElement> | null>(null);
  const [productGridRef, setProductGridRef] = useState<RefObject<HTMLDivElement> | null>(null);

  const startTour = () => {
    setCurrentStep(1);
    setIsTourActive(true);
  };

  const endTour = () => {
    setIsTourActive(false);
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const setStep = (step: number) => {
    setCurrentStep(step);
  };

  const registerSearchInputRef = (ref: RefObject<HTMLDivElement>) => {
    setSearchInputRef(ref);
  };

  const registerProductGridRef = (ref: RefObject<HTMLDivElement>) => {
    setProductGridRef(ref);
  };

  const value = {
    isTourActive,
    currentStep,
    startTour,
    endTour,
    nextStep,
    setStep,
    searchInputRef,
    productGridRef,
    registerSearchInputRef,
    registerProductGridRef,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Create a custom hook to use the onboarding context
export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
