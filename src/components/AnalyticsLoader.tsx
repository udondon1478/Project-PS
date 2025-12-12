"use client";

import { useEffect, useState } from 'react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

interface AnalyticsLoaderProps {
  gaId: string;
}

/**
 * Cookie同意後にGoogle Analyticsを動的にロードするコンポーネント
 */
export default function AnalyticsLoader({ gaId }: AnalyticsLoaderProps) {
  const { isAnalyticsEnabled } = useCookieConsent();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 既にロード済み、または同意がない場合は何もしない
    if (isLoaded || !isAnalyticsEnabled) {
      return;
    }

    // Google Analytics スクリプトを動的に挿入
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    script.async = true;
    document.head.appendChild(script);

    // gtag関数を初期化
    script.onload = () => {
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: unknown[]) {
        window.dataLayer.push(args);
      }
      gtag('js', new Date());
      gtag('config', gaId);
      
      // グローバルにgtagを設定
      (window as unknown as { gtag: typeof gtag }).gtag = gtag;
      
      setIsLoaded(true);
    };
  }, [isAnalyticsEnabled, isLoaded, gaId]);

  // このコンポーネントは何もレンダリングしない
  return null;
}

// TypeScript用のグローバル型定義
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}
