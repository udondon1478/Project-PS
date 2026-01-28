# アバター自動タグ付け機能 実装計画

## 概要

BOOTHの商品説明に含まれるアバター商品ID（例：5058077）を検知し、対応するアバター名（例：「マヌカ」）のタグ（例：「マヌカ対応」）を自動的に付与する機能を実装します。
また、定義の管理と過去商品への適用を行うための管理者機能を実装します。

## 決定事項

| 項目 | 決定内容 | 理由・詳細 |
|------|--------|--------|
| **判定ロジック** | 単純なID包含チェック | 商品説明文にID（例: `5058077`）が含まれていれば対象とする。実装がシンプルで漏れが少ない。 |
| **タグ形式** | `${AvatarName}対応` | 統一されたフォーマットを採用。 |
| **既存データ** | 管理者再スキャン機能 | 既存商品への適用は、管理画面から任意のアバターに対して手動で「再スキャン」を実行することで対応する。 |
| **キャッシュ** | インメモリキャッシュ | アバター数が100件を超え増加傾向にあるため、`unstable_cache` を使用してDB負荷を軽減する。 |

## 詳細仕様

### 1. データベース (Prisma Schema)

`prisma/schema.prisma` に新しいモデルを追加します。

```prisma
model AvatarItem {
  id          String   @id @default(cuid())
  itemUrl     String?  // 管理用メモ（入力補助用）
  itemId      String   @unique // BOOTH商品ID (例: "5058077")
  avatarName  String   // アバター名 (例: "マヌカ")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 2. バックエンドロジック

#### 2.1 データアクセス & キャッシュ (`src/lib/avatars.ts`)
アバター定義の取得は頻繁に行われるため、キャッシュ層を設けます。

- **依存**: `import { prisma } from '@/lib/prisma';`, `import { unstable_cache } from 'next/cache';`
- `getAvatarDefinitions()`: 全定義を取得し、`itemId` をキーとしたMapまたは検索しやすい形式で返す。
  - `unstable_cache` でラップし、タグ `['avatar-definitions']` を付与。
  - 返り値の型: `Record<string, string>` (itemId -> avatarName) または `Map`
- `revalidateAvatarDefinitions()`: 定義更新時にキャッシュを無効化する。
  - `revalidateTag('avatar-definitions')` を呼び出す。

#### 2.2 自動タグ付けロジック (`src/lib/booth-scraper/product-creator.ts`)
商品作成処理 `createProductFromScraper` 内にロジックを注入します。

**変更点**:
1. 冒頭で `getAvatarDefinitions` をインポート。
2. `tagResolver` 初期化の前後でアバター定義を取得。
3. 商品説明文 (`data.description`) に対して、登録されている `itemId` が含まれているかチェック。
   ```typescript
   const avatarDefinitions = await getAvatarDefinitions();
   const detectedAvatarTags: string[] = [];
   // description内にitemIdが含まれるかチェック
   for (const [itemId, avatarName] of Object.entries(avatarDefinitions)) {
     if (data.description.includes(itemId)) {
       detectedAvatarTags.push(`${avatarName}対応`);
     }
   }
   ```
4. `tagResolver.resolveTags([...data.tags, ...detectedAvatarTags])` のように既存タグと結合して解決処理に回す。

#### 2.3 Server Actions (`src/app/actions/avatar-items.ts`)
管理者画面用のAPIです。

- **Imports**: `import { prisma } from '@/lib/prisma';`, `import { revalidateAvatarDefinitions } from '@/lib/avatars';`
- `getAvatarItems()`: `prisma.avatarItem.findMany`
- `createAvatarItem(data)`: `prisma.avatarItem.create` -> `revalidateAvatarDefinitions()`
- `updateAvatarItem(id, data)`: `prisma.avatarItem.update` -> `revalidateAvatarDefinitions()`
- `deleteAvatarItem(id)`: `prisma.avatarItem.delete` -> `revalidateAvatarDefinitions()`
- `rescanProductsForAvatar(avatarId)`:
  - 指定されたアバター定義 (`itemId`, `avatarName`) を取得。
  - `prisma.product.findMany` で `description` に `itemId` を含む商品を検索 ( `contains: itemId` )。
  - 該当商品のタグを更新:
    - 既にタグが付いているか確認。
    - 付いていなければ `TagResolver` を使ってタグIDを取得/作成し、`ProductTag` を追加 (`prisma.productTag.create`)。
    - 変更履歴 (`tagEditHistory`) も更新するのが望ましい。

### 3. 管理者画面 (Frontend)

#### 3.1 ページ追加 (`src/app/admin/avatars/page.tsx`)
- Server Component として実装。
- `isAdmin()` チェックを行う (既存の `src/app/admin/page.tsx` を参考)。
- Client Component `<AvatarItemManager />` をレンダリング。

#### 3.2 コンポーネント (`src/components/admin/AvatarItemManager.tsx`)
- **一覧表示**: テーブル形式で定義を表示。
- **追加・編集フォーム**:
  - Item URL/ID, Avatar Name の入力欄。
  - URL入力時にIDを抽出するユーティリティ (正規表現 `booth.pm/.*?/items/(\d+)` 等) を実装。
- **再スキャン機能**:
  - 各行のアクションメニューに「再スキャン」を追加。
  - 実行中はローディング表示。
  - 完了後にトースト通知（「N件の商品にタグを追加しました」）。

#### 3.3 レイアウト (`src/components/admin/AdminLayout.tsx`)
- `navItems` 配列に `{ href: '/admin/avatars', label: 'アバター管理', icon: UserIcon }` を追加。

## 実装ステップ

1. **DBマイグレーション**:
   - `prisma/schema.prisma` に `AvatarItem` を追加。
   - `npx prisma db push` を実行。
2. **バックエンド基盤**:
   - `src/lib/avatars.ts` 作成。
   - `src/app/actions/avatar-items.ts` 作成。
3. **タグ付けロジック統合**:
   - `src/lib/booth-scraper/product-creator.ts` 修正。
4. **管理者UI実装**:
   - `src/components/admin/AvatarItemManager.tsx` 作成。
   - `src/app/admin/avatars/page.tsx` 作成。
   - `src/components/admin/AdminLayout.tsx` 更新。
5. **検証**:
   - 新規アバター定義の登録。
   - 商品登録シミュレーション（手動またはスクリプト）でタグが付くか確認。
   - 既存商品に対する再スキャン機能の動作確認。

