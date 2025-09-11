"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const LOCAL_STORAGE_KEY = 'onboarding-states';

type OnboardingStatus = 'completed' | 'skipped';
type LocalState = Record<string, OnboardingStatus>;
type ServerState = {
  tourKey: string;
  status: string;
};

export function useOnboarding(tourKey: string) {
  const { data: session, status: sessionStatus } = useSession();
  const [shouldStart, setShouldStart] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getLocalState = (): LocalState => {
    try {
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      return localData ? JSON.parse(localData) : {};
    } catch (error) {
      console.error("Failed to parse onboarding state from localStorage", error);
      return {};
    }
  };

  const setLocalState = (localState: LocalState) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localState));
    } catch (error) {
      console.error("Failed to save onboarding state to localStorage", error);
    }
  };

  const markAsCompleted = useCallback((status: OnboardingStatus = 'completed') => {
    setShouldStart(false);
    if (sessionStatus === 'authenticated') {
      fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourKey, status }),
      }).catch(err => console.error("Failed to save onboarding state to server", err));
    } else {
      const localState = getLocalState();
      localState[tourKey] = status;
      setLocalState(localState);
    }
  }, [tourKey, sessionStatus]);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      setIsLoading(true);

      if (sessionStatus === 'loading') {
        return;
      }

      if (sessionStatus === 'unauthenticated') {
        const localState = getLocalState();
        if (!localState[tourKey]) {
          setShouldStart(true);
        }
        setIsLoading(false);
        return;
      }

      if (sessionStatus === 'authenticated') {
        // Migrate local state to server
        const localState = getLocalState();
        if (Object.keys(localState).length > 0) {
          for (const [key, status] of Object.entries(localState)) {
            await fetch('/api/onboarding', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tourKey: key, status }),
            });
          }
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }

        // Fetch server state
        try {
          const response = await fetch('/api/onboarding');
          if (!response.ok) {
            throw new Error('Failed to fetch onboarding states');
          }
          const serverStates: ServerState[] = await response.json();
          const tourState = serverStates.find(s => s.tourKey === tourKey);

          if (!tourState) {
            setShouldStart(true);
          }
        } catch (error) {
          console.error(error);
          // Decide on fallback behavior, e.g., don't show tour on error
          setShouldStart(false);
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkOnboardingStatus();
  }, [sessionStatus, tourKey]);

  return { shouldStart, markAsCompleted, isLoading, sessionStatus };
}
