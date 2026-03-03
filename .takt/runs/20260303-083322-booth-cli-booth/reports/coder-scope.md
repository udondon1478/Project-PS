# 変更スコープ宣言

## タスク
BOOTH公式タグ一括バックフィルCLIスクリプトの実装

## 変更予定
| 種別 | ファイル |
|------|---------|
| 作成 | `src/scripts/backfill-booth-tags.ts` |
| 変更 | `src/scripts/backfill-booth-tags.test.ts` |

## 推定規模
Small

## 影響範囲
- `src/scripts/backfill-booth-tags.ts` — 新規CLIスクリプト（既存コードへの影響なし）
- `src/scripts/backfill-booth-tags.test.ts` — vitest v4互換性のためのモック修正（`vi.hoisted()`導入、コンストラクタ互換性修正、`beforeEach`でのデフォルト値再設定）