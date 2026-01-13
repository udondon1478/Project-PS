'use client';

import { useState, useCallback } from "react";
import TagList from "@/components/admin/TagList";
import TagEditModal from "@/components/admin/TagEditModal";
import AdminLayout from "@/components/admin/AdminLayout";
import { TagWithCategory } from "@/types/tag";

const AdminPageContent = () => {
  const [editingTag, setEditingTag] = useState<TagWithCategory | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // TagListをリフレッシュするためのキー

  // TagListから編集ボタンがクリックされたときに呼ばれるハンドラ
  const handleEditClick = useCallback((tag: TagWithCategory) => {
    setEditingTag(tag);
    setIsEditModalOpen(true);
  }, []);

  // 編集モーダルでの更新が成功したときに呼ばれるハンドラ
  const handleEditSuccess = useCallback(() => {
    setRefreshKey(prev => prev + 1); // TagListをリフレッシュ
  }, []);

  // モーダルの開閉状態が変わったときに呼ばれるハンドラ
  const handleModalOpenChange = useCallback((open: boolean) => {
    setIsEditModalOpen(open);
    if (!open) {
      setEditingTag(null);
    }
  }, []);

  return (
    <AdminLayout>
      {/* タグ一覧セクション - フル幅 */}
      <div className="w-full">
        <TagList
          key={refreshKey}
          onEditClick={handleEditClick}
        />
      </div>

      {/* タグ編集モーダル */}
      <TagEditModal
        tag={editingTag}
        open={isEditModalOpen}
        onOpenChange={handleModalOpenChange}
        onSuccess={handleEditSuccess}
      />
    </AdminLayout>
  );
};

export default AdminPageContent;
