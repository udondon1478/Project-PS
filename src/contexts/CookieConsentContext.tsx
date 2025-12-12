"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'polyseek_cookie_consent';

type ConsentStatus = 'accepted' | 'rejected' | null;

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
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'accepted' || stored === 'rejected') {
        setHasConsent(stored);
      }
    } catch (e) {
      console.error('Failed to access localStorage:', e);
    }
    setIsHydrated(true);
  }, []);

  const acceptCookies = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch (e) {
      console.error('Failed to save consent to localStorage:', e);
    }
    setHasConsent('accepted');
  }, []);

  const rejectCookies = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'rejected');
    } catch (e) {
      console.error('Failed to save consent to localStorage:', e);
    }
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

/**
 * サーバーサイドやSentryなどのContext外から同意状態を確認するためのユーティリティ
 */
export function getStoredConsent(): ConsentStatus {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'accepted' || stored === 'rejected') {
    return stored;
  }
  return null;
}
