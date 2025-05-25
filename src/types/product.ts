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