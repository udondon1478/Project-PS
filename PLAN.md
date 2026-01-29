# Plan: BOOTH公式タグ検索対象切り替え機能の実装

ユーザーの要望により、検索時にBOOTH公式タグを検索対象に含めるかどうかを切り替える機能を追加します。
デフォルトではBOOTH公式タグを含みますが、スイッチをONにすることで「PolySeekタグのみ」で検索できるようになります。

## 仕様

- **機能**: 検索対象をPolySeek独自タグのみに限定するフィルタリング機能
- **UI**: 検索バーの近くに「PolySeekタグのみで検索する」というチェックボックス/スイッチを配置
- **デフォルト動作**: チェックなし（OFF） = 全てのタグ（BOOTH公式タグ含む）を検索対象とする
- **URLパラメータ**: `polySeekTagsOnly=true` の場合のみフィルタリング有効

## 実装ステップ

1.  **バックエンドロジックの修正 (`src/lib/searchProducts.ts`)**
    - `SearchParams` インターフェースに `searchPolySeekTagsOnly` (boolean) を追加
    - `searchProducts` 関数内で、`searchPolySeekTagsOnly` が `true` の場合、タグ検索条件に `isOfficial: false` を追加
    - `ProductTag` モデルの `isOfficial` フィールドを利用してフィルタリングを行う

2.  **フックの修正 (`src/hooks/useProductSearch.ts`)**
    - `isSearchPolySeekTagsOnly` ステートを追加
    - URLクエリパラメータ `polySeekTagsOnly` の読み込み・保存ロジックを追加
    - `buildSearchQueryParams` 関数を更新してパラメータを含めるように変更
    - UIコンポーネントに渡す返り値にステートとセッターを追加

3.  **UIコンポーネントの修正 (`src/components/search/ProductSearch.tsx`)**
    - `TagSearchBar` のコンテナ内、またはその直下にチェックボックスを配置
    - ラベル「PolySeekタグのみで検索する」を表示
    - チェックボックスの変更イベントで `useProductSearch` のセッターを呼び出す

4.  **動作確認**
    - `npm run build` でビルドエラーがないか確認
    - 実際に検索を行い、BOOTHタグが含まれる商品がフィルタリングされるか確認

## 備考

- `ProductTag` モデルには `isOfficial` フィールドが存在し、BOOTH由来のタグは `true`、PolySeek独自タグは `false` となっている。
- 既存の検索ロジックへの影響を最小限に抑えるため、オプショナルなパラメータとして追加する。
