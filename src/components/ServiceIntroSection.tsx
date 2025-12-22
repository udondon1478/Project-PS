"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Tags, Link as LinkIcon, User } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "タグ検索",
    description: "コミュニティ主導のデータベースで、欲しい商品を素早く見つけられます。",
  },
  {
    icon: Tags,
    title: "価格フィルター",
    description: "価格範囲を指定して商品を絞り込み、予算に合った商品を探せます。",
  },
  {
    icon: LinkIcon,
    title: "商品登録",
    description: "BOOTH.pmのURLを入力するだけで、商品情報を簡単に登録できます。",
  },
  {
    icon: User,
    title: "ユーザー認証",
    description: "ログインしてお気に入りや所持品を管理し、購入履歴を追跡できます。",
  },
];

export default function ServiceIntroSection() {
  return (
    <section
      aria-label="サービス紹介"
      className="container mx-auto px-4 md:px-6 mb-12"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          VRChat向け商品をタグで効率的に検索
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          PolySeekは、VRChat向けの3Dアバターやアクセサリーをタグベースで検索できるサービスです。
          マイナス検索や価格フィルターを活用して、欲しい商品をすばやく見つけましょう。
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => (
          <Card key={feature.title} className="text-center">
            <CardHeader className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
