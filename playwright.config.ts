import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// .env からテストデータベースの変数を読み込む
const TEST_POSTGRES_USER = 'testuser';
const TEST_POSTGRES_PASSWORD = 'testpass';
const TEST_POSTGRES_DB = 'testdb';

// docker-compose.yml に基づき、ポート 5433 を使用
const testDatabaseUrl = `postgresql://${TEST_POSTGRES_USER}:${TEST_POSTGRES_PASSWORD}@localhost:5433/${TEST_POSTGRES_DB}`;

// Playwrightのプロセス全体で DATABASE_URL をテスト用のものに上書きする
process.env.DATABASE_URL = testDatabaseUrl;

// 環境変数からベースURLを読み込む。未定義の場合はローカルホストをフォールバックとして使用
const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  fullyParallel: false,

  // テストファイルの場所
  testDir: './e2e',

  // アサーションのタイムアウト時間 (例: expect(locator).toHaveText())
  timeout: 30 * 1000,

  // expect() のタイムアウト時間
  expect: {
    timeout: 30000,
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
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: testDatabaseUrl,
    },
  },
});
