'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { Prisma } from '@prisma/client';

const MAX_HISTORY_COUNT = 50;

/**
 * 検索履歴を保存します
 * 重複がある場合は日時を更新します
 */
export async function saveSearchHistory(params: Record<string, any>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = session.user.id;

    // PrismaのJson型として扱うためにキャスト
    const queryJson = params as Prisma.InputJsonValue;

    // トランザクションで実行
    await prisma.$transaction(async (tx) => {
      // 1. 既存の同じクエリがあるか確認
      // JSON型の完全一致検索はデータベース依存度が高いため、
      // アプリケーション側で重複排除ロジックを組むか、
      // ここでは簡易的に「全く同じJSON」を検索するのは難しいので
      // クエリ内容のハッシュ値を保存するなどの対策が本来は望ましいが、
      // 今回は一旦「最新50件を取得して比較」する方針で実装します。

      const recentHistories = await tx.searchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: MAX_HISTORY_COUNT,
      });

      // キーをソートして比較するヘルパー関数
      const normalizeForComparison = (obj: any): string => {
        if (obj === null || typeof obj !== 'object') {
          return JSON.stringify(obj);
        }
        if (Array.isArray(obj)) {
          return '[' + obj.map(item => normalizeForComparison(item)).join(',') + ']';
        }
        const keys = Object.keys(obj).sort();
        const parts = keys.map(key => JSON.stringify(key) + ':' + normalizeForComparison(obj[key]));
        return '{' + parts.join(',') + '}';
      };

      const existingHistory = recentHistories.find((h) =>
        normalizeForComparison(h.query) === normalizeForComparison(params)
      );

      if (existingHistory) {
        // 重複があれば日時を更新
        await tx.searchHistory.update({
          where: { id: existingHistory.id },
          data: { createdAt: new Date() }, // updatedAtがあればそちらだが、スキーマ上はcreatedAt/updatedAt両方ある
        });
      } else {
        // 新規作成
        await tx.searchHistory.create({
          data: {
            userId,
            query: queryJson,
          },
        });

        // 件数制限チェック（保存後に50件を超えていたら古いものを削除）
        // findManyは既に実行済みだが、createした分増えている可能性があるため
        // 全件カウントするか、簡易的に先ほどのリスト長 + 1 で判定

        // 正確を期すため、全件数をチェックして削除
        const count = await tx.searchHistory.count({
          where: { userId },
        });

        if (count > MAX_HISTORY_COUNT) {
          const deleteCount = count - MAX_HISTORY_COUNT;
          const oldHistories = await tx.searchHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            take: deleteCount,
            select: { id: true },
          });

          if (oldHistories.length > 0) {
            await tx.searchHistory.deleteMany({
              where: {
                id: { in: oldHistories.map(h => h.id) },
              },
            });
          }
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save search history:', error);
    return { success: false, error: 'Failed to save search history' };
  }
}

/**
 * 検索履歴を取得します
 */
export async function getSearchHistory() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const histories = await prisma.searchHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: MAX_HISTORY_COUNT,
    });

    return { success: true, data: histories };
  } catch (error) {
    console.error('Failed to fetch search history:', error);
    return { success: false, error: 'Failed to fetch search history' };
  }
}

/**
 * 指定された検索履歴を削除します
 */
export async function deleteSearchHistory(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await prisma.searchHistory.deleteMany({
      where: {
        id,
        userId: session.user.id, // 所有者チェック
      },
    });

    if (result.count === 0) {
      return { success: false, error: 'Failed to delete search history' };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to delete search history:', error);
    return { success: false, error: 'Failed to delete search history' };
  }
}

/**
 * 全ての検索履歴を削除します
 */
export async function clearSearchHistory() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.searchHistory.deleteMany({
      where: { userId: session.user.id },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to clear search history:', error);
    return { success: false, error: 'Failed to clear search history' };
  }
}

/**
 * ローカルストレージの履歴を同期します
 */
export async function syncLocalHistory(localHistories: Record<string, any>[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // 順次保存（saveSearchHistoryのロジックを再利用するとN+1になるが、
    // 同期は頻繁に行われないため許容、あるいはバルク処理を実装）
    // ここでは実装の単純化のためループで処理しますが、
    // saveSearchHistory内でトランザクションを張っているため、
    // 並列実行するとデッドロックのリスクがあるかもしれない点に注意。
    // 直列で実行します。

    let successCount = 0;
    let failCount = 0;

    for (const params of localHistories) {
      const result = await saveSearchHistory(params);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (failCount > 0) {
      console.warn(`Sync completed with errors: ${successCount} succeeded, ${failCount} failed`);
      return { success: failCount === 0, count: successCount, failCount };
    }

    return { success: true, count: successCount, failCount };
  } catch (error) {
    console.error('Failed to sync local history:', error);
    return { success: false, error: 'Failed to sync local history' };
  }
}
