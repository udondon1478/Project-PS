// src/app/admin/users/page.tsx
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserManagement from "@/components/admin/UserManagement";

// セッション依存のため常に動的レンダリング
export const dynamic = "force-dynamic";

const AdminUsersPage = async () => {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20 md:pt-40">
      <UserManagement />
    </div>
  );
};

export default AdminUsersPage;