// src/app/admin/users/page.tsx
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserManagement from "@/components/admin/UserManagement";
import AdminLayout from "@/components/admin/AdminLayout";

// セッション依存のため常に動的レンダリング
export const dynamic = "force-dynamic";

const AdminUsersPage = async () => {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect("/");
  }

  return (
    <AdminLayout>
      <UserManagement />
    </AdminLayout>
  );
};

export default AdminUsersPage;