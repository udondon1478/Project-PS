import { Search, Tags, Link as LinkIcon, User, type LucideIcon } from "lucide-react";

export interface Feature {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  href: string; // リンク先を追加
}

export const features: Feature[] = [
  {
    id: "advanced-search",
    icon: Search,
    title: "豊富な検索条件",
    description: "マイナス検索や多様なフィルターで、\n欲しい商品を素早く見つけられます。",
    href: "/search",
  },
  {
    id: "tag-system",
    icon: Tags,
    title: "タグシステム",
    description: "コミュニティ主導のタグ付けで、\nマイナージャンルの商品も\n簡単に見つけられます。",
    href: "/about",
  },
  {
    id: "product-registration",
    icon: LinkIcon,
    title: "商品登録",
    description: "BOOTH.pmのURLを入力するだけで、商品情報を簡単に登録できます。",
    href: "/register-item",
  },
  {
    id: "user-auth",
    icon: User,
    title: "ログイン機能",
    description: "PolySeekアカウントに欲しい商品や\n購入済み商品を登録していくことで、リスト内からPolySeek独自のタグを\n用いた検索も可能です\n※BOOTHとの連携機能ではありません",
    href: "/profile",
  },
];
