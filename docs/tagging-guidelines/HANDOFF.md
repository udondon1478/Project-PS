# タグ付けガイドライン実装 - タスク引継ぎドキュメント

## プロジェクト概要

PolySeek v2のタグ付けガイドライン策定と実装タスクの引継ぎドキュメントです。

### プロジェクト目標

VRChat向けBOOTH商品検索サービス「PolySeek」に、Danbooru等のBooru系サイトを参考にしたタグ付けガイドラインを整備し、ユーザーが適切なタグを付与できる仕組みを提供する。

## 完了したタスク

### 1. 調査フェーズ

#### Danbooruのガイドライン調査 ✓

- **調査対象**: https://danbooru.donmai.us/wiki_pages/howto:rate
- **調査内容**:
  - 4段階のレーティングシステム (General, Sensitive, Questionable, Explicit)
  - 各レーティングの詳細な基準と具体例
  - セーフサーチ機能の実装方法

**主要な発見**:
- レーティングは明確な基準に基づいて分類される
- 性的表現と暴力表現の両方を考慮
- 迷った場合の判断基準が明確に示されている
- 子供のようなキャラクターに対する特別な配慮

#### sankakucomplexのUI調査 (部分的)

- **試行内容**: https://chan.sankakucomplex.com/wiki へのアクセス
- **結果**: サンドボックス環境からのアクセスがBOT判定でブロック
- **代替アプローチ**: Danbooruのガイドライン内容を主軸として進行

#### プロジェクト構造調査 ✓

- **プロジェクトタイプ**: Next.js (App Router)
- **データベース**: PostgreSQL + Prisma
- **既存のタグシステム**:
  - Tag, TagCategory, ProductTag モデル実装済み
  - TagTranslation (日英翻訳) 実装済み
  - TagImplication (含意関係) 実装済み
  - TagHierarchy (親子関係) 実装済み
  - ユーザーのセーフサーチ設定 (isSafeSearchEnabled) 実装済み

### 2. ドキュメント作成フェーズ

#### 作成済みドキュメント ✓

1. **`docs/tagging-guidelines/rating-guidelines.md`**
   - レーティングシステムの概要
   - 4段階のレーティング詳細 (General, Sensitive, Questionable, Explicit)
   - 各レーティングの適用基準と具体例
   - タグ付け方法と判断基準
   - VRChat/BOOTHコンテキストに適応

2. **`docs/tagging-guidelines/rating-flowchart.md`**
   - インタラクティブなYes/No形式のフローチャート
   - 12個の質問による段階的な判定
   - 各レーティングへの明確なパス
   - Web実装時のUI仕様案を含む

3. **`docs/tagging-guidelines/index.md`**
   - タグ付けガイドラインの総合インデックス
   - システム概要と特徴
   - ガイドライン構成の説明
   - タグ付けのベストプラクティス
   - 検索機能の説明
   - 実装状況のまとめ

## 残りのタスク

### 1. ドキュメント作成 (残作業)

#### `docs/tagging-guidelines/tag-categories.md` (未完成)

**内容**:
- 8つのタグカテゴリの詳細
  - Rating (レーティング) - `#E74C3C` (赤)
  - Character (キャラクター) - `#3498DB` (青)
  - Clothing (衣服) - `#9B59B6` (紫)
  - Body (身体) - `#E67E22` (オレンジ)
  - Scene (シーン) - `#1ABC9C` (ターコイズ)
  - Style (スタイル) - `#F39C12` (黄)
  - Meta (メタ) - `#95A5A6` (グレー)
  - General (一般) - `#34495E` (ダークグレー)
- 各カテゴリの具体的なタグ例
- カテゴリごとの使用ガイドライン

**進捗**: 60%完成 (ドラフト準備中に中断)

#### `docs/tagging-guidelines/implementation-plan.md` (未作成)

**必要な内容**:
1. データベース変更計画
   - レーティングタグカテゴリの追加
   - TagCategoryへの初期データ投入
   - マイグレーション手順

