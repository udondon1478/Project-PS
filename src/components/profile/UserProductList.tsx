import React from 'react';
import ProductGrid from '@/components/ProductGrid';
import { Product } from '@/types/product';

interface UserProductListProps {
  products: Product[];
}

const UserProductList: React.FC<UserProductListProps> = ({ products }) => {
  if (products.length === 0) {
    return <p>This user has not registered any products yet.</p>;
  }

  return <ProductGrid products={products} />;
};

export default UserProductList;
