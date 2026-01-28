import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import AvatarItemManager from "@/components/admin/AvatarItemManager";

export const metadata = {
  title: 'アバター管理 | Admin',
};

export default async function AvatarAdminPage() {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">アバター自動タグ付け管理</h1>
        <p className="text-gray-600 mt-2">
          BOOTH商品IDに基づいて自動付与されるタグの定義を管理します。
        </p>
      </div>
      <AvatarItemManager />
    </div>
  );
}