2. バックエンド実装
   - レーティングタグの自動検証
   - セーフサーチフィルタリング機能
   - レーティングタグの必須化

3. フロントエンド実装
   - レーティング判定フローチャートUI
   - タグガイドライン表示ページ
   - タグ入力時のカテゴリ表示
   - タグ色分け表示

4. 実装優先順位
   - Phase 1: レーティングタグカテゴリの追加とバックエンド実装
   - Phase 2: ガイドライン表示ページ
   - Phase 3: フローチャートUIの実装

### 2. データベース実装

#### レーティングタグカテゴリの作成

```typescript
// prisma/seed.ts または migration で実行
const ratingCategory = await prisma.tagCategory.create({
  data: {
    name: 'rating',
    color: '#E74C3C',
  },
});

// レーティングタグの作成
const ratingTags = [
  { name: 'rating:general', displayName: 'rating:general', language: 'en' },
  { name: 'rating:g', displayName: 'rating:g', language: 'en' },
  { name: 'rating:sensitive', displayName: 'rating:sensitive', language: 'en' },
  { name: 'rating:s', displayName: 'rating:s', language: 'en' },
  { name: 'rating:questionable', displayName: 'rating:questionable', language: 'en' },
  { name: 'rating:q', displayName: 'rating:q', language: 'en' },
  { name: 'rating:explicit', displayName: 'rating:explicit', language: 'en' },
  { name: 'rating:e', displayName: 'rating:e', language: 'en' },
];

for (const tag of ratingTags) {
  await prisma.tag.create({
    data: {
      ...tag,
      tagCategoryId: ratingCategory.id,
    },
  });
}
```

#### タグ含意関係の設定

```typescript
// rating:g, rating:s, rating:q のエイリアス設定
// 例: rating:g -> rating:general へのエイリアス
const generalTag = await prisma.tag.findUnique({
  where: { name: 'rating:general' },
});

await prisma.tag.update({
  where: { name: 'rating:g' },
  data: {
    isAlias: true,
    canonicalId: generalTag.id,
  },
});
```

### 3. フロントエンド実装

#### ガイドライン表示ページ

**ルート**: `/guidelines` または `/help/tagging`

**コンポーネント構造**:
```
src/app/guidelines/
├── page.tsx                    # メインページ
├── layout.tsx                  # レイアウト
└── components/
    ├── GuidelineNav.tsx        # ナビゲーション
    ├── RatingGuide.tsx         # レーティングガイド表示
    ├── TagCategoryList.tsx     # カテゴリ一覧
    └── RatingFlowchart.tsx     # フローチャートUI
```

#### レーティング判定フローチャートUI

**実装要件**:
- インタラクティブなステップバイステップUI
- 各質問に対する「はい」「いいえ」ボタン
- 進捗インジケーター
- 戻るボタン機能
- 最終結果の明確な表示
- レスポンシブデザイン

**技術スタック候補**:
- React State Management (useState/useReducer)
- Framer Motion (アニメーション)
- Tailwind CSS (スタイリング)

**コンポーネント例**:
```tsx
// src/components/RatingFlowchart/RatingFlowchart.tsx
interface Question {
  id: string;
  question: string;
  yesNext: string | Rating; // 次の質問ID or 最終レーティング
  noNext: string | Rating;
}

type Rating = 'general' | 'sensitive' | 'questionable' | 'explicit';

export function RatingFlowchart() {
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('q1');
  const [history, setHistory] = useState<string[]>([]);
  const [result, setResult] = useState<Rating | null>(null);

  // フローチャートロジックの実装
  // ...
}
```

### 4. バックエンドAPI実装

#### レーティング検証API

**エンドポイント**: `POST /api/products/[productId]/validate-rating`

**機能**:
- 商品にレーティングタグが付与されているか検証
- 複数のレーティングタグがある場合は警告
- レーティングタグがない場合はエラー

#### セーフサーチフィルタリング

**修正対象**: `src/app/api/products/route.ts` または検索API

