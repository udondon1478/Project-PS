"use client";

import { useEffect, useState } from 'react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

// スクリプト要素のID（重複挿入防止用）
const GA_SCRIPT_ID = 'google-analytics-script';

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
    // 同意がない場合は何もしない
    if (!isAnalyticsEnabled) {
      return;
    }

    // 既にロード済みの場合は何もしない（DOM検出 または window.gtag存在確認）
    const existingScript = document.getElementById(GA_SCRIPT_ID);
    if (existingScript || typeof window.gtag === 'function') {
      setIsLoaded(true);
      return;
    }

    // ローカルstateで既にロード済みの場合は何もしない
    if (isLoaded) {
      return;
    }

    // Google Analytics スクリプトを動的に挿入
    const script = document.createElement('script');
    script.id = GA_SCRIPT_ID;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    script.async = true;

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

    // エラーハンドリング：読み込み失敗時も再試行を防止
    script.onerror = () => {
      console.error('[AnalyticsLoader] Google Analytics スクリプトの読み込みに失敗しました');
      setIsLoaded(true); // 再試行を防止するためtrueに設定
    };

    document.head.appendChild(script);
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
