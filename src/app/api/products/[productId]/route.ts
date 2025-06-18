import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { productId: string } }) {
  const productId = params.productId;

  // 仮のダミーデータ
  const dummyProduct = {
    id: productId,
    title: `仮の商品タイトル (${productId})`,
    // 他のプロパティは仮実装では省略
  };

  // ダミーデータをJSON形式で返す
  return NextResponse.json(dummyProduct);
}