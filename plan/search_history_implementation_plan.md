# 検索履歴機能 実装計画

## 1. 概要
Sankaku Complexを参考に、ユーザーが最近検索した条件（タグ、キーワード等）を再利用できる検索履歴機能を実装します。
ログインユーザーはデータベースに保存してデバイス間同期を行い、未ログインユーザーはブラウザのローカルストレージを使用します。

## 2. データベース設計 (Prisma)

`prisma/schema.prisma` に `SearchHistory` モデルを追加します。

```prisma
model SearchHistory {
  id        String   @id @default(cuid())
  userId    String
  query     Json     // 検索条件 (SearchParamsの内容) をJSONとして保存
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
}
```

※ `User` モデルにも `searchHistories SearchHistory[]` のリレーションを追加します。

## 3. バックエンド実装

### Server Actions
`src/app/actions/searchHistory.ts` (仮)

1.  **saveSearchHistory(params: SearchParams)**
    *   ログインユーザーのみ実行
    *   **重複チェック**: 同じクエリ (`query` カラムの内容が一致) が存在する場合
        *   既存のレコードの `createdAt` を現在日時に更新 (`updatedAt` があればそちらを使用、なければ `createdAt` を更新)
        *   新規作成はしない
    *   **件数制限**: 保存後、ユーザーの履歴総数が **50件** を超えている場合
        *   `createdAt` が最も古いレコードを削除して50件に保つ
2.  **getSearchHistory()**
    *   ログインユーザーの履歴を `createdAt` の降順で取得
3.  **deleteSearchHistory(id: string)**
    *   指定された履歴を削除
4.  **clearSearchHistory()**
    *   全削除
5.  **syncLocalHistory(localHistories: SearchParams[])**
    *   ログイン直後などに呼ばれる
    *   ローカルストレージの履歴を受け取り、DBに保存（既存ロジックと同様に重複チェック・件数制限を適用）

## 4. フロントエンド実装

### カスタムフック `useSearchHistory`
`src/hooks/useSearchHistory.ts`

*   **状態管理**: 履歴リスト、ローディング状態
*   **ロジック**:
    *   初期化時にログイン状態を確認
    *   **ログイン時**:
        *   APIから履歴を取得
        *   ローカルストレージに未同期の履歴があれば `syncLocalHistory` を呼び出して統合し、ローカルストレージをクリア（または同期済みフラグ管理）
    *   **未ログイン時**: LocalStorage (`search_history`) から取得
    *   `addHistory(params)`:
        *   **共通**: 重複があれば先頭に移動（日時更新）、上限50件で古いものを削除
        *   ログイン時: APIをコール
        *   未ログイン時: LocalStorageを更新
    *   `removeHistory(id/index)`:
        *   ログイン時: APIをコール
        *   未ログイン時: LocalStorageを更新

### UIコンポーネント

既存の検索バーコンポーネント（要特定）を改修します。

*   **ドロップダウン表示**:
    *   input要素へのフォーカス(`onFocus`)で履歴リストを表示
    *   履歴項目をクリックすると、その条件で検索を実行（`params` を復元して遷移）
    *   各行に削除ボタン(×)を配置
*   **表示内容**:
    *   クエリパラメータを人間が読める形式に整形して表示
    *   例: "タグ: original, girl / 除外: r-18"

## 5. タスクリスト

- [ ] `prisma/schema.prisma` の更新とマイグレーション
- [ ] Server Actions (`src/app/actions/searchHistory.ts`) の実装
- [ ] `useSearchHistory` フックの実装
- [ ] 検索バーコンポーネントの特定と改修
- [ ] 動作確認

