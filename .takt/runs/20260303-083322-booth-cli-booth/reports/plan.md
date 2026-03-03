# タスク計画

## 元の要求

BOOTHの公式タグ（`isOfficial: true`）が未設定の既存商品を対象に、BOOTH商品ページからタグを取得し一括で割り当てるCLIスクリプト `src/scripts/backfill-booth-tags.ts` を作成する。

## 分析結果

### 目的

PolySeekリリース初期に登録された商品で `ProductTag` に `isOfficial: true` のレコードが1件も存在しないものを対象に、BOOTH商品ページからタグを取得し `ProductTag`（`isOfficial: true`）として一括バックフィルする。ワンショットのバッチ処理CLIスクリプトとして実装する。

### 参照資料の調査結果

| 参照資料 | 調査結果 |
|---------|---------|
| `src/lib/booth-scraper/product-parser.ts` | `parseProductJson`（行46-102）はJSON APIレスポンスからタグ配列（カテゴリ含む）とageRatingを抽出。`parseProductPage`（行104-422）はHTMLからタグ・ageRatingを抽出。いずれも `ProductPageResult` を返し `tags: string[]` と `ageRating: string \| null` を含む |
| `src/lib/booth-scraper/tag-resolver.ts` | `TagResolver` クラス。`resolveTags(tagNames)` でタグ名→Tag ID変換（未存在タグは自動作成）。`resolveAgeRating(rating)` で年齢制限タグを解決。コンストラクタで `TxClient \| PrismaClient` を受け付ける（行11） |
| `src/lib/booth-scraper/http-client.ts` | `BoothHttpClient` クラス。robots.txt準拠・30秒タイムアウト・レスポンスキャッシュ付きHTTPクライアント。シングルトン `boothHttpClient` をエクスポート |
| `src/lib/booth-scraper/product-creator.ts` | 行187-223: タグ保存パターン。通常タグは `isOfficial: true`、ageRatingは `isOfficial: true` と `isOfficial: false` の両方、クリエイタータグは `isOfficial: true` で保存 |
| `src/scripts/seed-target-tags.ts` | CLIスクリプトパターン: `seed()` → `.catch()` → `.finally(prisma.$disconnect())`。`@/lib/prisma` をインポートして使用 |
| `src/scripts/add-promotion-shop.ts` | より近い参照パターン。`new PrismaClient()` で独自インスタンス生成（行21）。JSON API優先・HTMLフォールバック（行106-132）。システムユーザー取得（行192-201）。進捗ログ・サマリー出力（行237-264）。`main()` → `.catch()` → `.finally(prisma.$disconnect())`（行266-273） |
| `prisma/schema.prisma` | `ProductTag` は `@@unique([productId, tagId, isOfficial])` 制約。同一商品・同一タグで `isOfficial: true` と `isOfficial: false` の両方を保持可能 |
| `src/lib/constants.ts` | `DEFAULT_REQUEST_INTERVAL_MS = 5000`（行38）、`SYSTEM_USER_EMAIL = 'system-scraper@polyseek.com'`（行28） |

### スコープ

**新規作成**: `src/scripts/backfill-booth-tags.ts`（1ファイルのみ、推定120〜140行）

**既存ファイルの変更**: なし。全て既存モジュールの再利用で完結。

### 検討したアプローチ

| アプローチ | 採否 | 理由 |
|-----------|------|------|
| 共有Prismaインスタンス（`@/lib/prisma`）使用 | 不採用 | 共有インスタンスは `log: ['query']` が有効でバッチ処理で大量SQLログが出力される。`add-promotion-shop.ts`（行21）と同様に `new PrismaClient()` で独自インスタンスを生成する |
| PQueueによる並行制御 | 不採用 | 逐次処理（concurrency 1）のためforループ＋waitJitterで十分。orchestratorのPQueue設定（concurrency 1, intervalCap 1）と実質同等で、単純な実装になる |
| 商品単位のトランザクション | 不採用 | `createMany` は単一操作として原子的に実行される。バックフィルスクリプトでは商品間の原子性は不要。部分成功した商品は再実行時にクエリから除外される（`none: { isOfficial: true }` 条件） |
| クリエイタータグのバックフィル含有 | 不採用 | クリエイタータグはBOOTHページの「タグ」ではなく販売者情報から派生するもの。既存の商品作成時に設定済み。タスク指示「BOOTHページからタグを取得」のスコープ外 |

### 実装アプローチ

**全体フロー**:

