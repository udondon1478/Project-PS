import { defineConfig, devices } from '@playwright/test';

// 環境変数からベースURLを読み込む。未定義の場合はローカルホストをフォールバックとして使用
const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  // テストファイルの場所
  testDir: './e2e',

  // アサーションのタイムアウト時間 (例: expect(locator).toHaveText())
  timeout: 30 * 1000,

  // expect() のタイムアウト時間
  expect: {
    timeout: 5000,
  },

  // CIでは失敗したテストを再試行する
  retries: process.env.CI ? 2 : 0,

  // CIではワーカー数を制限する
  workers: process.env.CI ? 1 : undefined,

  // レポーターの設定
  reporter: 'html',

  use: {
    // ベースURL
    baseURL,

    // 各テストでトレースを収集する
    trace: 'on-first-retry',
  },

  // テスト対象ブラウザの設定
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // テスト実行前に開発サーバーを起動
  webServer: {
    command: 'npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
