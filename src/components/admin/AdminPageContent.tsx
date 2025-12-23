'use client';

import { useState } from "react";
import { Tag } from "@prisma/client";
import TagList from "@/components/admin/TagList";
import TagForm from "@/components/admin/TagForm";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportList from "@/components/admin/ReportList";

const AdminPageContent = () => {
  const [editingTag, setEditingTag] = useState<Tag | undefined>(undefined); // 編集中のタグを保持するstate

  // TagListから編集ボタンがクリックされたときに呼ばれるハンドラ
  const handleEditClick = (tag: Tag) => {
    setEditingTag(tag);
  };

  // TagFormで作成または更新が成功したときに呼ばれるハンドラ
  const handleFormSuccess = () => {
    setEditingTag(undefined); // フォームを閉じる（新規作成モードに戻る）
    // TODO: TagListをリフレッシュするロジックを追加 (SWRなどを使うと容易)
    // 現時点ではページ全体のリロードや、TagListコンポーネントにリフレッシュ関数を渡すなどの方法が必要
    // シンプルにするため、ここでは編集モードを解除するのみ
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">管理者画面</h1>

      <Tabs defaultValue="tags" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tags">タグ管理</TabsTrigger>
          <TabsTrigger value="reports" data-testid="admin-reports-tab">通報管理</TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* タグ一覧セクション */}
            <div>
              <TagList onEditClick={handleEditClick} /> {/* 編集ボタンクリックハンドラを渡す */}
            </div>

            {/* タグ追加・編集フォームセクション */}
            <div>
              <h2 className="text-2xl font-bold mb-4">{editingTag ? 'タグ編集' : '新しいタグを作成'}</h2>
              <TagForm initialData={editingTag} onSuccess={handleFormSuccess} /> {/* 編集中のタグと成功時のハンドラを渡す */}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <ReportList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPageContent;