import PQueue from 'p-queue';

/**
 * Booth.pmへのアクセスを制御するキュー
 * 同時実行数: 3
 * 実行間隔: 2000ms (2秒)
 * 区間内実行数: 3
 * タイムアウト: 15000ms (15秒)
 *
 * これにより、サーバー全体でBooth.pmへのアクセスが2秒に3回以下に制限されます。
 */
const QUEUE_CONFIG = {
  concurrency: 3,
  interval: 2000,
  intervalCap: 3,
  timeout: 15000, // 15秒でタイムアウト
  throwOnTimeout: true,
};

const MAX_QUEUE_SIZE = 10; // キューの最大待機数

export const createBoothQueue = (options?: any) => new PQueue({ ...QUEUE_CONFIG, ...options });

export const boothQueue = createBoothQueue();

/**
 * バックプレッシャー付きでキューにタスクを追加する
 * キューが混雑している場合は即座にエラーを返します。
 */
export async function addToBoothQueue<T>(task: () => Promise<T>, queue = boothQueue): Promise<T> {
  if (queue.size >= MAX_QUEUE_SIZE) {
    throw new Error('Queue is full');
  }
  return queue.add(task) as Promise<T>;
}
