# VRChatアバター向けタグ付けガイドライン

本ドキュメントは、VRChatアバターおよび3Dモデルの投稿時におけるタグ付けおよびレーティング設定に関するガイドラインです。VRChat向け3Dアセットに最適化された10カテゴリシステムを採用しています。

## 1. タグカテゴリ

検索性と管理のしやすさを向上させるため、タグは以下の10カテゴリに分類されます。外見情報を優先配置し、非技術者ユーザーが直感的に検索できるよう設計されています。

### 1.1 カテゴリ一覧

| 優先度 | カテゴリ | 説明 | 色 |
| :---: | :--- | :--- | :--- |
| 1 | **Rating** | 年齢制限 | `#E74C3C` |
| 2 | **Product Type** | 商品種別 | `#8E44AD` |
| 3 | **Avatar** | アバター・キャラクター名 | `#3498DB` |
| 4 | **Body** | 身体的特徴（髪型・瞳・耳・尻尾） | `#E67E22` |
| 5 | **Outfit** | 衣装・アクセサリー | `#9B59B6` |
| 6 | **Style** | アートスタイル・ジャンル | `#F39C12` |
| 7 | **Platform** | 対応環境（Quest対応等） | `#1ABC9C` |
| 8 | **Feature** | VRChat機能・カスタマイズ性 | `#27AE60` |
| 9 | **Technical** | 技術仕様（シェーダー・形式等） | `#95A5A6` |
| 10 | **General** | その他 | `#34495E` |

> [!NOTE]
> **正規定義との違いについて**
> 本ガイドラインでは、VRChatアバター向けの実用性を考慮し、Product Typeを優先度2に配置しています。これは、ユーザーが商品を閲覧する際に「アバター本体なのか、衣装なのか、アクセサリーなのか」を早期に判断できるようにするためです。正規の優先度定義は[tagCategories.ts](../../src/data/guidelines/tagCategories.ts)を参照してください。

### 1.2 Rating (レーティング)

商品の年齢制限を示す最重要カテゴリです。

| タグ | 説明 |
| :--- | :--- |
| `全年齢` | 誰にでも安全なコンテンツ |
| `R-15` | 15歳以上推奨 |
| `R-17` | 17歳以上推奨 |
| `R-18` | 成人向けコンテンツ |

### 1.3 Product Type (商品種別)

商品の種類を表すカテゴリです。

| タグ | 説明 |
| :--- | :--- |
| `Avatar` | アバター本体 |
| `Costume` | 衣装・着せ替え |
| `Accessory` | 小物・アクセサリー |
| `World` | ワールド・空間 |
| `Tool` | ツール・ユーティリティ |
| `Other` | その他 |

### 1.4 Avatar (アバター)

VRChatアバターやキャラクター名を表します。

| 具体例 | 説明 |
| :--- | :--- |
| `まめひなた`, `マヌカ`, `桔梗` | 人気アバター名 |
| `キプフェル`, `舞夜`, `セレスティア` | 人気アバター名 |
| `ケモノ`, `ドラゴン` | 種族 |

### 1.5 Body (身体)

身体的特徴を示すタグです。

| カテゴリ | 具体例 |
| :--- | :--- |
| 髪型 | `long_hair`, `short_hair`, `twintails`, `ponytail`, `bob_cut` |
| 髪色 | `blonde_hair`, `black_hair`, `blue_hair`, `pink_hair`, `white_hair` |
| 瞳 | `blue_eyes`, `red_eyes`, `heterochromia`, `glowing_eyes` |
| 耳 | `cat_ears`, `fox_ears`, `elf_ears`, `ケモミミ` |
| 尻尾 | `tail`, `cat_tail`, `fox_tail` |
| 体型 | `slender`, `petite`, `curvy`, `muscular` |

### 1.6 Outfit (衣装)

衣服・アクセサリー・装飾品を表します。

