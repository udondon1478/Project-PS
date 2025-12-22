import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { features } from "@/constants/features";

export default function ServiceIntroSection() {
  return (
    <section
      aria-label="サービス紹介"
      className="mb-12"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          VRChat向け商品をタグで効率的に検索
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          PolySeekは、VRChat向けの3Dアバターやアクセサリーをタグベースで検索できるサービスです。
          一つの商品に対し、みんなでタグを付与していくことで検索性が向上します。
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => (
          <Card key={feature.id} className="text-center">
            <CardHeader className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
              <CardDescription className="whitespace-pre-wrap">{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
