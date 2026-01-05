export interface Product {
  id: string;
  title:string;
  lowPrice: number;
  highPrice: number;
  mainImageUrl: string | null;
  tags: string[];
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
    description: string | null;
    tagCategoryId: string;
    tagCategory: {
      id: string;
      name: string;
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