| カテゴリ | 具体例 |
| :--- | :--- |
| 衣装 | `school_uniform`, `maid_outfit`, `dress`, `kimono`, `hoodie` |
| 水着 | `swimsuit`, `bikini` |
| アクセサリー | `glasses`, `ribbon`, `choker`, `hat`, `wings`, `horns` |
| 靴 | `boots`, `heels`, `shoes` |

### 1.7 Style (スタイル)

アートスタイルやジャンルを表します。

| 具体例 | 説明 |
| :--- | :--- |
| `anime` | アニメ調 |
| `realistic` | リアル調 |
| `chibi` | ちびキャラ |
| `kemono`, `furry` | ケモノ・ファーリー |
| `cyberpunk`, `fantasy` | ジャンル |

### 1.8 Platform (プラットフォーム)

対応環境を示すタグです。購入判断に重要です。

| 具体例 | 説明 |
| :--- | :--- |
| `Quest対応` | Meta Quest対応 |
| `PC専用` | PC版VRChat専用 |
| `VRM` | VRM形式対応 |
| `Android対応` | Android版対応 |
| `クロスプラットフォーム` | 複数プラットフォーム対応 |

### 1.9 Feature (機能)

VRChat機能やカスタマイズ性を表します。

| カテゴリ | 具体例 |
| :--- | :--- |
| VRChat機能 | `PhysBones`, `avatar_dynamics`, `gesture_expressions` |
| トラッキング | `eye_tracking`, `face_tracking`, `full_body_tracking` |
| カスタマイズ | `着せ替え可能`, `色替え可能`, `modular`, `toggleable_parts` |
| アニメーション | `emote_support`, `dance_ready`, `idle_animations` |

### 1.10 Technical (技術仕様)

ファイル形式・シェーダー・性能などの技術情報を表します。

| カテゴリ | 具体例 |
| :--- | :--- |
| ファイル形式 | `FBX`, `unitypackage`, `blend` |
| シェーダー | `lilToon`, `Poiyomi`, `UTS2` |
| Unityバージョン | `Unity2022`, `Unity2019` |
| ポリゴン数 | `low_poly`, `medium_poly`, `high_poly` |
| テクスチャ | `2k_textures`, `4k_textures` |

## 2. タグの命名規則

タグの表記揺れを防ぎ、一貫性を保つためのルールです。

### 基本ルール

*   **区切り文字**: スペースの代わりに **アンダースコア (`_`)** を使用します。
    *   ✅ `blue_eyes`, `full_body_tracking`
    *   ❌ `blue eyes`, `full body tracking`
*   **言語**: 原則として英語表記を使用します（日本語も可）。
*   **形式**: すべて小文字を使用します。
*   **客観性**: 「Tag what you see（見えるものをタグ付けする）」を原則とします。

### VRChatアバター特有の規則

* **バージョン表記**: シェーダーやUnityのバージョンは具体的に記載します。
  * 例: `Unity2022`, `poiyomi_8.1`, `lilToon_1.3`
* **互換性タグ**: プラットフォーム対応は明確に記載します。
  * 例: `Quest対応`, `PC専用`, `クロスプラットフォーム`

### タグの組み合わせ例

**例1: アニメ調の女性アバター（Quest対応）**
```
avatar:マヌカ, style:anime, body:long_hair, body:blue_hair,
outfit:school_uniform, platform:Quest対応, platform:optimized,
feature:PhysBones, technical:medium_poly, technical:lilToon
```

**例2: リアル系の男性アバター（PC専用・高品質）**
```
style:realistic, body:short_hair, outfit:casual_wear,
platform:PC専用, feature:full_body_tracking, feature:face_tracking,
technical:high_poly, technical:4k_textures, technical:Poiyomi
```

## 3. 対象年齢（Rating）について

コンテンツの健全性を保ち、適切なゾーニングを行うため、以下の4つのレーティング区分を設けます。

| レーティング | 区分 | 定義 |
| :--- | :--- | :--- |
| **General** | 全年齢 | 誰にでも安全なコンテンツ。裸体や性的暗示を含まない。 |
| **Sensitive** | 性的暗示 | 水着、下着、露出度の高い服装、または性的なニュアンスを含むポーズなど。 |
| **Questionable** | 軽度の露出 | 乳首の露出、裸の臀部、衣服越しの性器の強調、擬似性行為など。 |
| **Explicit** | 成人向け | 露骨な性行為、性器の露出（修正有無問わず）、体液描写、激しい暴力描写など。 |

