'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Lightbulb, TrendingUp, Shield } from 'lucide-react';

export function BestPracticesSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>タグ付けのベストプラクティス</CardTitle>
          <CardDescription>
            効果的なタグ付けのためのヒントと推奨事項
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 基本原則 */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              基本原則
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-green-500 border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    推奨されるタグ付け
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>✓ 見えるものを正確にタグ付けする</p>
                  <p>✓ 具体的で客観的な表現を使う</p>
                  <p>✓ 複数のカテゴリからバランスよく選ぶ</p>
                  <p>✓ 商品の主要な特徴を優先する</p>
                  <p>✓ 検索性を意識したタグを選ぶ</p>
                </CardContent>
              </Card>
              <Card className="border-red-500 border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    避けるべきタグ付け
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>✗ 主観的な評価タグ（cute, beautiful）</p>
                  <p>✗ あまりにも一般的すぎるタグ（3D, model）</p>
                  <p>✗ 宣伝文句（best, ultimate）</p>
                  <p>✗ 見えないものへのタグ付け</p>
                  <p>✗ 重複する意味のタグ</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 検索性の向上 */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              検索性の向上
            </h3>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">効果的なタグの選び方</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>
                        <strong>1. 商品の核となる特徴を優先</strong>
                        <br />
                        最も重要な特徴（ジャンル、スタイル、主要な機能）から順にタグ付けします。
                      </li>
                      <li>
                        <strong>2. ユーザーの検索意図を考慮</strong>
                        <br />
                        購入者が検索しそうなキーワードを想像してタグを選びます。
                      </li>
                      <li>
                        <strong>3. 階層的にタグを組み合わせる</strong>
                        <br />
                        一般的なタグ（anime）と具体的なタグ（blue_hair）を組み合わせます。
                      </li>
                      <li>
                        <strong>4. 技術仕様も忘れずに</strong>
                        <br />
                        プラットフォーム対応、ポリゴン数などの技術情報も重要です。
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* レーティングのベストプラクティス */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              レーティング設定のコツ
            </h3>
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>迷ったら安全側に</AlertTitle>
                <AlertDescription>
                  レーティングの判断に迷った場合は、より上位のレーティング（より制限的な区分）を選択してください。
                  これにより、意図しないユーザーへの表示を防ぐことができます。
                </AlertDescription>
              </Alert>

              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-3">レーティング判定のポイント</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex gap-3">
                      <div className="shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">複数の画像がある場合</p>
                        <p className="text-muted-foreground">
                          最も高いレーティングが必要な画像を基準にします。1枚でもExplicitな画像があれば、商品全体をExplicitとします。
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">文脈を考慮する</p>
                        <p className="text-muted-foreground">
                          同じ露出度でも、性的な文脈があるかどうかで判断が変わります。水着でビーチにいる場合と、挑発的なポーズでは異なる扱いになります。
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">修正の有無は関係ない</p>
                        <p className="text-muted-foreground">
                          モザイクや黒塗りなどの修正が施されていても、性器や露骨な性行為が描写されている場合はExplicitとします。
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="shrink-0 w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
                        4
                      </div>
                      <div>
                        <p className="font-medium">公共の場での閲覧を基準に</p>
                        <p className="text-muted-foreground">
                          「職場や学校で見ても問題ないか？」を判断基準の1つにすると分かりやすくなります。
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* よくある間違い */}
          <div>
            <h3 className="text-xl font-semibold mb-4">よくある間違いと対処法</h3>
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">間違い: タグが少なすぎる</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-muted-foreground mb-2">
                    5個以下のタグしか付けないと、検索で見つけてもらいにくくなります。
                  </p>
                  <p className="font-medium text-green-600">
                    対処法: 最低でも10～15個、できれば20～30個のタグを付けましょう。
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">間違い: 無関係なタグを付ける</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-muted-foreground mb-2">
                    商品に関係ないタグを付けると、ユーザーの信頼を失い、検索の品質も下がります。
                  </p>
                  <p className="font-medium text-green-600">
                    対処法: 「Tag what you see（見えるものをタグ付けする）」の原則を守りましょう。
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">間違い: レーティングを低く見積もる</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-muted-foreground mb-2">
                    集客のためにレーティングを実際より低く設定すると、規約違反となり、アカウント停止の可能性があります。
                  </p>
                  <p className="font-medium text-green-600">
                    対処法: 迷ったら上位のレーティングを選択し、フローチャートを活用しましょう。
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* まとめ */}
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>まとめ</AlertTitle>
            <AlertDescription>
              適切なタグ付けとレーティング設定は、あなたの商品を必要としているユーザーに届けるための最も重要な要素です。
              時間をかけて丁寧にタグを選び、適切なレーティングを設定することで、購入者との信頼関係を築き、
              長期的な成功につながります。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
