# VRChatアバター向けタグ付けガイドライン (Draft)

本ドキュメントは、VRChatアバターおよび3Dモデルの投稿時におけるタグ付けおよびレーティング設定に関するガイドラインです。一般的な3Dアセットマーケットプレイスのベストプラクティスと、DanbooruおよびSankaku Complexの運用ルールを参考に策定されています。

## 1. タグカテゴリ

検索性と管理のしやすさを向上させるため、タグは以下のカテゴリに分類されます。

### 1.1 基本情報カテゴリ

| カテゴリ | 説明 | 具体例 |
| :--- | :--- | :--- |
| **Artist** | モデル制作者名 | `john_smith`, `studio_jingo` |
| **Copyright** | 元作品名（二次創作の場合） | `original`, `vocaloid`, `genshin_impact` |
| **Character** | キャラクター名（既存キャラの場合） | `hatsune_miku`, `manuka` |

### 1.2 技術仕様カテゴリ

3Dモデルの技術的な特性を示すタグです。購入者が対応環境を判断する上で重要です。

| カテゴリ | 説明 | 具体例 |
| :--- | :--- | :--- |
| **Polygon Count** | ポリゴン数の規模 | `low_poly`, `medium_poly`, `high_poly` |
| **Rigging** | リグ・ボーン設定の有無と種類 | `humanoid_rig`, `full_body_tracking`, `face_tracking` |
| **Shaders** | 使用シェーダー | `lilToon`, `poiyomi`, `standard_shader` |
| **Texture Quality** | テクスチャ解像度 | `2k_textures`, `4k_textures` |
| **File Format** | ファイル形式 | `unity_package`, `fbx`, `vrm` |
| **Unity Version** | 対応Unityバージョン | `unity_2022`, `unity_2019` |

### 1.3 スタイル・外見カテゴリ

モデルの視覚的特徴を示すタグです。

| カテゴリ | 説明 | 具体例 |
| :--- | :--- | :--- |
| **Art Style** | アートスタイル | `anime`, `realistic`, `chibi`, `kemono` |
| **Gender** | 性別・体型 | `female`, `male`, `androgynous` |
| **Body Type** | 体型の特徴 | `slender`, `petite`, `curvy`, `muscular` |
| **Hair** | 髪の特徴 | `long_hair`, `short_hair`, `twintails`, `blue_hair` |
| **Eyes** | 目の特徴 | `red_eyes`, `heterochromia`, `glowing_eyes` |
| **Outfit** | 衣装・服装 | `school_uniform`, `maid_outfit`, `casual_wear` |
| **Accessories** | アクセサリー | `cat_ears`, `tail`, `wings`, `horns` |

### 1.4 機能・特徴カテゴリ

モデルの機能的な特性を示すタグです。

| カテゴリ | 説明 | 具体例 |
| :--- | :--- | :--- |
| **VRChat Features** | VRChat特有の機能 | `gesture_expressions`, `phys_bones`, `avatar_dynamics` |
| **Customization** | カスタマイズ性 | `modular`, `color_customizable`, `outfit_changeable` |
| **Animations** | アニメーション対応 | `emote_support`, `dance_ready`, `idle_animations` |
| **Optimization** | 最適化状態 | `quest_compatible`, `pc_only`, `optimized` |
| **Special Features** | 特殊機能 | `toggleable_parts`, `particle_effects`, `shader_animations` |

### 1.5 メタ情報カテゴリ

画像やモデルデータ自体に関する情報です。

| カテゴリ | 説明 | 具体例 |
| :--- | :--- | :--- |
| **Image Quality** | 画像品質 | `highres`, `4k`, `screenshot` |
| **Content Type** | コンテンツタイプ | `3d_model`, `texture`, `concept_art` |
| **Documentation** | ドキュメント | `tutorial_included`, `readme_jp`, `readme_en` |

## 2. タグの命名規則

タグの表記揺れを防ぎ、一貫性を保つためのルールです。

### 基本ルール

*   **区切り文字**: スペースの代わりに **アンダースコア (`_`)** を使用します。
    *   ✅ `blue_eyes`, `full_body_tracking`
    *   ❌ `blue eyes`, `full body tracking`
