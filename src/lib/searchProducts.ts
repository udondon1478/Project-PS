import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Product } from '@/types/product';
import { auth } from '@/auth';
import { normalizeQueryParam } from './utils';
import { SAFE_SEARCH_EXCLUDED_TAGS } from '@/constants/safeSearch';

/**
 * 商品検索のパラメータを定義します。
 */
export interface SearchParams {
  /** 検索キーワード。商品のタイトルや説明に含まれる文字列。 */
  q?: string;
  /** 検索対象のカテゴリ名。 */
  category?: string;
  /** 検索に含めるタグの配列。指定されたタグをすべて持つ商品が対象。 */
  tags?: string | string[];
  /** 検索から除外するタグの配列。指定されたタグを持つ商品は除外される。 */
  negativeTags?: string | string[];
  /**
   * 並び替えの基準となるキー。
   *
   * ユーザーフレンドリーな値:
   * - 'newest': 新着順 (createdAt DESC)
   * - 'price-low': 価格の安い順 (lowPrice ASC)
   * - 'price-high': 価格の高い順 (highPrice DESC)
   *
   * レガシーな値（後方互換性のため維持）:
   * - 'createdAt', 'lowPrice', 'highPrice', 'viewCount', 'publishedAt'
   *   これらは `order` パラメータと組み合わせて使用
   */
  sort?: string;
  /** 並び替えの順序 ('asc' または 'desc')。 */
  order?: string;
  /** 年齢制限タグ（例: 'R-18'）。文字列または文字列の配列を受け入れます。 */
  ageRatingTags?: string | string[];
  /**
   * 最低価格。
   * - 形式: 数字の文字列 (例: "1000")
   * - 通貨: 日本円 (JPY)
   * - 条件: この価格以上 (Inclusive: >=)
   * @remarks
   * URLパラメータから値を構築する場合、呼び出し元で適切なパースとバリデーションを行ってください。
   * 現状は文字列型ですが、将来的には数値型への移行が検討されています。
   */
  minPrice?: string;
  /**
   * 最高価格。
   * - 形式: 数字の文字列 (例: "5000")
   * - 通貨: 日本円 (JPY)
   * - 条件: この価格以下 (Inclusive: <=)
   * @remarks
   * URLパラメータから値を構築する場合、呼び出し元で適切なパースとバリデーションを行ってください。
   * 現状は文字列型ですが、将来的には数値型への移行が検討されています。
   */
  maxPrice?: string;
  /** ページ番号（1始まり）。デフォルト: 1 */
  page?: number;
  /** 1ページあたりの件数。デフォルト: 24 */
  pageSize?: number;
}

/**
 * 検索結果の戻り値型
 */
export interface SearchResult {
  /** 商品一覧 */
  products: Product[];
  /** 総件数 */
  total: number;
}

