# タスク完了サマリー

## タスク
BOOTHの公式タグ（`isOfficial: true`）が未設定の既存商品を対象に、BOOTH商品ページからタグを取得し一括で割り当てるCLIスクリプトを作成する。

## 結果
完了

## 変更内容
| 種別 | ファイル | 概要 |
|------|---------|------|
| 作成 | `src/scripts/backfill-booth-tags.ts` | BOOTH公式タグ一括バックフィルCLIスクリプト。JSON API優先・HTMLフォールバックでタグ取得、TagResolverで解決後ProductTag（isOfficial: true）として保存。レート制限（5000±1000ms）、エラースキップ継続、サマリー出力 |
| 作成 | `src/scripts/backfill-booth-tags.test.ts` | fetchTagsFromBooth（4テスト）+ main（10テスト）の計14テスト。vi.hoisted()によるvitest v4互換モック |

## 確認コマンド
```bash
npx vitest run src/scripts/backfill-booth-tags.test.ts
npx tsc --noEmit
```