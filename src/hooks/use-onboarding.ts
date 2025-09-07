'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export type Tour = 'search' | 'productDetail' | 'boothRegistration';

const ONBOARDING_LS_PREFIX = 'onboarding_completed_';

const getLocalStorageKey = (tour: Tour) => `${ONBOARDING_LS_PREFIX}${tour}`;

export function useOnboarding() {
  const { data: session, status, update: updateSession } = useSession();
  const [activeTour, setActiveTour] = useState<Tour | null>(null);

  const isAuthenticated = status === 'authenticated';

  const isTourCompleted = (tour: Tour): boolean => {
    if (typeof window === 'undefined') return true; // Don't run on server

    if (isAuthenticated) {
      // Assuming the session user object gets updated with our new fields
      const user = session?.user as any; // Cast to access our custom fields
      if (!user) return true; // Should not happen if authenticated

      switch (tour) {
        case 'search':
          return user.onboarding_search_completed || false;
        case 'productDetail':
          return user.onboarding_product_detail_completed || false;
        case 'boothRegistration':
          return user.onboarding_booth_registration_completed || false;
        default:
          return true;
      }
    } else {
      // Anonymous user
      return localStorage.getItem(getLocalStorageKey(tour)) === 'true';
    }
  };

  const startTour = (tour: Tour) => {
    if (!isTourCompleted(tour)) {
      setActiveTour(tour);
    }
  };

  const completeTour = async () => {
    if (!activeTour) return;
    if (typeof window === 'undefined') return;

    if (isAuthenticated) {
      try {
        const response = await fetch('/api/users/me/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tourName: activeTour }),
        });
        if (!response.ok) {
          throw new Error('Failed to update onboarding status');
        }
        // Manually trigger a session update to get the latest user data
        await updateSession();
      } catch (error) {
        console.error('Onboarding completion error:', error);
      }
    } else {
      // Anonymous user
      localStorage.setItem(getLocalStorageKey(activeTour), 'true');
    }
    setActiveTour(null); // Close the tour UI
  };

  const closeTour = () => {
    setActiveTour(null);
  }

  // If user is authenticated, skip is just completing the tour
  const skipTour = () => {
    if (isAuthenticated) {
      completeTour();
    } else {
      // For anonymous users, skip is not allowed, but we can just close the UI
      // The tour will reappear on next visit. This matches the "not skippable" requirement.
      closeTour();
    }
  };

  return {
    activeTour,
    startTour,
    completeTour,
    skipTour,
    isTourCompleted,
    // showSkip is true only for authenticated users as per requirements
    showSkip: isAuthenticated,
  };
}
