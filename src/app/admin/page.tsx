// src/app/admin/page.tsx
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminPageContent from "@/components/admin/AdminPageContent";

// AdminPageはサーバーコンポーネントとして管理者判定を行う
const AdminPage = async () => {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    // 管理者でなければホームページにリダイレクト、または403エラーページを表示
    redirect("/"); // サーバーサイドでのリダイレクト
  }

  // 管理者の場合はクライアントコンポーネントであるAdminPageContentをレンダリング
  return <AdminPageContent />;
};

export default AdminPage;