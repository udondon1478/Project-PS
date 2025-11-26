import { LRUCache } from 'lru-cache';

// ユーザーごとのリクエストタイムスタンプを保存するキャッシュ
// キー: ユーザーID, 値: タイムスタンプの配列
const rateLimitCache = new LRUCache<string, number[]>({
    max: 500, // 同時に追跡する最大ユーザー数
    ttl: 60 * 1000, // 1分間 (TTLは各エントリの有効期限ですが、ここでは配列自体を更新するため、あくまで目安)
});

/**
 * レート制限をチェックする関数
 * @param userId ユーザーID
 * @param limit 制限回数 (デフォルト: 5回)
 * @param windowMs 時間枠 (ミリ秒) (デフォルト: 1分)
 * @returns true: 制限超過, false: 許可
 */
export async function rateLimit(userId: string, limit: number = 5, windowMs: number = 60000): Promise<boolean> {
    const now = Date.now();
    const timestamps = rateLimitCache.get(userId) || [];

    // 時間枠外の古いタイムスタンプを除外
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

    if (validTimestamps.length >= limit) {
        return true; // レート制限超過
    }

    // 新しいリクエストのタイムスタンプを追加
    validTimestamps.push(now);
    rateLimitCache.set(userId, validTimestamps);

    return false; // 許可
}
