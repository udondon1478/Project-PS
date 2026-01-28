# カラム数変更機能の実装計画

ユーザーが商品一覧のカラム数を自由に設定できる機能を実装します。

## 決定事項
- **保存方法**: LocalStorage (キー: `product-grid-columns`)
- **UI配置**: 商品グリッドの直上
- **モバイル対応**: 設定はPCサイズ（lgブレークポイント以上）のみに適用し、モバイルでは既存のレスポンシブ挙動を維持
- **設定値**: 初期値 5、範囲 2〜6

## 実装ステップ

### 1. カスタムフックの作成 (`src/hooks/useColumnSettings.ts`)
LocalStorageを使用してカラム数を管理するフックを作成します。
- 状態管理: `columns` (number)
- 初期化時にLocalStorageから読み込み、ない場合はデフォルト値(5)を使用
- 値の変更時にLocalStorageへ保存
- SSR時のハイドレーション不一致を防ぐため、マウント後に値を適用するロジックを含める（初期値はサーバーサイドと合わせるか、ロード完了までプレースホルダーを表示）

### 2. UIコンポーネントの作成 (`src/components/ColumnSelector.tsx`)
カラム数を変更するためのUIコンポーネントを作成します。
- `src/components/ui/slider.tsx` を使用
- ラベル（例: "表示列数: 5"）とスライダーを配置
- モバイルデバイスでは非表示 (`hidden lg:flex`)

### 3. ProductGridの改修 (`src/components/ProductGrid.tsx`)
カラム数を受け取れるように改修し、動的にクラスを適用します。
- Propsに `columns` (optional) を追加
- Tailwind CSSのクラスを動的に切り替えるためのマッピングを定義
  - PC表示時 (`lg:` プレフィックス) のみ指定されたカラム数を適用
  - `lg:grid-cols-2` 〜 `lg:grid-cols-6`
  - モバイル〜タブレットは既存の `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` を維持

### 4. ページへの組み込み
以下のコンポーネントでフックを使用し、SelectorとGridを配置します。
- `src/app/HomeClient.tsx` (トップページ)
- `src/components/search/SearchResults.tsx` (検索結果ページ)

## 確認事項
- [ ] LocalStorageへの保存と読み出しが正しく行われるか
- [ ] ページリロード後も設定が維持されるか
- [ ] モバイル画面では設定UIが非表示になり、標準のレスポンシブ挙動となるか
- [ ] 検索結果ページとトップページの両方で設定が共有されるか