> [!IMPORTANT]
> **モザイク処理について**
> 修正（モザイク、黒塗りなど）が施されていても、性器が描写されている場合や露骨な性行為が含まれる場合は **Explicit** に分類されます。

## 4. 対象年齢判定フローチャート

適切なレーティングを選択するための判断基準フローチャートです。

```mermaid
graph TD
    Start([画像の内容を確認])

    Q1{性行為や生殖器、<br/>排泄物、過度な暴力<br/>グロが含まれる?}
    Q2{乳首や裸の尻、<br/>または衣服越しに<br/>性器が強調されている?}
    Q3{水着・下着姿、または<br/>性的な興奮を誘うような<br/>露出やポーズ、暗示がある?}
    Q4{公共の場で閲覧しても<br/>問題ない内容?}

    R_Explicit([🔞 Explicit<br/>(成人向け)])
    R_Questionable([⚠️ Questionable<br/>(軽度の露出)])
    R_Sensitive([👙 Sensitive<br/>(性的暗示)])
    R_General([✅ General<br/>(全年齢)])

    Start --> Q1
    Q1 -->|Yes| R_Explicit
    Q1 -->|No| Q2
    Q2 -->|Yes| R_Questionable
    Q2 -->|No| Q3
    Q3 -->|Yes| R_Sensitive
    Q3 -->|No| Q4
    Q4 -->|Yes| R_General
    Q4 -->|No| R_Sensitive

    style R_Explicit fill:#ff4444,color:#fff
    style R_Questionable fill:#ff9944,color:#fff
    style R_Sensitive fill:#ffdd44,color:#333
    style R_General fill:#44ff88,color:#333
```

## 5. タグ付けのベストプラクティス

### 5.1 タグ数の推奨

- **最小**: 10〜15個（基本情報 + 主要な特徴）
- **推奨**: 20〜30個（詳細な検索に対応）
- **最大**: 50個程度（過度なタグ付けは避ける）

### 5.2 優先順位

タグを付ける際は、以下の優先順位で検討してください：

1. **必須タグ**
   - レーティング（Rating）
   - アバター名（該当する場合）
   - プラットフォーム対応（Quest対応 / PC専用）

2. **重要タグ**
   - 主要な外見的特徴（髪型、髪色、目の色）
   - アートスタイル
   - 使用シェーダー
   - 主な機能（PhysBones等）

3. **補助タグ**
   - 細かい外見の特徴
   - アクセサリー
   - 特殊機能やエフェクト

### 5.3 避けるべきタグ

- 主観的な評価（`beautiful`, `cute`, `cool`）
- 曖昧な表現（`nice`, `good`, `awesome`）
- 宣伝文句（`best`, `ultimate`, `perfect`）
- 重複するタグ（`blue_hair`と`hair_blue`の両方など）

### 5.4 レーティング設定の注意点

- **迷ったら上位のレーティング**を選択（より安全側に倒す）
- **Quest対応モデル**は特にレーティングに注意（Questは年齢層が広い）
- **サムネイル画像**のレーティングは、モデル本体よりも厳しく設定することを推奨

---

## 6. まとめ

このガイドラインは、VRChatアバターの検索性と分類を向上させ、ユーザーが適切なコンテンツを見つけやすくすることを目的としています。

**重要なポイント:**
- 10カテゴリシステムで外見情報を優先（非技術者向け）
- 一貫性のあるタグ付け（アンダースコア、小文字、英語）
- 技術仕様の明記（購入判断に重要）
- 適切なレーティング設定（コミュニティの健全性維持）
- 客観的で具体的なタグの使用

タグ付けは、アバター制作者と利用者をつなぐ重要な橋渡しです。このガイドラインを参考に、適切で分かりやすいタグ付けを心がけましょう。
