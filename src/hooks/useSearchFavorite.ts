import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  saveSearchFavorite as saveFavoriteApi,
  getSearchFavorites as getFavoritesApi,
  deleteSearchFavorite as deleteFavoriteApi,
  renameSearchFavorite as renameFavoriteApi,
} from '@/app/actions/search-favorite';

// お気に入り検索アイテムの型定義
export interface SearchFavoriteItem {
  id: string;
  name: string;
  query: Record<string, any>;
  createdAt: string;
}

export function useSearchFavorite() {
  const { data: session, status } = useSession();
  const [favorites, setFavorites] = useState<SearchFavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // お気に入りの読み込み
  useEffect(() => {
    const loadFavorites = async () => {
      if (status === 'authenticated') {
        setIsLoading(true);
        try {
          const result = await getFavoritesApi();
          if (result.success && result.data) {
            const formattedFavorites: SearchFavoriteItem[] = result.data.map(item => ({
              id: item.id,
              name: item.name,
              query: item.query as Record<string, any>,
              createdAt: typeof item.createdAt === 'string'
                ? item.createdAt
                : item.createdAt.toISOString(),
            }));
            setFavorites(formattedFavorites);
          }
        } catch (error) {
          console.error('Failed to load favorites:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setFavorites([]);
        setIsLoading(false);
      }
    };

    if (status !== 'loading') {
      loadFavorites();
    }
  }, [status]);

  // お気に入りの追加
  const addFavorite = useCallback(async (name: string, query: Record<string, any>) => {
    if (status !== 'authenticated') return { success: false, error: 'Unauthorized' };

    try {
      const result = await saveFavoriteApi(name, query);
      if (result.success && result.data) {
        // 成功したら一覧を再取得するか、ローカルステートを更新する
        // ここでは簡易的にサーバーから返ってきたデータで更新（または再取得）
        // 追加の場合は再取得が確実だが、パフォーマンスのためにローカル更新を検討
        // 一旦リストの先頭に追加してソートなどはサーバー依存とするため、リロード推奨だが
        // ここではローカルステートに追加
        const newItem: SearchFavoriteItem = {
          id: result.data.id,
          name: result.data.name,
          query: result.data.query as Record<string, any>,
          createdAt: new Date().toISOString(), // サーバーの時間と少しずれる可能性あり
        };

        setFavorites(prev => {
          // 同名がある場合は更新（idチェック）
          const existingIndex = prev.findIndex(f => f.id === newItem.id);
          if (existingIndex >= 0) {
            const newFavorites = [...prev];
            newFavorites[existingIndex] = newItem;
            return newFavorites;
          }
          return [newItem, ...prev];
        });

        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Failed to add favorite:', error);
      return { success: false, error: 'Failed to add favorite' };
    }
  }, [status]);

  // お気に入りの削除
  const removeFavorite = useCallback(async (id: string) => {
    if (status !== 'authenticated') return;

    try {
      // 楽観的更新
      setFavorites(prev => prev.filter(item => item.id !== id));

      const result = await deleteFavoriteApi(id);
      if (!result.success) {
        // 失敗したら戻すなどの処理が必要だが、ここではエラーログのみ
        console.error('Failed to delete favorite on server');
        // 必要ならリロード処理を入れる
      }
    } catch (error) {
      console.error('Failed to delete favorite:', error);
    }
  }, [status]);

  // お気に入りの名前変更
  const renameFavorite = useCallback(async (id: string, newName: string) => {
    if (status !== 'authenticated') return { success: false, error: 'Unauthorized' };

    try {
      const result = await renameFavoriteApi(id, newName);
      if (result.success) {
        setFavorites(prev => prev.map(item =>
          item.id === id ? { ...item, name: newName } : item
        ));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      console.error('Failed to rename favorite:', error);
      return { success: false, error: 'Failed to rename favorite' };
    }
  }, [status]);

  // クエリからデフォルト名を生成するヘルパー
  const generateDefaultName = useCallback((query: Record<string, any>) => {
    const parts = [];
    if (query.keyword) parts.push(query.keyword);

    // タグ情報の抽出（実装依存：queryの構造に合わせて調整が必要）
    // 例: tags: [{id: '...', name: '...'}, ...] のような構造を想定
    // または単純な tag: 'name' など
    // ここでは一般的な構造を想定して実装
    if (query.tags && Array.isArray(query.tags)) {
      query.tags.forEach((tag: any) => {
        if (typeof tag === 'string') parts.push(tag);
        else if (tag.name) parts.push(tag.name);
      });
    }

    if (parts.length === 0) return '無題の検索条件';
    return parts.join(' + ').substring(0, 30); // 長すぎる場合は切り詰め
  }, []);

  return {
    favorites,
    isLoading,
    addFavorite,
    removeFavorite,
    renameFavorite,
    generateDefaultName
  };
}
