調査完了。全ての参照資料を読み込み、コードを分析しました。以下が計画です。

---

## 計画レポート

### 1. 要件分析

**目的**: `ProductTag`に`isOfficial: true`のレコードが1件も存在しない既存商品を対象に、BOOTH商品ページからタグを取得し一括バックフィルするCLIスクリプトを作成する。

**要件と変更要否の判定**:

| 要件 | 変更要/不要 | 根拠 |
|------|------------|------|
| CLIスクリプト作成 | 変更要 | `src/scripts/backfill-booth-tags.ts` は存在しない（grep確認済み） |
| 公式タグ未設定商品の取得 | 変更要 | 新規クエリが必要 |
| BOOTH商品ページからタグ取得 | 変更要 | 既存モジュール再利用、新規配線が必要 |
| レート制限 | 変更要 | 既存定数・ユーティリティを使用 |
| 進捗ログ/サマリー出力 | 変更要 | 新規実装 |

### 2. 影響範囲

**新規作成ファイル**: 1件のみ
- `src/scripts/backfill-booth-tags.ts`

**既存ファイルの変更**: なし

このスクリプトは既存モジュールを再利用するのみで、既存コードへの変更は不要。

### 3. ファイル構成

単一ファイル（推定 120〜140行）。300行の制約内。1ファイル1責務（バックフィル処理）。

### 4. 実装アプローチ

#### 4.1 全体フロー

```
1. システムユーザー取得
2. 公式タグ未設定の商品を全件取得
3. 各商品について:
   a. レート制限（waitJitter）
   b. BOOTH商品ページをfetch（JSON API → HTML フォールバック）
   c. タグをパース（parseProductJson / parseProductPage）
   d. TagResolverでタグ名→Tag IDに解決
   e. ProductTagレコードをisOfficial: trueで一括作成
   f. 進捗をログ出力
4. サマリー出力
5. Prisma disconnect
```

#### 4.2 商品取得クエリ

```typescript
prisma.product.findMany({
  where: {
    productTags: {
      none: { isOfficial: true },
    },
  },
  select: { id: true, boothJpUrl: true, title: true },
});
```

#### 4.3 タグ取得方式（JSON API優先、HTMLフォールバック）

既存の`orchestrator.ts`（行456-473）と同じパターンを踏襲:
1. `boothHttpClient.fetch(url + '.json')` でJSON APIを試行
2. 失敗時は `boothHttpClient.fetch(url)` でHTMLを取得し `parseProductPage` でパース

JSON APIの方がタグデータが信頼性高い（特にカテゴリ情報: `parseProductJson` の行50-67で`json.category`から親カテゴリ・サブカテゴリを抽出）。

#### 4.4 タグ保存ロジック

`product-creator.ts`（行187-223）のパターンを参考に:

- **通常タグ**: `TagResolver.resolveTags(tags)` → `isOfficial: true`
- **年齢制限タグ**: `TagResolver.resolveAgeRating(ageRating)` → `isOfficial: true`
- **クリエイタータグ**: 対象外（既存商品作成時に設定済み。タスク指示は「BOOTHページからタグを取得」であり、クリエイタータグはページのタグではなく販売者情報から派生するもの）

保存方法:
```typescript
prisma.productTag.createMany({
  data: allTagIds.map(tagId => ({
    productId: product.id,
    tagId,
    userId: systemUserId,
    isOfficial: true,
  })),
  skipDuplicates: true, // @@unique([productId, tagId, isOfficial]) 制約を安全に処理
});
```

`skipDuplicates: true` により、同じタグが既に`isOfficial: true`で存在する場合（部分実行の再実行時など）は静かにスキップされる。`isOfficial: false`で存在する場合は、ユニーク制約が`[productId, tagId, isOfficial]`なので`isOfficial: true`のレコードを追加可能（タスク指示書に明記）。

#### 4.5 レート制限

