import { Search, Tags, Link as LinkIcon, User } from "lucide-react";

export const features = [
  {
    id: "tag-search",
    icon: Search,
    title: "タグ検索",
    description: "コミュニティ主導のデータベースで、欲しい商品を素早く見つけられます。",
  },
  {
    id: "price-filter",
    icon: Tags,
    title: "価格フィルター",
    description: "価格範囲を指定して商品を絞り込み、予算に合った商品を探せます。",
  },
  {
    id: "product-registration",
    icon: LinkIcon,
    title: "商品登録",
    description: "BOOTH.pmのURLを入力するだけで、商品情報を簡単に登録できます。",
  },
  {
    id: "user-auth",
    icon: User,
    title: "ユーザー認証",
    description: "ログインしてお気に入りや所持品を管理し、購入履歴を追跡できます。",
  },
];
