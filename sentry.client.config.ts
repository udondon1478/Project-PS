// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

import { getStoredConsent } from "@/lib/cookieConsentStorage";

export function initSentry() {
  // Sentryが既に初期化済みの場合は再初期化をスキップ（重複インスタンス化を防止）
  if (Sentry.isInitialized()) {
    // eslint-disable-next-line no-console
    console.debug("Sentry is already initialized, skipping re-initialization");
    return;
  }

  // クライアントサイドでlocalStorageから同意状態を確認
  const hasAnalyticsConsent = getStoredConsent() === 'accepted';

  if (!hasAnalyticsConsent) {
    return;
  }

  Sentry.init({
    enabled: process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "false",
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: isProduction ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: !isProduction,

    replaysOnErrorSampleRate: 1.0,

    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: isProduction ? 0.1 : 1.0,

    // You can remove this option if you're not planning to use the Sentry Session Replay feature:
    integrations: (integrations) => {
      return [
        ...integrations.filter((integration) => integration.name !== "Replay"),
        Sentry.replayIntegration({
          // Additional Replay configuration goes in here, for example:
          maskAllText: true,
          blockAllMedia: true,
        }),
      ];
    },
  });
}

// ページ読み込み時に即座に初期化を試みる (同期実行)
// これにより、ハイドレーションエラーなどを捕捉可能にする
initSentry();
