# ソーシャルリンク（Discord, X）の追加計画

## 概要

ユーザーの流入を促すため、サイトのヘッダーとフッターにX（旧Twitter）とDiscordへのリンクを追加します。

## 詳細仕様

### 1. 定数定義

- `src/lib/constants.ts` に以下のURL定数を追加します。
  - `DISCORD_INVITE_URL`: `https://discord.gg/placeholder`
  - `X_ACCOUNT_URL`: `https://x.com/PolySeek_dev`

### 2. アイコンコンポーネントの作成

- 再利用性を高めるため、`src/components/SocialIcons.tsx` を作成し、XとDiscordのSVGアイコンコンポーネントを定義します。
- **実装方針**: インラインSVGを使用（ユーザー選択）
- Tailwind CSSクラスを受け取れるように設計します。

### 3. ヘッダーへの追加 (`src/components/Header.tsx`)

- **デスクトップ表示**:
  - ナビゲーションバー（`nav`タグ内）の左側、または右側のボタングループの近くにアイコンを追加します。
  - 視認性を確保しつつ、操作の邪魔にならないように配置します。
- **モバイル表示（ハンバーガーメニュー）**:
  - `Sheet` 内のメニュー下部、または上部にソーシャルリンクの行を追加します。

### 4. フッターへの追加 (`src/components/Footer.tsx`)

- 既存のリンク（About, FAQ, Terms, etc.）の並び、またはその近くにアイコンリンクとして追加します。
- スマホ表示でも押しやすいサイズと間隔を確保します。

## 実装ステップ

1. **定数の追加**: `src/lib/constants.ts` を編集。
2. **アイコンコンポーネント作成**: `src/components/SocialIcons.tsx` を作成。
3. **ヘッダー修正**: `src/components/Header.tsx` にリンクを追加。
4. **フッター修正**: `src/components/Footer.tsx` にリンクを追加。
5. **動作確認**: リンクが正しく機能し、レスポンシブ表示が崩れていないか確認。

## 検証方法

- `npm run dev` でローカルサーバーを起動。
- ヘッダー（PC/SP）とフッターにアイコンが表示されていることを確認。
- アイコンをクリックして、正しいURL（Discordはプレースホルダー、Xは公式アカウント）に遷移することを確認。
