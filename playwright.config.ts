import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// .env からテストデータベースの変数を読み込むようにもできるがここで宣言して問題なし
// const TEST_POSTGRES_USER = process.env.TEST_POSTGRES_USER ?? 'testuser';
// const TEST_POSTGRES_PASSWORD = process.env.TEST_POSTGRES_PASSWORD ?? 'testpass';
// const TEST_POSTGRES_DB = process.env.TEST_POSTGRES_DB ?? 'testdb';
const TEST_POSTGRES_USER = 'testuser';
const TEST_POSTGRES_PASSWORD = 'testpass';
const TEST_POSTGRES_DB = 'testdb';

// docker-compose.yml に基づき、ポート 5433 を使用
const testDatabaseUrl = `postgresql://${TEST_POSTGRES_USER}:${TEST_POSTGRES_PASSWORD}@localhost:5433/${TEST_POSTGRES_DB}`;

// Playwrightのプロセス全体で DATABASE_URL をテスト用のものに上書きする
process.env.DATABASE_URL = testDatabaseUrl;

// テスト用の認証シークレットを設定 (サーバーとテストで一致させる必要がある)
const TEST_AUTH_SECRET = 'dummy-e2e-secret-key-replace-this';
process.env.AUTH_SECRET = TEST_AUTH_SECRET;
process.env.NEXTAUTH_SECRET = TEST_AUTH_SECRET;

// 環境変数からベースURLを読み込む。未定義の場合はローカルホストをフォールバックとして使用
// 環境変数からベースURLを読み込む。未定義の場合はローカルホストをフォールバックとして使用
const baseURL = 'http://localhost:3001';

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

  // すべてのブラウザプロジェクトを順次実行してDB競合を防ぐ
  workers: 1,

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
    command: 'npm run start -- -p 3001',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: testDatabaseUrl,
      AUTH_SECRET: TEST_AUTH_SECRET,
      NEXTAUTH_SECRET: TEST_AUTH_SECRET,
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3001',
      NEXTAUTH_URL: 'http://localhost:3001',
    },
  },
});
