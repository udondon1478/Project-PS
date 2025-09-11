'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useOnboarding, Tour } from '@/hooks/use-onboarding';
import { OnboardingTour } from './OnboardingTour';
import {
  searchTourSteps,
  productDetailTourSteps,
  boothRegistrationTourSteps
} from '@/lib/onboarding-steps';

const tourStepsMap: Record<Tour, any[]> = {
  search: searchTourSteps,
  productDetail: productDetailTourSteps,
  boothRegistration: boothRegistrationTourSteps,
};

export function OnboardingManager() {
  const { activeTour, startTour, completeTour, skipTour, showSkip } = useOnboarding();
  const pathname = usePathname();

  useEffect(() => {
    // Basic Search Tour
    if (pathname === '/' || pathname.startsWith('/search')) {
      // Delay slightly to ensure the page elements are rendered
      setTimeout(() => startTour('search'), 500);
    }

    // Product Detail Tour
    if (pathname.startsWith('/products/')) {
      setTimeout(() => startTour('productDetail'), 500);
    }

    // Booth Registration Tour
    if (pathname.startsWith('/register-item')) {
      setTimeout(() => startTour('boothRegistration'), 500);
    }
  }, [pathname, startTour]);

  if (!activeTour) {
    return null;
  }

  return (
    <OnboardingTour
      tourKey={activeTour}
      steps={tourStepsMap[activeTour]}
      isOpen={!!activeTour}
      onComplete={completeTour}
      onSkip={skipTour}
      showSkip={showSkip}
    />
  );
}
