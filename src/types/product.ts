export interface Product {
  id: string;
  title: string;
  lowPrice: number;
  highPrice: number;
  mainImageUrl: string | null;
  tags: string[];
  ageRatingId?: string | null;
  categoryId?: string | null;
  variations?: {
    id: string;
    name: string;
    price: number;
  }[];
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