*   **言語**: 原則として英語表記を使用します。
*   **形式**: すべて小文字を使用します。
*   **固有名詞**: キャラクター名は `姓_名` の順序で統一します（例: `hatsune_miku`）。
*   **客観性**: 「Tag what you see（見えるものをタグ付けする）」を原則とし、主観的な評価タグ（`cute`, `cool` など）は推奨されません。

### VRChatアバター特有の規則

*   **バージョン表記**: シェーダーやUnityのバージョンは具体的に記載します。
    *   例: `unity_2022`, `poiyomi_8.1`, `lilToon_1.3`
*   **互換性タグ**: プラットフォーム対応は明確に記載します。
    *   例: `quest_compatible`, `pc_only`, `cross_platform`
*   **数値の表記**: ポリゴン数やテクスチャサイズは簡潔な形式で記載します。
    *   例: `70k_polys`, `4k_textures`, `medium_poly` (30k-70k程度)

### タグの組み合わせ例

実際の使用例を示します：

**例1: アニメ調の女性アバター（Quest対応）**
```
artist:studio_jingo, copyright:original, character:manuka,
art_style:anime, gender:female, body_type:slender,
long_hair, blue_hair, school_uniform,
quest_compatible, optimized, phys_bones,
medium_poly, 2k_textures, lilToon,
modular, color_customizable
```

