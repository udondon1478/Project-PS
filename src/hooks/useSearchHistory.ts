import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  saveSearchHistory as saveHistoryApi,
  getSearchHistory as getHistoryApi,
  deleteSearchHistory as deleteHistoryApi,
  clearSearchHistory as clearHistoryApi,
  syncLocalHistory
} from '@/app/actions/search-history';

// 履歴アイテムの型定義
// DBモデルに合わせていますが、クライアント側で扱いやすいように調整
export interface SearchHistoryItem {
  id: string; // DBのID、またはLocalStorage用のUUID
  query: Record<string, any>; // 検索条件
  createdAt: string; // ISO string
}

const LOCAL_STORAGE_KEY = 'polyseek_search_history';
const MAX_HISTORY_COUNT = 50;

// キーをソートして比較するヘルパー関数 (サーバー側とロジックを統一)
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

export function useSearchHistory() {
  const { data: session, status } = useSession();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 履歴の読み込み
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);

      if (status === 'authenticated') {
        // 1. ログイン時はAPIから取得
        try {
          // まずローカルストレージに未同期の履歴がないか確認
          // ※ 本来は同期フラグなどで管理すべきだが、簡易的に
          // ログイン直後にローカルストレージがあれば同期を試みる
          if (typeof window !== 'undefined') {
            const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (localData) {
              try {
                const localHistories = JSON.parse(localData);
                if (Array.isArray(localHistories) && localHistories.length > 0) {
                  // query部分だけ抽出して同期
                  const queries = localHistories.map(h => h.query);
                  const result = await syncLocalHistory(queries);
                  // 同期成功時のみローカルストレージをクリア
                  // 部分的な失敗がある場合はクリアせず、次回再試行する
                  if (result.success && result.failCount === 0) {
                    localStorage.removeItem(LOCAL_STORAGE_KEY);
                  }
                }
              } catch (e) {
                console.error('Failed to parse local history for sync:', e);
              }
            }
          }

          // DBから取得
          const result = await getHistoryApi();
          if (result.success && result.data) {
            // DBの型をクライアント用の型に変換
            const formattedHistory: SearchHistoryItem[] = result.data.map(item => ({
              id: item.id,
              query: item.query as Record<string, any>,
              createdAt: typeof item.createdAt === 'string'
                ? item.createdAt
                : item.createdAt.toISOString(),
            }));
            setHistory(formattedHistory);
          }
        } catch (error) {
          console.error('Failed to load history from server:', error);
        }
      } else if (status === 'unauthenticated') {
        // 2. 未ログイン時はLocalStorageから取得
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          try {
            setHistory(JSON.parse(localData));
          } catch (e) {
            console.error('Failed to parse local history:', e);
            setHistory([]);
          }
        } else {
          setHistory([]);
        }
      }

      setIsLoading(false);
    };

    if (status !== 'loading') {
      loadHistory();
    }
  }, [status]);

  // 履歴の追加
  const addHistory = useCallback(async (params: Record<string, any>) => {
    // 空の検索条件などは保存しない（必要に応じて条件追加）
    if (Object.keys(params).length === 0) return;

    if (status === 'authenticated') {
      // サーバーに保存
      try {
        await saveHistoryApi(params);
        // 保存後にリストを再取得して更新
        const result = await getHistoryApi();
        if (result.success && result.data) {
          const formattedHistory: SearchHistoryItem[] = result.data.map(item => ({
            id: item.id,
            query: item.query as Record<string, any>,
            createdAt: typeof item.createdAt === 'string'
              ? item.createdAt
              : item.createdAt.toISOString(),
          }));
          setHistory(formattedHistory);
        }
      } catch (error) {
        console.error('Failed to save history to server:', error);
      }
    } else {
      // ローカルストレージに保存
      setHistory(prev => {
        // 重複チェック: 同じクエリがある場合は削除して先頭に追加するための準備
        // 完全一致比較 (キーソート付き正規化文字列で比較)
        const paramsString = normalizeForComparison(params);
        const filtered = prev.filter(item => normalizeForComparison(item.query) !== paramsString);

        const newItem: SearchHistoryItem = {
          id: crypto.randomUUID(),
          query: params,
          createdAt: new Date().toISOString(),
        };

        const newHistory = [newItem, ...filtered].slice(0, MAX_HISTORY_COUNT);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
        return newHistory;
      });
    }
  }, [status]);

  // 履歴の削除
  const removeHistory = useCallback(async (id: string) => {
    if (status === 'authenticated') {
      try {
        await deleteHistoryApi(id);
        setHistory(prev => prev.filter(item => item.id !== id));
      } catch (error) {
        console.error('Failed to delete history from server:', error);
      }
    } else {
      setHistory(prev => {
        const newHistory = prev.filter(item => item.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
        return newHistory;
      });
    }
  }, [status]);

  // 全履歴の削除
  const clearHistory = useCallback(async () => {
    if (status === 'authenticated') {
      try {
        await clearHistoryApi();
        setHistory([]);
      } catch (error) {
        console.error('Failed to clear history on server:', error);
      }
    } else {
      setHistory([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [status]);

  return {
    history,
    isLoading,
    addHistory,
    removeHistory,
    clearHistory
  };
}
