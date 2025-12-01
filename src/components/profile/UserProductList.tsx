import React from 'react';
import ProductGrid from '@/components/ProductGrid';
import { Product } from '@/types/product';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home, PackageOpen } from "lucide-react";

interface UserProductListProps {
  products: Product[];
}

const UserProductList: React.FC<UserProductListProps> = ({ products }) => {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <div className="bg-muted/30 p-4 rounded-full">
          <PackageOpen className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">まだ登録がありません</p>
          <p className="text-sm text-muted-foreground">
            トップページからお気に入りの商品を探してみましょう！
          </p>
        </div>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            トップページへ戻る
          </Link>
        </Button>
      </div>
    );
  }

  return <ProductGrid products={products} />;
};

export default UserProductList;
