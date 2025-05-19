# TagForm 改修計画

## 概要
`src/components/admin/TagForm.tsx` において、新規タグ作成時のタイプとカテゴリの選択/新規作成機能、およびエイリアス作成時の正規タグ候補表示機能を追加する。

## 要望詳細
1.  **タイプとカテゴリの選択/新規作成機能:**
    *   既存のタイプとカテゴリをドロップダウンから選択できるようにする。
    *   ドロップダウンにない場合は、新規でタイプまたはカテゴリを入力できるようにする。
    *   UIは、ドロップダウンの下に「新規タイプ/カテゴリを入力」チェックボックスを設け、チェックが入ったら入力フィールドを表示する形式とする。
2.  **エイリアス作成時の正規タグ候補表示機能:**
    *   エイリアス作成時、正規タグIDの入力フィールドを、入力に応じてタグ候補を表示する機能に置き換える。
    *   候補にはタグ名を表示し、選択されたらタグ名を `formData.canonicalId` に設定する。
    *   API側で、送信されたタグ名からタグIDを検索して保存する処理を追加する。

## 計画ステップ

1.  **既存のタイプとカテゴリの取得:**
    *   コンポーネントマウント時に `/api/admin/tag-types` からタグタイプリストを取得し、`tagTypes` stateにセット。
    *   コンポーネントマウント時に `/api/tags/by-type?type=product_category` からカテゴリリストを取得し、`tagCategories` stateにセット。
2.  **タイプとカテゴリの入力UI変更:**
    *   `isNewType`, `isNewCategory` stateを追加し、新規入力モードを管理。初期値は新規作成時は `true`、編集時は `false`。
    *   タイプとカテゴリの入力部分を、`isNewType`/`isNewCategory` に応じて shadcn/ui の `Select` コンポーネントまたは `Input` コンポーネントを表示するように条件分岐。
    *   `Select` にはフェッチしたリストを表示。カテゴリの場合はタグ名をvalue、タグIDをkeyとして使用。
    *   `Select` の下に新規入力モード切り替え用の `Checkbox` を追加。
    *   `Checkbox` の `checked` プロパティを `isNewType` または `isNewCategory` のstateにバインド。
    *   `Checkbox` の `onCheckedChange` ハンドラで、対応するstateを更新。チェックが入ったら `formData` の該当フィールドを空文字列にリセット。
    *   `isNewType` または `isNewCategory` が `true` の場合に表示される `Input` を追加。
    *   `Input` の `value` プロパティを `formData` の該当フィールドにバインド。
    *   `Input` の `onChange` ハンドラで、入力された値を `formData` の該当フィールドにセット。
    *   `initialData` が存在し、かつ新規入力モードでない場合、`formData.type` または `formData.category` の初期値がフェッチしたリストに含まれているか確認し、含まれていない場合は新規入力モードに切り替えるなどの考慮を実装時に行う。
3.  **エイリアス正規タグ候補表示機能の実装:**
    *   `canonicalTagSuggestions`: { id: string; name: string }[], `showCanonicalTagSuggestions`: boolean stateを追加。
    *   エイリアス選択時 (`formData.isAlias` が `true`) に表示される正規タグID入力フィールドを修正。
    *   入力フィールドに、入力に応じた `/api/tags/search?query=<入力値>` 呼び出しロジックを追加。取得した候補はタグ名とIDのペアとして保持。
    *   取得した候補を `canonicalTagSuggestions` stateにセット。
    *   入力フィールドの下に、`canonicalTagSuggestions` が存在し、かつ `showCanonicalTagSuggestions` が `true` の場合に候補リストを表示するUIを追加。候補リストにはタグ名を表示。
    *   候補リストの項目をクリックしたら、選択されたタグの**名前**を `formData.canonicalId` にセットし、候補リストを非表示にする処理を追加。
    *   入力フィールドからフォーカスが外れたときなどに候補リストを非表示にするロジックを追加。
    *   **API側の修正:** [`src/app/api/admin/tags/route.ts`](src/app/api/admin/tags/route.ts) のPOSTおよびPUTハンドラにおいて、`formData.canonicalId` がタグ名として送信されてくることを想定し、そのタグ名に対応するタグIDをデータベースから検索して取得し、`canonicalId` として保存する処理を追加。タグ名に対応するタグが見つからない場合のエラーハンドリングも考慮。
4.  **フォームデータの更新:**
    *   タイプ、カテゴリ、正規タグIDの入力方法変更に合わせた `formData` 更新ロジックの調整。
5.  **APIへの送信データの調整:**
    *   API側でタイプ、カテゴリ、`canonicalId` (タグ名) を適切に処理するための調整。

## Mermaid ダイアグラム

```mermaid
graph TD
    A[ユーザーの要望] --> B{タイプ/カテゴリ選択};
    A --> C{エイリアス正規タグ候補};

    B --> B1[既存リスト取得];
    B1 --> B2[UI変更: Select + Input + Checkbox];
    B2 --> B3[フォームデータ更新];

    C --> C1[タグ候補API呼び出し];
    C1 --> C2[UI変更: 候補表示付きInput];
    C2 --> C3[フォームデータ更新];

    B3 --> D[API送信データ調整];
    C3 --> D;
    D --> E[API処理];
    E --> F[完了];