**例2: リアル系の男性アバター（PC専用・高品質）**
```
artist:john_doe, copyright:original,
art_style:realistic, gender:male, body_type:athletic,
short_hair, casual_wear,
pc_only, high_poly, 4k_textures, poiyomi,
full_body_tracking, face_tracking,
particle_effects, shader_animations
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

### 判定チェックリスト

迷った場合は、以下のリストの上から順にチェックし、最初に「Yes」となった区分を適用してください。

#### 🔞 Explicit (成人向け)
- [ ] 性行為（挿入、自慰、フェラチオなど）が描かれている
- [ ] 性器が描かれている（モザイクや修正の有無を問わない）
- [ ] 精液や愛液などの体液が描かれている
- [ ] グロテスクな表現や過度な暴力描写がある

#### ⚠️ Questionable (軽度の露出)
- [ ] 乳首が露出している
- [ ] 裸の臀部（お尻）が見えている
- [ ] 衣服越しに性器の形状がはっきりと強調されている（Cameltoeなど）
- [ ] 擬似的な性行為や、BDSM要素（緊縛など）が含まれる

#### 👙 Sensitive (性的暗示)
- [ ] 水着や下着姿である
- [ ] 胸の谷間やヘソ出しなど、露出度の高い服装である
- [ ] 特定の部位を強調するポーズやアングルである（パンチラなど）
- [ ] 性具が背景や小物として描かれている

#### ✅ General (全年齢)
- [ ] 上記のいずれにも該当せず、学校や職場などの公共の場で閲覧しても問題ない

---

## 5. VRChatアバター向け推奨タグリスト

実際のタグ付けで使用頻度の高いタグをカテゴリ別にまとめました。

### 5.1 技術仕様タグ

#### ポリゴン数
- `low_poly` (～30k)
- `medium_poly` (30k～70k)
- `high_poly` (70k～)
- `very_high_poly` (150k～)

#### プラットフォーム対応
- `quest_compatible` - Meta Quest対応
- `pc_only` - PC専用
- `cross_platform` - クロスプラットフォーム対応
- `optimized` - 最適化済み

#### シェーダー
- `lilToon`
- `poiyomi`
- `standard_shader`
- `unity_toon_shader`
- `custom_shader`

#### テクスチャ
- `2k_textures` (2048x2048)
- `4k_textures` (4096x4096)
- `1k_textures` (1024x1024)

### 5.2 スタイル・ジャンルタグ

#### アートスタイル
- `anime` - アニメ調
- `realistic` - リアル調
- `semi_realistic` - セミリアル
- `chibi` - ちびキャラ
- `kemono` - ケモノ
- `furry` - ファーリー
- `stylized` - 様式化された

#### 体型・ジェンダー
- `female`
- `male`
- `androgynous` - 中性的
- `slender` - スレンダー
- `petite` - 小柄
- `curvy` - 曲線的
- `athletic` - アスリート体型
- `muscular` - 筋肉質

### 5.3 外見タグ

#### 髪型
- `long_hair`
- `short_hair`
- `medium_hair`
- `twintails` - ツインテール
- `ponytail` - ポニーテール
- `bob_cut` - ボブカット
- `ahoge` - アホ毛

#### 髪色
- `blonde_hair`
- `black_hair`
- `brown_hair`
- `red_hair`
- `blue_hair`
- `pink_hair`
- `white_hair`
- `multicolored_hair`

#### 瞳
- `blue_eyes`
- `red_eyes`
- `green_eyes`
- `purple_eyes`
- `heterochromia` - オッドアイ
- `glowing_eyes` - 発光する目

#### 耳・尻尾
- `cat_ears`
- `fox_ears`
- `dog_ears`
- `rabbit_ears`
- `elf_ears`
- `tail`
- `cat_tail`
- `fox_tail`

### 5.4 衣装タグ

#### 一般的な服装
- `school_uniform` - 学生服
- `maid_outfit` - メイド服
- `casual_wear` - カジュアル
- `formal_wear` - フォーマル
- `dress`
- `kimono` - 着物
- `hoodie` - パーカー
- `sweater`

#### アクセサリー・装飾
- `wings` - 翼
- `horns` - 角
- `halo` - 光輪
- `glasses` - 眼鏡
- `ribbon` - リボン
- `choker` - チョーカー

### 5.5 機能タグ

#### VRChat特有の機能
- `phys_bones` - PhysBones対応
- `avatar_dynamics` - Avatar Dynamics
- `gesture_expressions` - ジェスチャー表情
- `eye_tracking` - アイトラッキング
- `face_tracking` - フェイストラッキング
- `full_body_tracking` - フルボディトラッキング
- `lip_sync` - リップシンク

#### カスタマイズ性
- `modular` - モジュラー（パーツ交換可能）
- `color_customizable` - カラーカスタマイズ可能
- `outfit_changeable` - 衣装変更可能
- `toggleable_parts` - パーツON/OFF可能
- `multiple_outfits` - 複数衣装同梱

#### エフェクト・アニメーション
- `particle_effects` - パーティクルエフェクト
- `shader_animations` - シェーダーアニメーション
- `emote_support` - エモート対応
- `dance_ready` - ダンス対応
- `idle_animations` - アイドルアニメーション

---

## 6. タグ付けのベストプラクティス

### 6.1 タグ数の推奨

- **最小**: 10～15個（基本情報 + 主要な特徴）
- **推奨**: 20～30個（詳細な検索に対応）
- **最大**: 50個程度（過度なタグ付けは避ける）

### 6.2 優先順位

タグを付ける際は、以下の優先順位で検討してください：

1. **必須タグ**
   - アーティスト名
   - 性別（gender）
   - アートスタイル（art_style）
   - プラットフォーム対応（quest_compatible / pc_only）
   - ポリゴン数の規模

2. **重要タグ**
   - 主要な外見的特徴（髪型、髪色、目の色）
   - 使用シェーダー
   - 主な機能（phys_bones, avatar_dynamics等）
   - カスタマイズ性

3. **補助タグ**
   - 細かい外見の特徴
   - アクセサリー
   - 特殊機能やエフェクト

### 6.3 避けるべきタグ

- 主観的な評価（`beautiful`, `cute`, `cool`）
- 曖昧な表現（`nice`, `good`, `awesome`）
- 宣伝文句（`best`, `ultimate`, `perfect`）
- 重複するタグ（`blue_hair`と`hair_blue`の両方など）

### 6.4 レーティング設定の注意点

- **迷ったら上位のレーティング**を選択（より安全側に倒す）
- **Quest対応モデル**は特にレーティングに注意（Questは年齢層が広い）
- **サムネイル画像**のレーティングは、モデル本体よりも厳しく設定することを推奨

---

## 7. まとめ

このガイドラインは、VRChatアバターの検索性と分類を向上させ、ユーザーが適切なコンテンツを見つけやすくすることを目的としています。

**重要なポイント:**
- 一貫性のあるタグ付け（アンダースコア、小文字、英語）
- 技術仕様の明記（購入判断に重要）
- 適切なレーティング設定（コミュニティの健全性維持）
- 客観的で具体的なタグの使用

タグ付けは、アバター制作者と利用者をつなぐ重要な橋渡しです。このガイドラインを参考に、適切で分かりやすいタグ付けを心がけましょう。