export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    // ページネーションパラメータのバリデーション
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 24));
    const skip = (page - 1) * pageSize;

    const initialTagNames = normalizeQueryParam(params.tags) || [];
    const ageRatingTagNames = normalizeQueryParam(params.ageRatingTags) || [];
    const tagNames = [...new Set([...initialTagNames, ...ageRatingTagNames])];
    
    let negativeTagNames = normalizeQueryParam(params.negativeTags);

    // タグの衝突を検証 (ユーザーの元の意図に基づいてチェック)
    if (tagNames && negativeTagNames) {
      const negativeSet = new Set(negativeTagNames);
      const intersection = tagNames.filter(tag => negativeSet.has(tag));
      if (intersection.length > 0) {
        throw new Error(`検索条件エラー: タグ '${intersection.join(', ')}' は検索条件と除外条件の両方に含まれています。`);
      }
    }

    // セーフサーチが有効（デフォルト）または未ログインの場合の処理
    const isSafeSearchEnabled = session?.user?.isSafeSearchEnabled ?? true;
    if (isSafeSearchEnabled) {
      // ユーザーが明示的にR-17またはR-18を検索しようとしているかチェック
      const restrictedTag = tagNames?.find(tag =>
        SAFE_SEARCH_EXCLUDED_TAGS.includes(tag as typeof SAFE_SEARCH_EXCLUDED_TAGS[number])
      );
      if (restrictedTag) {
        throw new Error(`セーフサーチが有効なため、${restrictedTag}コンテンツは検索できません。`);
      }

      // 除外タグに追加 (既存の配列を変更せず、新しい配列を作成)
      if (!negativeTagNames) {
        negativeTagNames = [...SAFE_SEARCH_EXCLUDED_TAGS];
      } else {
        const tagsToAdd = SAFE_SEARCH_EXCLUDED_TAGS.filter(
          tag => !negativeTagNames!.includes(tag)
        );
        if (tagsToAdd.length > 0) {
          negativeTagNames = [...negativeTagNames, ...tagsToAdd];
        }
      }
    }

    const whereConditions: Prisma.ProductWhereInput[] = [];

    if (params.q) {
      whereConditions.push({
        OR: [
          { title: { contains: params.q, mode: 'insensitive' } },
          { description: { contains: params.q, mode: 'insensitive' } },
        ],
      });
    }

    if (params.category) {
      whereConditions.push({
        productTags: {
          some: {
            tag: {
              name: params.category,
              tagCategory: { name: 'category' },
            },
          },
        },
      });
    }

    if (tagNames && tagNames.length > 0) {
      whereConditions.push({
        AND: tagNames.map(tagName => ({
          productTags: {
            some: {
              tag: {
                name: tagName,
              },
            },
          },
        })),
      });
    }

    if (negativeTagNames && negativeTagNames.length > 0) {
      whereConditions.push({
        NOT: {
          productTags: {
            some: {
              tag: {
                name: {
                  in: negativeTagNames,
                },
              },
            },
          },
        },
      });
    }

    let minPrice: number | undefined;
    let maxPrice: number | undefined;

    if (params.minPrice) {
      const parsed = Number(params.minPrice);
      if (!isNaN(parsed)) {
        minPrice = parsed;
      }
    }

    if (params.maxPrice) {
      const parsed = Number(params.maxPrice);
      if (!isNaN(parsed)) {
        maxPrice = parsed;
      }
    }

    // 価格条件の矛盾をチェック
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new Error('検索条件エラー: 最低価格が最高価格より高くなっています。');
    }

    // Note: The function intends to match overlapping price ranges.
    // Product [low, high] overlaps with Filter [min, max] if high >= min AND low <= max.
    
    if (minPrice !== undefined) {
      whereConditions.push({
        highPrice: {
          gte: minPrice,
        },
      });
    }

    if (maxPrice !== undefined) {
      whereConditions.push({
        lowPrice: {
          lte: maxPrice,
        },
      });
    }

    // ユーザーフレンドリーなソートパラメータマッピング
    const SORT_MAPPINGS: Record<string, { field: 'createdAt' | 'lowPrice' | 'highPrice' | 'publishedAt'; order: 'asc' | 'desc' }> = {
      'newest': { field: 'createdAt', order: 'desc' },
      'oldest': { field: 'createdAt', order: 'asc' },
      'published-new': { field: 'publishedAt', order: 'desc' },
      'published-old': { field: 'publishedAt', order: 'asc' },
      'price-low': { field: 'lowPrice', order: 'asc' },
      'price-high': { field: 'highPrice', order: 'desc' },
    };

    // レガシーソートキー（後方互換性のため維持）
    const allowedSortKeys = ['createdAt', 'lowPrice', 'highPrice', 'viewCount', 'publishedAt'] as const;
    type SortKey = typeof allowedSortKeys[number];

    const orderBy: Prisma.ProductOrderByWithRelationInput = {};

    // まずユーザーフレンドリーなソート値をチェック
    if (params.sort && SORT_MAPPINGS[params.sort]) {
      const mapping = SORT_MAPPINGS[params.sort];
      orderBy[mapping.field] = mapping.order;
    } else {
      // レガシーなfield/orderパターンにフォールバック
      const sortKey = params.sort as SortKey;
      if (params.sort && allowedSortKeys.includes(sortKey)) {
        orderBy[sortKey] = params.order === 'asc' ? 'asc' : 'desc';
      } else {
        // デフォルト: 新着順
        orderBy.createdAt = 'desc';
      }
    }

    const whereClause = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // 商品取得とカウントを並列実行
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: pageSize,
        include: {
          productTags: {
            include: {
              tag: {
                include: {
                  tagCategory: {
                    select: {
                      color: true,
                    },
                  },
                },
              },
            },
          },
          images: {
            where: {
              isMain: true,
            },
            take: 1,
          },
          variations: {
            orderBy: {
              order: 'asc',
            },
          },
          likes: {
            where: { userId },
          },
          productOwners: {
            where: { userId },
          },
        },
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    return {
      products: products.map(product => ({
        id: product.id,
        title: product.title,
        lowPrice: product.lowPrice,
        highPrice: product.highPrice,
        mainImageUrl: product.images.length > 0 ? product.images[0].imageUrl : null,
        tags: product.productTags.map(pt => ({
          name: pt.tag.displayName || pt.tag.name,
          categoryColor: pt.tag.tagCategory?.color || null,
        })),
        variations: product.variations.map(v => ({
          id: v.id,
          name: v.name,
          price: v.price,
        })),
        isLiked: product.likes.length > 0,
        isOwned: product.productOwners.length > 0,
      })),
      total,
    };

  } catch (error) {
    // カスタムバリデーションエラーはそのままスローする
    if (error instanceof Error && (
      error.message.startsWith('検索条件エラー:') ||
      error.message.startsWith('セーフサーチが有効なため')
    )) {
      throw error;
    }
    console.error('商品検索エラー:', error);
    throw new Error('商品の取得に失敗しました');
  }
}