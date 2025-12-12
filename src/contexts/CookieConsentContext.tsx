"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getStoredConsent, setStoredConsent, ConsentStatus } from '@/lib/cookieConsentStorage';

interface CookieConsentContextType {
  hasConsent: ConsentStatus;
  acceptCookies: () => void;
  rejectCookies: () => void;
  isAnalyticsEnabled: boolean;
  isHydrated: boolean;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

interface CookieConsentProviderProps {
  children: ReactNode;
}

export function CookieConsentProvider({ children }: CookieConsentProviderProps) {
  const [hasConsent, setHasConsent] = useState<ConsentStatus>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // localStorageから同意状態を復元
  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setHasConsent(stored);
    }
    setIsHydrated(true);
  }, []);

  const acceptCookies = useCallback(() => {
    setStoredConsent('accepted');
    setHasConsent('accepted');
  }, []);

  const rejectCookies = useCallback(() => {
    setStoredConsent('rejected');
    setHasConsent('rejected');
  }, []);

  // 分析Cookieが有効かどうか（同意済みの場合のみtrue）
  const isAnalyticsEnabled = hasConsent === 'accepted';

  // SSRとクライアントの不一致を防ぐため、hydration完了まで状態を返さない
  const contextValue: CookieConsentContextType = {
    hasConsent: isHydrated ? hasConsent : null,
    acceptCookies,
    rejectCookies,
    isAnalyticsEnabled: isHydrated ? isAnalyticsEnabled : false,
    isHydrated,
  };

  return (
    <CookieConsentContext.Provider value={contextValue}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextType {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}
