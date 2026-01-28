import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  // 認証チェックは必須ではないが、非公開情報がある場合は考慮が必要
  // 今回は商品情報の取得なので公開情報として扱います

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: true,
        images: {
          orderBy: { order: 'asc' },
        },
        productTags: {
          include: {
            tag: true
          }
        }
      },
    });

    if (!product) {
      return NextResponse.json({ message: "商品が見つかりません。" }, { status: 404 });
    }

    // register-itemページで期待される ProductInfo 型に合わせてデータを整形
    const productInfo = {
      id: product.id,
      boothJpUrl: product.boothJpUrl,
      boothEnUrl: product.boothEnUrl || '',
      title: product.title,
      description: product.description,
      lowPrice: 0, // DBスキーマによっては別途計算が必要だが、登録画面での表示用としては一旦必須ではない場合も
      highPrice: 0,
      // DBに価格情報がない場合はSchema.org情報などから取得する必要があるが、
      // 既存のDB構造に price カラムがないか、あるいは scraping 時に取得しているか確認が必要
      // ここでは既存のAPIに合わせて最低限のフィールドを返します
      publishedAt: product.createdAt.toISOString(),
      sellerName: product.seller?.name || "Unknown",
      sellerUrl: product.seller?.sellerUrl || "",
      sellerIconUrl: product.seller?.iconUrl || "",
      images: product.images.map(img => ({
        imageUrl: img.imageUrl,
        isMain: img.isMain,
        order: img.order,
      })),
      productTags: product.productTags.map(pt => ({
        tag: {
          id: pt.tag.id,
          name: pt.tag.name
        },
        isOfficial: pt.isOfficial
      })),
      // boothTagsはDBに保存されていない場合があるため、必要ならproductTagsから抽出
      boothTags: []
    };

    return NextResponse.json({ product: productInfo });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ message: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
