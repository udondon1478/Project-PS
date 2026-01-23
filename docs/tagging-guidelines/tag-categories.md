# タグカテゴリ一覧

PolySeekでは、タグを以下の10カテゴリに分類して管理しています。VRChat向け3Dアセットに最適化されており、実際の使用タグ分析に基づいて設計されています。各カテゴリには固有の色が割り当てられており、検索結果や商品詳細ページで視覚的に区別できます。

## カテゴリ詳細

### 1. Rating (レーティング)

- **色**: <span style="color: #E74C3C">■</span> `#E74C3C` (Red)
- **説明**: 商品の年齢制限を示します。最も重要なカテゴリです。
- **必須**: すべての商品に必ず1つ付与する必要があります。
- **タグ例**: `全年齢`, `R-15`, `R-17`, `R-18`


### 2. Avatar (アバター)

- **色**: <span style="color: #3498DB">■</span> `#3498DB` (Blue)
- **説明**: VRChatアバターやキャラクター名を表します。
- **タグ例**: `しなの`, `マヌカ`, `ミルティナ`, `ルルネ`, `ショコラ`, `キプフェル`


### 3. Body (身体)

- **色**: <span style="color: #E67E22">■</span> `#E67E22` (Orange)
- **説明**: 体型・髪型・瞳・耳・尻尾などの身体的特徴を表します。
- **タグ例**: `long_hair`, `blue_eyes`, `fox_ears`, `ケモミミ`, `ツインテール`, `髪型`


### 4. Outfit (衣装)

- **色**: <span style="color: #9B59B6">■</span> `#9B59B6` (Purple)
- **説明**: 衣服・アクセサリー・装飾品などを表します。
- **タグ例**: `school_uniform`, `maid_outfit`, `swimsuit`, `イヤリング・ピアス`, `水着`


### 5. Style (スタイル)

- **色**: <span style="color: #F39C12">■</span> `#F39C12` (Yellow)
- **説明**: アートスタイルやジャンルを表します。
- **タグ例**: `anime`, `kemono`, `realistic`, `cyberpunk`, `fantasy`


### 6. Platform (プラットフォーム)

- **色**: <span style="color: #1ABC9C">■</span> `#1ABC9C` (Turquoise)
- **説明**: 対応環境・プラットフォームを表します。購入判断に重要です。
- **タグ例**: `VRChat`, `Quest対応`, `PC専用`, `VRM`, `VRoid`


### 7. Feature (機能)

- **色**: <span style="color: #27AE60">■</span> `#27AE60` (Green)
- **説明**: VRChat機能やカスタマイズ性、対応アバターを表します。
- **タグ例**: `PhysBones`, `MA対応`, `マヌカ対応`, `着せ替え可能`, `フェイストラッキング`


### 8. Product Type (商品種別)

- **色**: <span style="color: #8E44AD">■</span> `#8E44AD` (Purple)
- **説明**: 商品の種類を表します。3Dモデル、アニメーション、テクスチャなど。
- **タグ例**: `3Dモデル`, `アニメーション`, `テクスチャ`, `小道具`, `ギミック`, `ポーズ集`


### 9. Technical (技術仕様)

- **色**: <span style="color: #95A5A6">■</span> `#95A5A6` (Gray)
- **説明**: ファイル形式・シェーダー・性能・Unityバージョンなどの技術情報を表します。
- **タグ例**: `FBX`, `lilToon`, `Poiyomi`, `Unity`, `Blender`, `UnityPackage`


### 10. General (一般)

- **色**: <span style="color: #34495E">■</span> `#34495E` (Dark Gray)
- **説明**: 上記のどのカテゴリにも当てはまらない一般的なタグです。
- **タグ例**: `かわいい`, `クール`, `ネタ`, `無料`, `おすすめ`

## カテゴリの優先順位

タグが複数の意味を持つ場合や表示順序を決める際、以下の優先順位が適用されます。

1. **Rating** (最優先)
2. **Avatar**
3. **Body**
4. **Outfit**
5. **Style**
6. **Platform**
7. **Feature**
8. **Product Type**
9. **Technical**
10. **General**

## カラーコード一覧

| カテゴリ | 色名 | HEXコード |
| :--- | :--- | :--- |
| Rating | Red | `#E74C3C` |
| Avatar | Blue | `#3498DB` |
| Body | Orange | `#E67E22` |
| Outfit | Purple | `#9B59B6` |
| Style | Yellow | `#F39C12` |
| Platform | Turquoise | `#1ABC9C` |
| Feature | Green | `#27AE60` |
| Product Type | Purple | `#8E44AD` |
| Technical | Gray | `#95A5A6` |
| General | Dark Gray | `#34495E` |

## 旧カテゴリからの移行

v2.0より前のバージョンでは8カテゴリ（Danbooru準拠）で運用していましたが、VRChat向け3Dアセットに最適化するため10カテゴリに再編しました。

| 旧カテゴリ | 新カテゴリ | 備考 |
| :--- | :--- | :--- |
| Rating | Rating | 変更なし |
| Character | Avatar | 名称変更 |
| Body | Body | 変更なし |
| Clothing | Outfit | 名称変更（アクセサリー含む） |
| Style | Style | 変更なし |
| Scene | General | シーン系は少ないためGeneralに統合 |
| Meta | Technical / Platform | 内容に応じて分割 |
| General | General | 変更なし |
| product_category | Product Type | 商品種別として独立 |
| (新規) | Platform | プラットフォーム対応を独立 |
| (新規) | Feature | VRChat機能・対応アバターを独立 |
| (新規) | Product Type | 商品種別（3Dモデル、アニメーション等）を独立 |
