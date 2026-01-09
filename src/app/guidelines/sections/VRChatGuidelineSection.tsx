'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export function VRChatGuidelineSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>VRChatアバター向けタグ付けガイドライン</CardTitle>
          <CardDescription>
            VRChatアバターおよび3Dモデルに適切なタグを付与するためのガイドライン
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              このガイドラインは、一般的な3Dアセットマーケットプレイスのベストプラクティスと、DanbooruおよびSankaku Complexの運用ルールを参考に策定されています。
            </AlertDescription>
          </Alert>

          {/* タグの命名規則 */}
          <div>
            <h3 className="text-xl font-semibold mb-4">タグの命名規則</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-green-500 border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    正しい例
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><code className="bg-green-50 px-2 py-1 rounded">blue_eyes</code></div>
                  <div><code className="bg-green-50 px-2 py-1 rounded">full_body_tracking</code></div>
                  <div><code className="bg-green-50 px-2 py-1 rounded">hatsune_miku</code></div>
                  <div><code className="bg-green-50 px-2 py-1 rounded">unity_2022</code></div>
                </CardContent>
              </Card>
              <Card className="border-red-500 border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    誤った例
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><code className="bg-red-50 px-2 py-1 rounded">blue eyes</code> (スペース)</div>
                  <div><code className="bg-red-50 px-2 py-1 rounded">Full Body Tracking</code> (大文字)</div>
                  <div><code className="bg-red-50 px-2 py-1 rounded">miku_hatsune</code> (順序)</div>
                  <div><code className="bg-red-50 px-2 py-1 rounded">Unity2022</code> (区切りなし)</div>
                </CardContent>
              </Card>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>✓ スペースの代わりに<strong>アンダースコア（_）</strong>を使用</p>
              <p>✓ すべて<strong>小文字</strong>で記述</p>
              <p>✓ 原則として<strong>英語表記</strong>を使用</p>
              <p>✓ 固有名詞は「姓_名」の順序で統一</p>
            </div>
          </div>

          {/* 推奨タグリスト */}
          <div>
            <h3 className="text-xl font-semibold mb-4">推奨タグリスト</h3>

            {/* 技術仕様タグ */}
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3">技術仕様タグ</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-semibold mb-2 text-muted-foreground">ポリゴン数</h5>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">low_poly</Badge>
                    <Badge variant="secondary">medium_poly</Badge>
                    <Badge variant="secondary">high_poly</Badge>
                    <Badge variant="secondary">very_high_poly</Badge>
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-semibold mb-2 text-muted-foreground">プラットフォーム</h5>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">quest_compatible</Badge>
                    <Badge variant="secondary">pc_only</Badge>
                    <Badge variant="secondary">cross_platform</Badge>
                    <Badge variant="secondary">optimized</Badge>
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-semibold mb-2 text-muted-foreground">シェーダー</h5>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">lilToon</Badge>
                    <Badge variant="secondary">poiyomi</Badge>
                    <Badge variant="secondary">standard_shader</Badge>
                    <Badge variant="secondary">custom_shader</Badge>
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-semibold mb-2 text-muted-foreground">テクスチャ</h5>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">1k_textures</Badge>
                    <Badge variant="secondary">2k_textures</Badge>
                    <Badge variant="secondary">4k_textures</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* アートスタイルタグ */}
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3">アートスタイル</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">anime</Badge>
                <Badge variant="outline">realistic</Badge>
                <Badge variant="outline">semi_realistic</Badge>
                <Badge variant="outline">chibi</Badge>
                <Badge variant="outline">kemono</Badge>
                <Badge variant="outline">furry</Badge>
                <Badge variant="outline">stylized</Badge>
              </div>
            </div>

            {/* 体型・ジェンダータグ */}
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3">体型・ジェンダー</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">female</Badge>
                <Badge variant="outline">male</Badge>
                <Badge variant="outline">androgynous</Badge>
                <Badge variant="outline">slender</Badge>
                <Badge variant="outline">petite</Badge>
                <Badge variant="outline">curvy</Badge>
                <Badge variant="outline">athletic</Badge>
                <Badge variant="outline">muscular</Badge>
              </div>
            </div>

            {/* VRChat機能タグ */}
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3">VRChat特有の機能</h4>
              <div className="flex flex-wrap gap-2">
                <Badge>phys_bones</Badge>
                <Badge>avatar_dynamics</Badge>
                <Badge>gesture_expressions</Badge>
                <Badge>eye_tracking</Badge>
                <Badge>face_tracking</Badge>
                <Badge>full_body_tracking</Badge>
                <Badge>lip_sync</Badge>
              </div>
            </div>

            {/* カスタマイズ性タグ */}
            <div>
              <h4 className="text-lg font-medium mb-3">カスタマイズ性</h4>
              <div className="flex flex-wrap gap-2">
                <Badge>modular</Badge>
                <Badge>color_customizable</Badge>
                <Badge>outfit_changeable</Badge>
                <Badge>toggleable_parts</Badge>
                <Badge>multiple_outfits</Badge>
              </div>
            </div>
          </div>

          {/* タグ付けのベストプラクティス */}
          <div>
            <h3 className="text-xl font-semibold mb-4">タグ付けのベストプラクティス</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">推奨タグ数</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• 最小: 10～15個（基本情報 + 主要な特徴）</li>
                      <li>• 推奨: 20～30個（詳細な検索に対応）</li>
                      <li>• 最大: 50個程度（過度なタグ付けは避ける）</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">優先順位</h4>
                    <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                      <li>必須タグ: アーティスト名、性別、アートスタイル、プラットフォーム対応</li>
                      <li>重要タグ: 主要な外見的特徴、使用シェーダー、主な機能</li>
                      <li>補助タグ: 細かい外見の特徴、アクセサリー、特殊機能</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">避けるべきタグ</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>✗ 主観的な評価（beautiful, cute, cool）</li>
                      <li>✗ 曖昧な表現（nice, good, awesome）</li>
                      <li>✗ 宣伝文句（best, ultimate, perfect）</li>
                      <li>✗ 重複するタグ（blue_hair と hair_blue の両方など）</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* レーティング設定の注意点 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>レーティング設定の注意点:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• 迷ったら上位のレーティングを選択（より安全側に倒す）</li>
                <li>• Quest対応モデルは特にレーティングに注意（Questは年齢層が広い）</li>
                <li>• サムネイル画像のレーティングは、モデル本体よりも厳しく設定することを推奨</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