**実装内容**:
- ユーザーの `isSafeSearchEnabled` 設定を確認
- セーフサーチが有効な場合、`rating:explicit` および `rating:questionable` を除外
- クエリパラメータでの一時的な切り替えをサポート

```typescript
// 例: セーフサーチフィルタ
if (user?.isSafeSearchEnabled || query.safeSearch === 'true') {
  whereClause.productTags = {
    none: {
      tag: {
        name: {
          in: ['rating:explicit', 'rating:questionable', 'rating:e', 'rating:q'],
        },
      },
    },
  };
}
```

## プロジェクト状態

### ファイル構造

```
docs/tagging-guidelines/
├── index.md                    # ✓ 完成
├── rating-guidelines.md        # ✓ 完成
├── rating-flowchart.md         # ✓ 完成
├── tag-categories.md           # ⚠ 60% (中断)
├── implementation-plan.md      # ✗ 未作成
└── HANDOFF.md                  # 本ドキュメント
```

### データベーススキーマ

**現在の状態**:
- Tag, TagCategory モデル: 実装済み
- レーティングカテゴリ: 未作成
- レーティングタグ: 未作成

**必要な作業**:
1. TagCategory に 'rating' カテゴリを追加
2. 8つのレーティングタグを作成
3. エイリアス関係の設定 (g->general, s->sensitive, etc.)

## 次のステップ

### 即座に実施すべきタスク

1. **`tag-categories.md` の完成** (30分)
   - 各カテゴリの詳細説明
   - タグ例の追加
   - 使用例の記載

2. **`implementation-plan.md` の作成** (1時間)
   - 実装フェーズの詳細化
   - 技術的な実装詳細
   - マイグレーション手順

### 短期タスク (1-2日)

3. **データベースマイグレーション** (2時間)
   - レーティングカテゴリの追加
   - レーティングタグの作成
   - シードデータの投入

4. **ガイドライン表示ページの実装** (4時間)
   - ルーティング設定
   - Markdown表示コンポーネント
   - ナビゲーション

### 中期タスク (1週間)

5. **レーティングフローチャートUIの実装** (8時間)
   - インタラクティブコンポーネント
   - 状態管理
   - アニメーション

6. **セーフサーチ機能の実装** (4時間)
   - バックエンドフィルタリング
   - ユーザー設定UI
   - 検索結果への反映

## 技術的な注意事項

### Prismaスキーマの考慮点

- TagCategoryはすでに実装済み
- Tag.tagCategoryIdはOptionalなので、既存タグへの影響なし
- 新しいカテゴリとタグはマイグレーションまたはシードで追加

### フロントエンドの考慮点

- Next.js App Router使用中
- サーバーコンポーネントとクライアントコンポーネントの使い分け
- Markdownレンダリングには `react-markdown` または類似ライブラリを使用

### セキュリティ考慮点

- レーティングタグの改ざん防止
- セーフサーチ設定の適切な保存
- 未成年ユーザーへの保護措置

## リファレンス

### 参考サイト

- Danbooru Rating Guide: https://danbooru.donmai.us/wiki_pages/howto:rate
- Danbooru Tagging Guide: https://danbooru.donmai.us/wiki_pages/howto:tag

### プロジェクト内ドキュメント

- `prisma/schema.prisma`: データベーススキーマ
- `.roo/rules/Project_description.md`: プロジェクト概要
- `README.md`: プロジェクトREADME

### 既存実装参考

- タグ関連API: `src/app/api/admin/tags/route.ts`
- タグカテゴリAPI: `src/app/api/admin/tag-types/route.ts`
- TagFormコンポーネント: `src/components/admin/TagForm.tsx`

## 問い合わせ

不明点や追加情報が必要な場合は、以下を確認してください:

1. 作成済みのドキュメント (`docs/tagging-guidelines/`)
2. Prismaスキーマ (`prisma/schema.prisma`)
3. プロジェクト基本設計 (`.roo/rules/Project_description.md`)

---

**作成日**: 2026-01-07
**最終更新**: 2026-01-07
**ステータス**: 60%完了 - ドキュメント作成フェーズ中断、実装フェーズ未着手
