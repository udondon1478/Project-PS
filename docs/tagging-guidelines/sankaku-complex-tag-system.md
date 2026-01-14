# Sankaku Complex タグシステム リファレンス

このドキュメントは、Sankaku Complex（www.sankakucomplex.com）のタグシステムについての調査結果をまとめたものです。PolySeekのタグシステム設計の参考資料として活用してください。

## 概要

Sankaku Complexは、画像・イラストのタグ付けと検索に特化したプラットフォームです。Booruスタイルのタグシステムを採用しており、階層的なタグ関係と複数のタグカテゴリを持っています。

---

## タグカテゴリ（Tag Types）

Sankaku Complexでは、タグを以下のカテゴリに分類しています：

| ID | カテゴリ名 | 説明 |
|:---|:----------|:-----|
| 0 | **General** | 一般的なタグ（動作、状態、オブジェクトなど） |
| 1 | **Artist** | アーティスト・クリエイター名 |
| 2 | **Studio** | スタジオ・制作会社名 |
| 3 | **Copyright** | 作品名・フランチャイズ名（著作権） |
| 4 | **Character** | キャラクター名 |
| 5 | **Genre** | ジャンル分類 |
| 8 | **Medium** | メディア・媒体の種類 |
| 9 | **Meta** | メタ情報（技術的な属性など） |

> **注記**: ID 6, 7 は現在未使用または予約済みです。

---

## タグページの構造

### 共通属性

すべてのタグページには以下の情報が含まれます：

#### 基本情報
- **タグ名**: システム内での識別名（例: `zelda_(breath_of_the_wild)`）
- **表示名**: 多言語対応の表示名
  - English: 英語表記
  - 日本語: 日本語表記
- **タイプ**: タグのカテゴリ（Character, Franchise, Artist など）
- **年齢制限 (Age Rating)**:
  - `G` - 全年齢
  - `R15+` - 15歳以上推奨
  - その他のレーティング

#### 統計情報
- **タグ付き投稿数**: このタグが付与された投稿の総数
- **タグ付きブック数**: このタグが付与されたブック（アルバム）の数
- **タグ付きコンパニオン数**: このタグに関連するAIコンパニオンの数

### タグ間の関係

Sankaku Complexでは、タグ間に以下の関係を定義できます：

#### 1. 関連タグ（Related Tags）
- 意味的に関連するタグのリスト
- 自動的に計算される場合と手動で設定される場合がある
- 例: `zelda_(breath_of_the_wild)` → `link`, `princess_zelda`, `hylian`

#### 2. 親タグ（Parent Tags）
- より広いカテゴリや上位概念を表すタグ
- 階層構造を形成する
- 例: `zelda_(breath_of_the_wild)` の親タグ:
  - `the_legend_of_zelda`（フランチャイズ）
  - `breath_of_the_wild`（作品）
  - `zelda`（キャラクター全般）

#### 3. 子タグ（Child Tags）
- より具体的な下位概念を表すタグ
- 親タグの逆関係
- 例: `the_legend_of_zelda` の子タグには各作品タイトルやキャラクターが含まれる

#### 4. 別名（Aliases）
- 同じ概念を指す異なる表記
- 検索時に自動的にメインタグに変換される
- 例: `zelda_(botw)` → `zelda_(breath_of_the_wild)`

#### 5. 暗示タグ（Implications）
- あるタグが付与されると自動的に付与されるタグ
- Predicate（条件） → Consequent（結果）の関係
- 例: `zelda_(breath_of_the_wild)` → `princess_zelda`（暗示）

---

## タグタイプ別のページ構造

### Character（キャラクター）タグ

キャラクタータグのページには以下の要素が含まれます：

```
- タグ名
- 表示名（多言語）
- タイプ: Character
- 年齢制限
- タグ付き投稿数
- 関連タグ
- 親タグ（所属作品、声優など）
- 別名
- 暗示タグ
- Wiki説明（キャラクターの特徴、識別要素など）
```

