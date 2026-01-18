/**
 * タグ情報（カテゴリ色を含む）
 */
export interface TagInfo {
  name: string;
  categoryColor: string | null; // HEXカラーコード (例: "#E74C3C") or null
}

export interface Product {
  id: string;
  title:string;
  lowPrice: number;
  highPrice: number;
  mainImageUrl: string | null;
  tags: TagInfo[];
  isLiked?: boolean;
  isOwned?: boolean;
  ageRatingId?: string | null;
  categoryId?: string | null;
  variations?: {
    id: string;
    name: string;
    price: number;
  }[];
  seller?: {
    name: string;
    iconUrl: string | null;
    sellerUrl: string;
  } | null;
}
export interface SchemaOrgOffer {
  "@type": "Offer";
  priceCurrency: string;
  price: string;
  availability: string;
  url: string;
}

export interface SchemaOrgAggregateOffer {
  "@type": "AggregateOffer";
  lowPrice: string;
  highPrice: string;
  priceCurrency: string;
  offerCount: string;
}

export interface SchemaOrgProduct {
  "@context": string;
  "@type": "Product";
  name: string;
  description: string;
  image: string | string[];
  offers: SchemaOrgOffer | SchemaOrgAggregateOffer;
}

export interface ProductTag {
  tag: {
    id: string;
    name: string;
    displayName?: string;
    description: string | null;
    tagCategoryId: string;
    tagCategory: {
      id: string;
      name: string;
      color?: string; // カテゴリ色
    };
  };
  isOfficial: boolean; // BOOTH由来の公式タグかどうか
}

export interface TagEditHistory {
  id: string;
  editor: {
    id: string;
    name: string | null;
    image: string | null;
  };
  version: number;
  addedTags: string[];
  removedTags: string[];
  keptTags: string[];
  comment: string | null;
  score: number;
  createdAt: string;
  userVote: { score: number } | null;
}

/**
 * 商品詳細情報（Reelsモード用）
 * /api/products/[productId] から取得する拡張データ
 */
export interface ProductDetail {
  id: string;
  title: string;
  description: string | null;
  lowPrice: number;
  highPrice: number;
  boothJpUrl: string;
  images: {
    id: string;
    imageUrl: string;
    order: number;
    isMain: boolean;
  }[];
  productTags: ProductTag[];
  variations: {
    id: string;
    name: string;
    price: number;
  }[];
  seller: {
    name: string;
    iconUrl: string | null;
    sellerUrl: string;
  } | null;
  isLiked: boolean;
  isOwned: boolean;
}
