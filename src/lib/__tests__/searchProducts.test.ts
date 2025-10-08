/**
 * @jest-environment node
 */
import { searchProducts, SearchParams } from '../searchProducts';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { Session } from 'next-auth';

// 依存関係をモック化
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

// Prismaのwhere条件の型定義
type WhereCondition = {
  NOT?: unknown;
  AND?: unknown;
  OR?: unknown;
  [key: string]: unknown;
};

// モックされた関数に型アサーションを適用
const mockedPrismaFindMany = prisma.product.findMany as jest.Mock;
const mockedAuth = auth as jest.MockedFunction<typeof auth>;

describe('searchProducts', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
    // デフォルトの認証セッションをモック
    mockedAuth.mockResolvedValue({ user: { id: 'test-user' } } as Session);
  });

  it('ネガティブタグを指定した場合、そのタグを持つ商品が除外されるべき', async () => {
    mockedPrismaFindMany.mockResolvedValue([]);
    const params: SearchParams = { negativeTags: ['イラスト'] };
    await searchProducts(params);

    const findManyArgs = mockedPrismaFindMany.mock.calls[0][0];
    const notCondition = findManyArgs?.where?.AND?.find((c: WhereCondition) => c.NOT);

    expect(notCondition).toBeDefined();
    expect(notCondition.NOT.productTags.some.tag.name.in).toEqual(['イラスト']);
  });

  it('複数のネガティブタグを指定した場合、それらすべてが除外条件に含まれるべき', async () => {
    mockedPrismaFindMany.mockResolvedValue([]);
    const params: SearchParams = { negativeTags: ['イラスト', '背景'] };
    await searchProducts(params);

    const findManyArgs = mockedPrismaFindMany.mock.calls[0][0];
    const notCondition = findManyArgs?.where?.AND?.find((c: WhereCondition) => c.NOT);

    expect(notCondition).toBeDefined();
    expect(notCondition.NOT.productTags.some.tag.name.in).toEqual(['イラスト', '背景']);
  });

  it('tagsとnegativeTagsの両方を指定した場合、両方の条件がクエリに含まれるべき', async () => {
    mockedPrismaFindMany.mockResolvedValue([]);
    const params: SearchParams = { tags: ['3D'], negativeTags: ['イラスト'] };
    await searchProducts(params);

    const findManyArgs = mockedPrismaFindMany.mock.calls[0][0];
    const andConditions = findManyArgs?.where?.AND;

    const positiveCondition = andConditions.find((c: WhereCondition) => c.AND);
    const negativeCondition = andConditions.find((c: WhereCondition) => c.NOT);

    expect(positiveCondition.AND[0].productTags.some.tag.name).toBe('3D');
    expect(negativeCondition.NOT.productTags.some.tag.name.in).toEqual(['イラスト']);
  });

  it('negativeTagsに空の配列が渡された場合、除外条件は追加されないべき', async () => {
    mockedPrismaFindMany.mockResolvedValue([]);
    const params: SearchParams = { negativeTags: [] };
    await searchProducts(params);

    const findManyArgs = mockedPrismaFindMany.mock.calls[0][0];
    // where句自体が存在しない場合も許容する
    const notCondition = findManyArgs?.where?.AND?.find((c: WhereCondition) => c.NOT);

    expect(notCondition).toBeUndefined();
  });

  it('negativeTagsにundefinedが渡された場合、除外条件は追加されないべき', async () => {
    mockedPrismaFindMany.mockResolvedValue([]);

    // undefinedのケース
    await searchProducts({ negativeTags: undefined });
    const findManyArgs = mockedPrismaFindMany.mock.calls[0][0];
    const notCondition = findManyArgs?.where?.AND?.find((c: WhereCondition) => c.NOT);
    expect(notCondition).toBeUndefined();
  });

  it('negativeTagsに空文字列が含まれる場合、それらは無視されるべき', async () => {
    mockedPrismaFindMany.mockResolvedValue([]);
    const params: SearchParams = { negativeTags: ['tag1', '', '  ', 'tag2'] };
    await searchProducts(params);

    const findManyArgs = mockedPrismaFindMany.mock.calls[0][0];
    const notCondition = findManyArgs?.where?.AND?.find((c: WhereCondition) => c.NOT);

    // normalizeQueryParamが空文字列を除去するため、有効なタグのみが条件に残る
    expect(notCondition.NOT.productTags.some.tag.name.in).toEqual(['tag1', 'tag2']);
  });

  it('tagsとnegativeTagsに同じタグが含まれる場合、エラーをスローすべき', async () => {
    const params: SearchParams = { tags: ['3D', '共通'], negativeTags: ['イラスト', '共通'] };

    await expect(searchProducts(params)).rejects.toThrow(
      "検索条件エラー: タグ '共通' は検索条件と除外条件の両方に含まれています。"
    );
  });

  it('複数のタグが衝突する場合、エラーメッセージにすべての衝突タグが含まれるべき', async () => {
    const params: SearchParams = { tags: ['3D', 'キャラ'], negativeTags: ['キャラ', '3D'] };

    // 配列の順序に依存しないように、両方の可能性をチェック
    await expect(searchProducts(params)).rejects.toThrow(
      /検索条件エラー: タグ '(3D, キャラ|キャラ, 3D)' は検索条件と除外条件の両方に含まれています。/
    );
  });
});