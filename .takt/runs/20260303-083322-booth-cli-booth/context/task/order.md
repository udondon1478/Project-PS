調査が完了しました。指示書を作成します。

---

# タスク指示書: BOOTH公式タグ一括バックフィルCLIスクリプト

## 概要

BOOTHの公式タグ（`isOfficial: true`）が未設定の既存商品を対象に、BOOTH商品ページからタグを取得し一括で割り当てるCLIスクリプトを作成する。PolySeekリリース初期に登録された商品のデータ補完が目的であり、ワンショットのバッチ処理として実装する。

## 優先度: 高

## 作業内容

### 1. CLIスクリプトの作成

**作成ファイル:** `src/scripts/backfill-booth-tags.ts`

- DBから `ProductTag` に `isOfficial: true` のレコードが1件も存在しない商品を全件取得する
- 各商品の `boothJpUrl` を使ってBOOTH商品ページからタグを取得する
- 取得したタグを `TagResolver` で解決し、`ProductTag`（`isOfficial: true`）としてDBに保存する
- 処理の進捗をコンソールにログ出力する（処理済み件数/全件数、成功/失敗）
- エラーが発生した商品はスキップして次の商品に進む（エラー内容をログ出力）
- 全件処理後にサマリーを出力する（成功件数、失敗件数、スキップ件数）

### 2. レート制限

- 既存BOOTHスクレイパーのデフォルト値を踏襲する
- 参照: `src/lib/constants.ts`（`DEFAULT_REQUEST_INTERVAL_MS = 5000`）
- 参照: `src/lib/booth-scraper/orchestrator.ts`（PQueue設定: concurrency 1, interval 1000ms, intervalCap 1）

### 3. 既存モジュールの活用

以下の既存モジュールを再利用する:

| モジュール | ファイル | 用途 |
|-----------|---------|------|
| HTTPクライアント | `src/lib/booth-scraper/http-client.ts` | BOOTH商品ページのfetch |
| 商品パーサー | `src/lib/booth-scraper/product-parser.ts` | JSON/HTMLからタグ抽出 |
| タグリゾルバー | `src/lib/booth-scraper/tag-resolver.ts` | タグ名→Tag ID変換・自動作成 |
| 定数 | `src/lib/constants.ts` | レート制限デフォルト値 |
| Prismaクライアント | `src/lib/prisma.ts` | DB接続 |

### 4. タグ保存ロジック

- 既存の `product-creator.ts`（行187-223）のタグ保存パターンを参考にする
- `ProductTag` の `isOfficial: true` で保存
- `userId` はシステムユーザー（`SYSTEM_USER_EMAIL: system-scraper@polyseek.com`）を使用
- 既に同じタグが `isOfficial: false` で存在する場合でも、`isOfficial: true` のレコードを追加する（`@@unique([productId, tagId, isOfficial])` 制約に準拠）

## 参照資料

- `src/lib/booth-scraper/` ディレクトリ全体（特に `product-parser.ts`, `tag-resolver.ts`, `http-client.ts`, `product-creator.ts`）
- `src/scripts/seed-target-tags.ts`（既存CLIスクリプトのパターン参考）
- `prisma/schema.prisma`（`Product`, `Tag`, `ProductTag` モデル定義）
- `src/lib/constants.ts`（レート制限デフォルト値）

## 実行方法

```bash
npx tsx src/scripts/backfill-booth-tags.ts
```

## 確認方法

- スクリプト実行後、対象だった商品に `isOfficial: true` の `ProductTag` レコードが作成されていること
- レート制限が守られていること（リクエスト間隔がデフォルト値以上）
- エラー発生時にスクリプトが停止せず、エラーをログ出力して次の商品に進むこと

## やらないこと

- ドライラン機能
- 管理画面UIの追加（CLIスクリプトのみ）