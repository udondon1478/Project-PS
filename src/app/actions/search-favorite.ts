'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { Prisma } from '@prisma/client';

const MAX_FAVORITE_COUNT = 15;

/**
 * お気に入り検索を保存します
 */
export async function saveSearchFavorite(name: string, query: Record<string, any>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'ログインが必要です' };
    }

    const userId = session.user.id;
    const queryJson = query as Prisma.InputJsonValue;

    // 名前が空でないかチェック
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: '名前を入力してください' };
    }

    // トランザクションで実行
    const result = await prisma.$transaction(async (tx) => {
      // 同一ユーザーの同時保存を直列化
      await tx.$executeRaw`SELECT 1 FROM "User" WHERE id = ${userId} FOR UPDATE`;

      // 同じ名前のお気に入りが既に存在するか確認
      const existingFavorite = await tx.searchFavorite.findUnique({
        where: {
          userId_name: {
            userId,
            name: trimmedName,
          },
        },
      });

      if (existingFavorite) {
        // 存在する場合は上書き更新 (件数チェック不要)
        return await tx.searchFavorite.update({
          where: { id: existingFavorite.id },
          data: {
            query: queryJson,
            updatedAt: new Date(),
          },
        });
      } else {
        // 新規作成: 件数上限チェック
        const count = await tx.searchFavorite.count({
          where: { userId },
        });

        if (count >= MAX_FAVORITE_COUNT) {
          throw new Error(`LIMIT_EXCEEDED`);
        }

        return await tx.searchFavorite.create({
          data: {
            userId,
            name: trimmedName,
            query: queryJson,
          },
        });
      }
    });

    return { success: true, data: result };
  } catch (error: any) {
    if (error.message === 'LIMIT_EXCEEDED') {
      return { success: false, error: `お気に入りの登録上限（${MAX_FAVORITE_COUNT}件）に達しています。不要な項目を削除してください。` };
    }
    console.error('Failed to save search favorite:', error);
    return { success: false, error: 'お気に入りの保存に失敗しました' };
  }
}

/**
 * お気に入り検索一覧を取得します
 */
export async function getSearchFavorites() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'ログインが必要です' };
    }

    const favorites = await prisma.searchFavorite.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: favorites };
  } catch (error) {
    console.error('Failed to fetch search favorites:', error);
    return { success: false, error: 'お気に入り一覧の取得に失敗しました' };
  }
}

/**
 * 指定されたお気に入り検索を削除します
 */
export async function deleteSearchFavorite(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'ログインが必要です' };
    }

    const result = await prisma.searchFavorite.deleteMany({
      where: {
        id,
        userId: session.user.id, // 所有者チェック
      },
    });

    if (result.count === 0) {
      return { success: false, error: 'お気に入りが見つかりませんでした' };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to delete search favorite:', error);
    return { success: false, error: 'お気に入りの削除に失敗しました' };
  }
}

/**
 * お気に入り検索の名前を変更します
 */
export async function renameSearchFavorite(id: string, newName: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'ログインが必要です' };
    }

    const trimmedName = newName.trim();
    if (!trimmedName) {
      return { success: false, error: '名前を入力してください' };
    }

    // 名前が重複していないかチェック（自分自身の更新は除く）
    // PrismaのupdateでUnique制約エラーをキャッチしても良いが、
    // 事前にチェックして分かりやすいエラーを返す
    const existingWithName = await prisma.searchFavorite.findUnique({
      where: {
        userId_name: {
          userId: session.user.id,
          name: trimmedName,
        },
      },
    });

    if (existingWithName && existingWithName.id !== id) {
      return { success: false, error: 'この名前は既に使用されています' };
    }

    const result = await prisma.searchFavorite.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        name: trimmedName,
      },
    });

    if (result.count === 0) {
      return { success: false, error: 'お気に入りが見つかりませんでした' };
    }

    return { success: true };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'この名前は既に使用されています' };
    }
    console.error('Failed to rename search favorite:', error);
    return { success: false, error: '名前の変更に失敗しました' };
  }
}