1. システムユーザー取得（`SYSTEM_USER_EMAIL` でDB検索）
2. `ProductTag` に `isOfficial: true` が1件もない商品を全件取得
3. 各商品について逐次処理:
   - `waitJitter(DEFAULT_REQUEST_INTERVAL_MS, 2000)` でレート制限（3000〜7000ms）
   - BOOTH商品ページからタグ取得（JSON API `url + '.json'` を優先、失敗時HTMLフォールバック）
   - `parseProductJson` または `parseProductPage` でタグ名配列とageRatingを抽出
   - `TagResolver.resolveTags()` でタグ名→Tag IDに変換
   - `TagResolver.resolveAgeRating()` でageRating→Tag IDに変換
   - `prisma.productTag.createMany()` で `isOfficial: true` のレコードを一括作成（`skipDuplicates: true`）
   - 進捗ログ出力（`[N/Total] タイトル`）
4. サマリー出力（成功・失敗・スキップ件数）
5. `prisma.$disconnect()`

**関数構成**:

- `main()`: メインフロー制御
- `fetchTagsFromBooth(url: string)`: BOOTH商品ページからタグ取得。`{ tagNames: string[], ageRating: string | null }` を返す。JSON API優先、HTMLフォールバック

## 実装ガイドライン

### 参照すべき既存パターン

| パターン | 参照ファイル:行 |
|---------|---------------|
| CLIスクリプト全体構造（main → catch → finally disconnect） | `src/scripts/add-promotion-shop.ts:266-273` |
| 独自PrismaClientインスタンス生成 | `src/scripts/add-promotion-shop.ts:21` |
| システムユーザー取得パターン | `src/scripts/add-promotion-shop.ts:192-201` |
| JSON API優先・HTMLフォールバックでのタグ取得 | `src/scripts/add-promotion-shop.ts:106-132` |
| TagResolver使用（resolveTags + resolveAgeRating） | `src/lib/booth-scraper/product-creator.ts:113-118` |
| タグ保存パターン（isOfficial: true） | `src/lib/booth-scraper/product-creator.ts:187-197` |
| レート制限（waitJitter呼び出し） | `src/lib/booth-scraper/utils.ts:1-9`、定数は `src/lib/constants.ts:38` |
| 進捗ログ・サマリー出力 | `src/scripts/add-promotion-shop.ts:237-264` |

### インポート一覧

```typescript
import { PrismaClient } from '@prisma/client';
import { boothHttpClient } from '@/lib/booth-scraper/http-client';
import { parseProductJson, parseProductPage } from '@/lib/booth-scraper/product-parser';
import { TagResolver } from '@/lib/booth-scraper/tag-resolver';
import { waitJitter } from '@/lib/booth-scraper/utils';
import { SYSTEM_USER_EMAIL, DEFAULT_REQUEST_INTERVAL_MS } from '@/lib/constants';
```

### 公式タグ未設定商品の取得クエリ

```typescript
const products = await prisma.product.findMany({
  where: {
    productTags: {
      none: { isOfficial: true },
    },
  },
  select: { id: true, boothJpUrl: true, title: true },
});
```

### タグ保存

```typescript
const allTagIds = [...new Set([...tagIds, ...(ageTagId ? [ageTagId] : [])])];

await prisma.productTag.createMany({
  data: allTagIds.map(tagId => ({
    productId: product.id,
    tagId,
    userId: systemUserId,
    isOfficial: true,
  })),
  skipDuplicates: true,
});
```

### 注意すべきアンチパターン

1. **共有Prismaインスタンスの使用禁止**: `import { prisma } from '@/lib/prisma'` を使わないこと。バッチ処理でクエリログが大量出力される。`new PrismaClient()` を使用する
2. **TagResolverへのDB渡し忘れ**: `new TagResolver(prisma)` のように独自prismaインスタンスを必ず渡すこと。デフォルト引数（`tag-resolver.ts:11`）は共有インスタンスを使用してしまう
3. **HTMLフォールバックでの二重レート制限**: JSON APIとHTMLフォールバックは同一商品の処理内。商品間の `waitJitter` のみで十分。フォールバック前に追加の `waitJitter` は不要（orchestratorパターン準拠）
4. **createManyのskipDuplicates忘れ**: 部分実行の再実行時にユニーク制約違反（`@@unique([productId, tagId, isOfficial])`）でクラッシュする
5. **ageTagIdの重複**: `resolveTags` の結果にageRatingと同名のタグが含まれる可能性がある。`Set` で重複除去してからcreateManyに渡すこと

## スコープ外

| 項目 | 除外理由 |
|------|---------|
| ドライラン機能 | タスク指示書「やらないこと」に明記 |
| 管理画面UI | タスク指示書「やらないこと」に明記 |
| クリエイタータグのバックフィル | BOOTHページの「タグ」ではなく販売者情報から派生。既存の商品作成時に設定済み |
| `isOfficial: false` のProductTagバックフィル | タスクは公式タグ（`isOfficial: true`）のバックフィルのみ |