#### Wiki説明の例（Zelda - Breath of the Wild）
```
Appears in breath of the wild. Differs from her counterparts for not
wearing a tiara, having her hair mostly loose, using only hairpins,
not using a dress (for the most part of the game).

Distinguish factors:
- Blonde hair
- Hairpin
- Thick eyebrows
- Tight pants
```

### Copyright/Franchise（著作権/フランチャイズ）タグ

フランチャイズタグのページには以下の追加要素が含まれます：

```
- タグ付きブック（関連する同人誌・アルバム）
- タグ付きコンパニオン（AIコンパニオン）
- 子タグ（シリーズ内の各作品、キャラクター）
- 詳細なWiki説明
  - 作品概要
  - キャラクター一覧（ゲーム/作品別）
  - 種族一覧
  - ゲームリスト
  - 関連メディア
  - 外部リンク
```

### Artist（アーティスト）タグ

アーティストタグは他のタグと大きく異なる構造を持ちます：

```
- 作成者名（Creator name）
- 年齢制限
- フォロワー数
- 外部リンク
  - Patreon
  - Gumroad
  - Cubebrush
  - DeviantArt
  - Pixiv
  - Twitter
  - Tumblr
  - YouTube
  - その他
- 投稿タブ（人気の投稿、全投稿）
- ブックタブ（関連ブック）
- 購読/フォローボタン
```

---

## タグの命名規則

### 基本ルール
1. **小文字使用**: すべて小文字で記述（例: `princess_zelda`）
2. **アンダースコア**: 単語間はアンダースコアで区切る（例: `long_hair`）
3. **括弧による区別**: 同名キャラクターは作品名で区別（例: `zelda_(breath_of_the_wild)`）
4. **コロンの使用**: シリーズ内の作品名にはコロンを使用（例: `the_legend_of_zelda:_breath_of_the_wild`）

### キャラクタータグの形式
```
character_name_(source_work)
```
例:
- `zelda_(breath_of_the_wild)`
- `link_(twilight_princess)`
- `zelda_(ocarina_of_time)`

### 作品タグの形式
```
series_name:_subtitle
```
例:
- `the_legend_of_zelda:_breath_of_the_wild`
- `the_legend_of_zelda:_tears_of_the_kingdom`

---

## API情報

### エンドポイント
- 新API: `https://sankakuapi.com/v2/`
- 旧API: `https://capi-v2.sankakucomplex.com/`

### タグ検索
```
GET /tags?name={tag_name}
```

> **注記**: APIアクセスには認証が必要な場合があります。

---

## PolySeekへの適用提案

Sankaku Complexのタグシステムを参考に、PolySeekでは以下の機能を検討できます：

### 1. タグ関係の実装
- **親子関係**: 階層的なタグ構造（例: VRChat > アバター > 特定キャラクター）
- **別名システム**: 同義語の自動変換
- **暗示システム**: 関連タグの自動付与

### 2. タグカテゴリの拡張
現在のPolySeekカテゴリに以下を追加検討：
- **Creator（クリエイター）**: 制作者情報
- **Copyright（著作権）**: 原作・フランチャイズ情報

### 3. 多言語対応
- 各タグに複数言語の表示名を設定
- 検索時のローカライズ対応

### 4. Wiki機能
- タグごとの詳細説明ページ
- 識別要素の記載
- 関連リンクの管理

---

## 参考リンク

- [Sankaku Complex](https://www.sankakucomplex.com/)
- [gallery-dl Sankaku Extractor](https://github.com/mikf/gallery-dl) - タグカテゴリIDの参考元
- [imgbrd-grabber](https://github.com/Bionus/imgbrd-grabber) - Booruスタイルのタグ処理の参考

---

## 更新履歴

| 日付 | 内容 |
|:-----|:-----|
| 2025-01-14 | 初版作成 |
