'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export type Tour = 'search' | 'productDetail' | 'boothRegistration';

const ONBOARDING_LS_PREFIX = 'onboarding_completed_';

const getLocalStorageKey = (tour: Tour) => `${ONBOARDING_LS_PREFIX}${tour}`;

export function useOnboarding() {
  const { data: session, status, update: updateSession } = useSession();
  const [activeTour, setActiveTour] = useState<Tour | null>(null);

  const isAuthenticated = status === 'authenticated';

  const isTourCompleted = useCallback((tour: Tour): boolean => {
    if (status === 'loading') return true; // Don't start tours while session is loading
    if (typeof window === 'undefined') return true;

    if (isAuthenticated) {
      const user = session?.user as any;
      if (!user) return true;

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
      return localStorage.getItem(getLocalStorageKey(tour)) === 'true';
    }
  }, [status, session, isAuthenticated]);

  const startTour = useCallback((tour: Tour) => {
    if (!isTourCompleted(tour)) {
      setActiveTour(tour);
    }
  }, [isTourCompleted]);

  const completeTour = useCallback(async () => {
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
        await updateSession();
      } catch (error) {
        console.error('Onboarding completion error:', error);
      }
    } else {
      localStorage.setItem(getLocalStorageKey(activeTour), 'true');
    }
    setActiveTour(null);
  }, [activeTour, isAuthenticated, updateSession]);

  const closeTour = useCallback(() => {
    setActiveTour(null);
  }, []);

  const skipTour = useCallback(() => {
    if (isAuthenticated) {
      completeTour();
    } else {
      closeTour();
    }
  }, [isAuthenticated, completeTour, closeTour]);

  return {
    activeTour,
    startTour,
    completeTour,
    skipTour,
    isTourCompleted,
    showSkip: isAuthenticated,
  };
}
