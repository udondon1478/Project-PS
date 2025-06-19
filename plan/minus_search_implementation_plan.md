# マイナス検索機能 実装計画

## 概要
商品検索機能において、特定のタグを除外するマイナス検索機能を追加する。ユーザーはタグの前にプレフィックスを付けることでマイナス検索を指定できるようにする。将来的にはユーザー設定で入力方法を切り替えられるように拡張する可能性も考慮する。

## UI/UX設計 (プレフィックス方式)
- 検索入力フィールドにタグを入力する際に、タグ名の前に特定の記号（例: `-`）を付けることで、そのタグをマイナス検索として扱う。
- 例: `VRChat -アバター` -> "VRChat"タグを含むが、"アバター"タグを含まない商品を検索
- 入力されたタグがプレフィックス付きであれば、マイナス検索タグとして内部的に処理する。
- 表示時には、マイナス検索タグであることがユーザーに分かりやすいように、タグの見た目を変える（例: 赤色にする、取り消し線を付ける）。

## 実装ステップ

### 1. フロントエンド (`src/components/search/ProductSearch.tsx`) の改修
- マイナス検索用のタグを管理する新しいステート (`selectedNegativeTags` など) を追加する。
- `handleInputChange` および `handleKeyDown` 関数内で、入力されたタグにプレフィックス（`-`）が付いているか判定するロジックを追加する。
- プレフィックスが付いている場合は、`selectedNegativeTags` ステートに追加し、そうでない場合は `selectedTags` ステートに追加する。
- `selectedTags` と `selectedNegativeTags` を区別して表示するUIを実装する。マイナス検索タグは視覚的に区別できるようにスタイルを適用する。
- `handleSearch` 関数内で、`selectedTags` と `selectedNegativeTags` の両方をクエリパラメータとしてバックエンドに渡すように修正する。例えば、`tags=VRChat&negativeTags=アバター` のようにパラメータを分けることを検討する。

### 2. バックエンド (`src/app/api/products/route.ts`) の改修
- GETリクエストハンドラが、新しいクエリパラメータ（例: `negativeTags`）を受け取れるように修正する。
- 受け取ったマイナス検索タグ（`negativeTagNames`）を元に、Prismaクエリに除外条件を追加する。
- 「Aタグを有しつつ、Bタグは有していない」という検索条件を実現するため、Prismaの `where` 条件で `AND` と `none` を組み合わせる。
    ```typescript
    where: {
      AND: [
        // 通常タグのAND検索 (既存ロジック)
        ...selectedTags.map(tagName => ({
          productTags: {
            some: {
              tag: {
                name: tagName
              }
            }
          }
        })),
        // マイナス検索タグのnone検索 (新規追加)
        ...selectedNegativeTags.map(negativeTagName => ({
          productTags: {
            none: {
              tag: {
                name: negativeTagName
              }
            }
          }
        }))
      ]
    }
    ```
- 検索条件が何も指定されていない場合の挙動（現在は空の結果を返す）についても、マイナス検索タグのみが指定された場合の挙動を考慮して必要に応じて調整する。

### 3. ユーザー設定機能との連携 (現時点では不要な将来的な拡張)
- ユーザー設定モデルにマイナス検索の入力方法を保存するフィールドを追加する。
- フロントエンドでユーザー設定を読み込み、選択された入力方法に応じてUIとタグの処理ロジックを切り替える。

## 技術スタック
- フロントエンド: Next.js (AppRouter), TypeScript, React, shadcn/ui
- バックエンド: Node.js, TypeScript, Next.js API Routes
- データベース: PostgreSQL
- ORM: Prisma

## 懸念事項・考慮事項
- プレフィックスに使用する記号の決定（`-` が一般的か）。
- サジェスト機能がマイナス検索タグにも対応する必要があるか、または通常タグのみをサジェストするか。
- ユーザー設定での切り替え機能の優先度。

## 今後のステップ
1. 上記計画に基づき、新しいブランチを作成する。
2. フロントエンド (`ProductSearch.tsx`) でプレフィックス方式のUIとタグ管理ロジックを実装する。
3. バックエンド (`src/app/api/products/route.ts`) でマイナス検索タグを受け取り、Prismaクエリに `none` 条件を追加する。
4. 実装した機能をテストする。
5. コードレビューとマージ。
6. (オプション) ユーザー設定での入力方法切り替え機能の実装を検討する。

## Mermaid Diagram (バックエンド検索ロジックの概念図)

```mermaid
graph TD
    A[API Request /api/products] --> B{Parse Query Params};
    B --> C{Extract tags and negativeTags};
    C --> D{Build Prisma where conditions};
    D --> E{AND condition for selectedTags};
    D --> F{NONE condition for selectedNegativeTags};
    E --> G{Combine conditions with AND};
    F --> G;
    G --> H{Execute prisma.product.findMany};
    H --> I{Format Results};
    I --> J[Return JSON Response];