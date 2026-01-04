// src/app/admin/reports/page.tsx
import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportList from "@/components/admin/ReportList";

const AdminReportsPage = async () => {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect("/");
  }

  return (
    <AdminLayout>
      <ReportList />
    </AdminLayout>
  );
};

export default AdminReportsPage;
