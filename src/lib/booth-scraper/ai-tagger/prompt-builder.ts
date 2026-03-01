/**
 * AI Tagger プロンプト生成モジュール
 * 商品タイプ別・カテゴリ定義埋込のプロンプトを構築
 */

import { tagCategories } from '@/data/guidelines/tagCategories';
import { prisma } from '@/lib/prisma';
import type { AIAnalysisInput } from './types';

/** 39美学カテゴリの一覧 */
const AESTHETIC_CATEGORIES = [
  'お姉さん系', 'おしとやか系', '清楚系', 'ワイルド系', 'リアルお姉さん系',
  '小悪魔系', 'ロリータ系', '気さく系', 'ファンシー系', 'お嬢様系',
  'セクシー系', '学者メガネ系', '和装系', 'ほんわか系', 'しっとり系',
  'モード系', 'ダーク系', 'クール系', 'サイバー系', 'アンドロイド系',
  'ロック系', '中性系(男性)', '青年系', '少年系', 'ケモノ系',
  'ロボット・メカ系', '活発系', '児童系', 'デフォルメ系', 'おっとり系',
  '働き者系', 'ちょいワイルド系', 'ふわふわ系', 'ボーイッシュ系', 'ファンタジー系',
  'マスコット系', 'エスニック系', '壮年系', '人外系',
] as const;

/**
 * タグマスター（既存タグ一覧）をDBから取得する
 * 名前揺れ防止のため、既存タグ名をプロンプトに含める
 */
export async function getTagMasterList(): Promise<string[]> {
  const tags = await prisma.tag.findMany({
    select: { name: true },
    orderBy: { count: 'desc' },
    take: 500, // 主要タグのみ（トークン制限対策）
  });
  return tags.map((t) => t.name);
}

/**
 * カテゴリ定義のプロンプトテキストを生成
 */
function buildCategoryDefinitions(): string {
  const categories = tagCategories
    .filter((c) => c.id !== 'creator' && c.id !== 'rating')
    .map(
      (c) =>
        `- ${c.id} (${c.name}): ${c.description} 例: ${c.examples.join(', ')}`,
    )
    .join('\n');

  return categories;
}

/**
 * メインのシステムプロンプトを構築
 */
export function buildSystemPrompt(existingTagNames: string[]): string {
  const categoryDefs = buildCategoryDefinitions();
  const aestheticList = AESTHETIC_CATEGORIES.join(', ');

  // タグマスターをカテゴリ別にグループ化して読みやすくする
  const tagMasterSection =
    existingTagNames.length > 0
      ? `\n## 既存タグマスター（名前揺れ防止）\n以下のタグが既にシステムに登録されています。新規タグを提案する前に、この一覧にマッチするものがないか確認し、マッチする場合は既存のタグ名を正確に使用してください:\n${existingTagNames.join(', ')}`
      : '';

  return `あなたはBOOTH（VRChat向け3Dコンテンツマーケットプレイス）の商品分析AIです。
商品の説明文と画像を分析し、商品タイプの判定とタグ付けを1回のレスポンスで行ってください。

## 商品タイプ判定
以下のいずれかを判定してください：
- アバター: VRChatアバター本体（3Dモデル）
- 衣装: アバター用の衣装・服装
- アクセサリー: アバター用のアクセサリー・装飾品
- テクスチャ: テクスチャ素材・スキン
- ツール・ギミック: VRChat用ツールやギミック
- ワールド: VRChatワールド
- その他: 上記に該当しないもの

## タグカテゴリ定義
${categoryDefs}

## 美学カテゴリ（aestheticカテゴリ）
アバター商品の場合、以下の39分類から最も近い1つを選択してください（該当なしの場合はnull）：
${aestheticList}

## タグ付けルール
1. 「見えるものをタグ付けする」が基本原則。画像や説明文から客観的に確認できる特徴のみ
2. 主観的な評価（かわいい、すごい等）は避ける
3. 各タグにはcategory（上記カテゴリID）とconfidence（0.0-1.0の確信度）を付与
4. BOOTHタグは信頼性が低いため、説明文と画像から独自に判断する
5. アバター名やクリエイター名はタグに含めない（別途管理されるため）
6. confidenceは以下の基準: 0.9以上=確実、0.7-0.9=高確率、0.5-0.7=推定、0.5未満=不確実

## 商品タイプ別の分析ポイント

### アバター
- 体型特徴（身長、体型、髪色、髪型、瞳の色）
- 美学カテゴリ（39分類から1つ）
- 対応環境（Quest対応、PC専用など）
- 技術仕様（対応シェーダー、PhysBone等）

### 衣装
- 衣装の種類（制服、ドレス、水着、カジュアル等）
- 対応アバター（対応アバター名はfeatureカテゴリで「○○対応」形式）
- スタイル・雰囲気

### アクセサリー
- 種類（眼鏡、イヤリング、帽子、武器等）
- 装着部位
- 対応アバター

### テクスチャ
- 対象部位（瞳、肌、服等）
- スタイル
- 解像度（わかる場合）

### ツール・ギミック
- 機能の種類
- 対応プラットフォーム
${tagMasterSection}

## 出力形式
以下のJSONフォーマットで出力してください：
{
  "productType": "アバター",
  "aestheticCategory": "お姉さん系",
  "tags": [
    { "name": "長髪", "category": "body", "confidence": 0.95 },
    { "name": "Quest対応", "category": "platform", "confidence": 0.90 }
  ]
}`;
}

/**
 * ユーザープロンプト（商品データ）を構築
 */
export function buildUserPrompt(input: AIAnalysisInput): string {
  const parts: string[] = [
    `## 商品情報`,
    `タイトル: ${input.title}`,
  ];

  if (input.description) {
    // 説明文はトークン節約のため最大2000文字に制限
    const truncated =
      input.description.length > 2000
        ? input.description.slice(0, 2000) + '...(省略)'
        : input.description;
    parts.push(`説明文:\n${truncated}`);
  }

  if (input.ageRating) {
    parts.push(`年齢制限: ${input.ageRating}`);
  }

  parts.push(
    '',
    '上記の商品情報と添付画像を分析し、商品タイプ判定とタグ付けを行ってください。',
  );

  return parts.join('\n');
}
