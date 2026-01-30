'use client';

import { useState, useEffect } from 'react';
import {
  getAvatarItems,
  createAvatarItem,
  updateAvatarItem,
  deleteAvatarItem,
  rescanProductsForAvatar
} from '@/app/actions/avatar-items';
import { Loader2, Plus, Trash2, Edit2, RefreshCw, AlertCircle } from 'lucide-react';

interface AvatarItem {
  id: string;
  itemId: string;
  avatarName: string;
  itemUrl?: string | null;
  aliases: string[];
  suggestedTags: string[];
  createdAt: Date;
}

interface AvatarItemManagerProps {
  isAdmin: boolean;
}

export default function AvatarItemManager({ isAdmin }: AvatarItemManagerProps) {
  const [items, setItems] = useState<AvatarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    itemId: '',
    avatarName: '',
    itemUrl: '',
    aliases: '',
    suggestedTags: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Action states
  const [rescanStatus, setRescanStatus] = useState<{ id: string, loading: boolean, message?: string } | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAvatarItems();
      if (result.success && result.data) {
        setItems(result.data);
      } else {
        setError(result.error || 'Failed to fetch items');
      }
    } catch (err) {
      setError('Failed to fetch items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, itemUrl: url }));

    // Attempt to extract ID from BOOTH URL
    // Format: https://booth.pm/ja/items/5058077
    const match = url.match(/items\/(\d+)/);
    if (match && match[1]) {
      setFormData(prev => ({ ...prev, itemUrl: url, itemId: match[1] }));
    }
  };

  // アバター名が変更されたら、提案タグのデフォルト値をセット（新規登録時のみ、かつ空の場合または自動生成値のままの場合）
  const handleAvatarNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData(prev => {
      const oldName = prev.avatarName;
      let newTags = prev.suggestedTags;

      // 新規登録モードの時のみ自動補完を行う
      if (!editingId) {
        // 直前の状態が「空」または「以前のアバター名に基づくデフォルト値」であれば更新する
        const oldDefault = oldName ? `${oldName}, ${oldName}対応` : '';

        if (!newTags || newTags === oldDefault) {
          newTags = newName ? `${newName}, ${newName}対応` : '';
        }
      }

      return { ...prev, avatarName: newName, suggestedTags: newTags };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId || !formData.avatarName) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const submissionData = {
        ...formData,
        aliases: formData.aliases ? formData.aliases.split(',').map(s => s.trim()).filter(Boolean) : [],
        suggestedTags: formData.suggestedTags ? formData.suggestedTags.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      if (editingId) {
        const result = await updateAvatarItem(editingId, submissionData);
        if (result.success) {
          setItems(prev => prev.map(item => item.id === editingId ? result.data : item) as AvatarItem[]);
          resetForm();
        } else {
          setError(result.error || 'Failed to update item');
        }
      } else {
        const result = await createAvatarItem(submissionData);
        if (result.success) {
          setItems(prev => [result.data as AvatarItem, ...prev]);
          resetForm();
        } else {
          setError(result.error || 'Failed to create item');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: AvatarItem) => {
    setEditingId(item.id);
    setFormData({
      itemId: item.itemId,
      avatarName: item.avatarName,
      itemUrl: item.itemUrl || '',
      aliases: item.aliases ? item.aliases.join(', ') : '',
      suggestedTags: item.suggestedTags ? item.suggestedTags.join(', ') : '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;

    try {
      const result = await deleteAvatarItem(id);
      if (result.success) {
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        alert('削除に失敗しました');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('削除に失敗しました');
    }
  };

  const handleRescan = async (id: string, name: string) => {
    if (!isAdmin) {
      alert('権限がありません');
      return;
    }
    if (!confirm(`${name} の定義に基づいて既存商品を再スキャンしますか？\nこの処理には時間がかかる場合があります。`)) return;

    setRescanStatus({ id, loading: true });
    try {
      const result = await rescanProductsForAvatar(id);
      if (result.success) {
        setRescanStatus({ id, loading: false, message: `完了: ${result.count}件の商品を更新しました` });
        // Clear message after 5 seconds
        setTimeout(() => setRescanStatus(null), 5000);
      } else {
        setRescanStatus({ id, loading: false, message: `エラー: ${result.error}` });
      }
    } catch (err) {
      setRescanStatus({ id, loading: false, message: '予期せぬエラーが発生しました' });
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({ itemId: '', avatarName: '', itemUrl: '', aliases: '' });
    setEditingId(null);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-gray-500" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Registration Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          {editingId ? <Edit2 className="mr-2 h-5 w-5" /> : <Plus className="mr-2 h-5 w-5" />}
          {editingId ? 'アバター定義を編集' : '新規アバター定義を追加'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="itemUrl" className="block text-sm font-medium text-gray-700 mb-1">
                BOOTH 商品URL (任意・ID抽出用)
              </label>
              <input
                id="itemUrl"
                type="text"
                value={formData.itemUrl}
                onChange={handleUrlChange}
                placeholder="https://booth.pm/ja/items/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="itemId" className="block text-sm font-medium text-gray-700 mb-1">
                  商品ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="itemId"
                  type="text"
                  value={formData.itemId}
                  onChange={(e) => setFormData(prev => ({ ...prev, itemId: e.target.value }))}
                  placeholder="5058077"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="avatarName" className="block text-sm font-medium text-gray-700 mb-1">
                  アバター名 <span className="text-red-500">*</span>
                </label>
                <input
                  id="avatarName"
                  type="text"
                  value={formData.avatarName}
                  onChange={handleAvatarNameChange}
                  placeholder="マヌカ"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="aliases" className="block text-sm font-medium text-gray-700 mb-1">
                エイリアス (カンマ区切り)
              </label>
              <input
                id="aliases"
                type="text"
                value={formData.aliases}
                onChange={(e) => setFormData(prev => ({ ...prev, aliases: e.target.value }))}
                placeholder="Manuka, manuka, ﾏﾇｶ"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                商品ID、アバター名に加えて、これらのキーワードが説明文に含まれる場合も自動タグ付けの対象となります。
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="suggestedTags" className="block text-sm font-medium text-gray-700 mb-1">
              自動付与・提案するタグ (カンマ区切り) <span className="text-red-500">*</span>
            </label>
            <input
              id="suggestedTags"
              type="text"
              value={formData.suggestedTags}
              onChange={(e) => setFormData(prev => ({ ...prev, suggestedTags: e.target.value }))}
              placeholder="マヌカ, マヌカ対応"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              アバターが検知された際に、自動的に付与または提案されるタグのリストです。デフォルトでは「アバター名, アバター名対応」が推奨されます。
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              {editingId ? '更新する' : '登録する'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-medium text-gray-900">登録済みアバター一覧 ({items.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アバター名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">自動タグ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    登録されているアバター定義はありません
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.avatarName}</div>
                      {item.itemUrl && (
                        <a href={item.itemUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                          BOOTHを見る ↗
                        </a>
                      )}
                      {item.aliases && item.aliases.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.aliases.map((alias, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {alias}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {item.itemId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.suggestedTags && item.suggestedTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.suggestedTags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">デフォルト設定を使用</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Rescan Button */}
                        <div className="relative">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRescan(item.id, item.avatarName)}
                              disabled={rescanStatus?.id === item.id && rescanStatus.loading}
                              className="text-orange-600 hover:text-orange-900 p-1 disabled:opacity-50"
                              title="既存商品を再スキャン"
                            >
                              {rescanStatus?.id === item.id && rescanStatus.loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-5 w-5" />
                              )}
                            </button>
                          )}
                          {rescanStatus?.id === item.id && rescanStatus.message && (
                            <div className="absolute right-0 top-8 z-10 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg">
                              {rescanStatus.message}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="編集"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="削除"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
