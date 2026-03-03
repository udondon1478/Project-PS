# 変更スコープ宣言

## タスク
BOOTH公式タグ一括バックフィルCLIスクリプトのテスト作成

## 変更予定
| 種別 | ファイル |
|------|---------|
| 作成 | `src/scripts/backfill-booth-tags.test.ts` |

## 推定規模
Small

## 影響範囲
- `src/scripts/backfill-booth-tags.ts`（未作成の実装対象）
- `src/lib/booth-scraper/http-client.ts`（モック対象）
- `src/lib/booth-scraper/product-parser.ts`（モック対象）
- `src/lib/booth-scraper/tag-resolver.ts`（モック対象）
- `src/lib/booth-scraper/utils.ts`（モック対象）
