# アバター自動タグ付け機能 実装計画

## 概要

BOOTHの商品説明に含まれるアバター商品ID（例：5058077）を検知し、対応するアバター名（例：「マヌカ」）のタグをユーザーに提案する機能を実装します。
また、定義の管理と過去商品への適用を行うための管理者機能を実装します。

## 決定事項

| 項目 | 決定内容 | 理由・詳細 |
|------|--------|--------|
| **判定ロジック** | 単純なID包含チェック | 商品説明文にID（例: `5058077`）が含まれていれば対象とする。 |
| **UI/UX** | **候補提案方式** | 入力欄付近に「検出されたアバタータグ」を表示し、クリックで追加する形式。勝手に追加されるのを防ぐ。 |
| **検知場所** | **クライアントサイド** | 定義リストをクライアントにロードし、リアルタイムでdescriptionを解析する。レスポンス重視。 |
| **タグ形式** | `${AvatarName}` | 統一されたフォーマットを採用 (接尾辞「対応」などはつけず、アバター名そのものを使用)。 |
| **既存データ** | 管理者再スキャン機能 | 既存商品への適用は、管理画面から任意のアバターに対して手動で「再スキャン」を実行することで対応する。 |
| **キャッシュ** | インメモリ/Next.js Cache | アバター定義は頻繁に変更されないためキャッシュを活用する。 |

## 詳細仕様

### 1. データベース (Prisma Schema)

`prisma/schema.prisma` に新しいモデルを追加します（既存コードで実装済み）。

```prisma
model AvatarItem {
  id          String   @id @default(cuid())
  itemUrl     String?  // 管理用メモ
  itemId      String   @unique // BOOTH商品ID (例: "5058077")
  avatarName  String   // アバター名 (例: "マヌカ")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 2. バックエンドロジック

#### 2.1 データアクセス (`src/app/actions/avatar-items.ts`)

既存のServer Actionに加え、クライアントサイド検知用に軽量なデータ取得関数を追加します。

- `getAvatarDefinitionsMap()`:
  - `itemId` -> `avatarName` のマップオブジェクトを返す。
  - `unstable_cache` でキャッシュし、DB負荷を低減。
  - フロントエンドの `useAvatarDetection` フックから呼び出される。

### 3. フロントエンドロジック

#### 3.1 検知フック (`src/hooks/useAvatarDetection.ts`)

- **役割**: 商品説明文を監視し、含まれるアバターIDに対応するタグ名を提案する。
- **入力**: `description` (string), `currentTags` (string[])
- **処理**:
  1. 初回マウント時に `getAvatarDefinitionsMap` を呼び出して定義辞書をメモリに保持。
  2. `description` が変更されるたびに、辞書のキー(`itemId`)が含まれているか検索。
  3. ヒットした `avatarName` のうち、`currentTags` にまだ含まれていないものを `suggestedTags` として返す。

### 4. UI実装

#### 4.1 商品登録・編集フォーム (`src/app/register-item/components/ProductDetailsForm.tsx`)

- `useAvatarDetection` フックを使用。
- `TagInput` コンポーネントの上部または下部に、提案タグ表示エリアを追加。
- **表示内容**: 「以下のタグが検出されました: [マヌカ(+)]」
- **アクション**: タグをクリックすると `manualTags` に追加され、提案リストからは消える。

#### 4.2 管理者画面 (`src/components/admin/AvatarItemManager.tsx`)

- 既存実装済み。
- アバター定義のCRUDと、サーバーサイドでの一括再スキャン機能を提供する。

## 実装ステップ

1. **バックエンド整備**:
   - `src/app/actions/avatar-items.ts` に `getAvatarDefinitionsMap` を追加。
2. **フック実装**:
   - `src/hooks/useAvatarDetection.ts` を作成。
3. **UI統合**:
   - `src/app/register-item/components/ProductDetailsForm.tsx` に提案UIを追加。
4. **検証**:
   - 商品説明文にIDを入力し、即座にタグ候補が表示されるか確認。
   - タグ追加・削除の動作確認。

