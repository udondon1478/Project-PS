import PQueue from 'p-queue';

/**
 * Booth.pmへのアクセスを制御するキュー
 * 同時実行数: 3
 * 実行間隔: 2000ms (2秒)
 * 区間内実行数: 3
 *
 * これにより、サーバー全体でBooth.pmへのアクセスが2秒に3回以下に制限されます。
 */
const QUEUE_CONFIG = {
  concurrency: 3,
  interval: 2000,
  intervalCap: 3,
};

export const createBoothQueue = () => new PQueue(QUEUE_CONFIG);

export const boothQueue = createBoothQueue();