既存スクレイパーのデフォルト値を踏襲（タスク指示書の明記事項）:
- `DEFAULT_REQUEST_INTERVAL_MS = 5000`（`src/lib/constants.ts:38`）
- `waitJitter(5000, 2000)` = 3000〜7000msのランダム間隔（`orchestrator.ts:454` のパターン）
- 逐次処理（concurrency 1）。PQueueは不要（単一ループで十分）

#### 4.6 エラーハンドリング

- 商品単位のtry/catch: エラー発生時はログ出力してスキップ、次の商品に進む
- タグが0件の場合もスキップ扱い（BOOTH側でページが削除済み等）

#### 4.7 PrismaClient

`add-promotion-shop.ts`（行21）と同じパターンで、スクリプト内で独自のPrismaClientインスタンスを生成:
```typescript
const prisma = new PrismaClient();
```
理由: `@/lib/prisma.ts`の共有インスタンスは`log: ['query']`が有効（行10）であり、バッチ処理で大量のSQLログが出力される。独自インスタンスではクエリログを無効にする。

TagResolverにはこの独自prismaインスタンスを渡す（`TagResolver`のコンストラクタが`TxClient`を受け付ける: `tag-resolver.ts:11`）。

#### 4.8 スクリプト構造

```
main()
├── getSystemUser()
├── getProductsWithoutOfficialTags()
├── for each product:
│   ├── waitJitter()
│   ├── fetchTagsFromBooth(url)
│   │   ├── JSON API試行
│   │   └── HTMLフォールバック
│   ├── tagResolver.resolveTags()
│   ├── tagResolver.resolveAgeRating()
│   └── prisma.productTag.createMany()
└── printSummary()

fetchTagsFromBooth(url)
├── boothHttpClient.fetch(url + '.json')
├── parseProductJson() or parseProductPage()
└── return { tagNames, ageRating }
```

### 5. Coder向け実装ガイドライン

#### 5.1 参照すべき既存パターン

| パターン | 参照ファイル:行 |
|---------|---------------|
| CLIスクリプトの全体構造（main → catch → finally disconnect） | `src/scripts/add-promotion-shop.ts:266-273` |
| システムユーザー取得 | `src/scripts/add-promotion-shop.ts:192-201` |
| JSON API優先・HTMLフォールバック | `src/lib/booth-scraper/orchestrator.ts:456-473` |
| TagResolver使用（タグ解決 + ageRating解決） | `src/lib/booth-scraper/product-creator.ts:113-118` |
| タグ保存（isOfficial: true） | `src/lib/booth-scraper/product-creator.ts:187-223` |
| レート制限（waitJitter呼び出し） | `src/lib/booth-scraper/orchestrator.ts:454` |
| 進捗ログのパターン | `src/scripts/add-promotion-shop.ts:237-258` |

#### 5.2 インポート一覧

```typescript
import { PrismaClient } from '@prisma/client';
import { boothHttpClient } from '@/lib/booth-scraper/http-client';
import { parseProductJson, parseProductPage } from '@/lib/booth-scraper/product-parser';
import { TagResolver } from '@/lib/booth-scraper/tag-resolver';
import { waitJitter } from '@/lib/booth-scraper/utils';
import { SYSTEM_USER_EMAIL, DEFAULT_REQUEST_INTERVAL_MS } from '@/lib/constants';
```

#### 5.3 注意すべきアンチパターン

1. **共有Prismaインスタンスの使用禁止**: `import { prisma } from '@/lib/prisma'` を使わないこと。バッチ処理でクエリログが大量出力される。`new PrismaClient()` を使用する
2. **TagResolverへのDB渡し忘れ**: `new TagResolver(prisma)` のように独自prismaインスタンスを渡すこと。デフォルト引数は共有インスタンスを使用してしまう
3. **HTMLフォールバックでの二重レート制限**: JSON APIとHTMLフォールバックは同一商品の処理内。商品間のwaitJitterのみで十分。フォールバック前に追加のwaitJitterは不要（orchestratorパターン準拠）
4. **createMany の skipDuplicates 忘れ**: 部分実行の再実行時にユニーク制約違反でクラッシュする