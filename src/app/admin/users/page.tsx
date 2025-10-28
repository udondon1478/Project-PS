// src/app/admin/users/page.tsx
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserManagement from "@/components/admin/UserManagement";

// このルートは常に動的評価(セッション依存)させる
export const dynamic = "force-dynamic";

const AdminUsersPage = async () => {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect("/");
  }

  return <UserManagement />;
};

export default AdminUsersPage;
