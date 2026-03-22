import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import TagImplicationManager from "@/components/admin/TagImplicationManager";

const TagImplicationsPage = async () => {
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect("/");
  }

  return (
    <AdminLayout>
      <TagImplicationManager />
    </AdminLayout>
  );
};

export default TagImplicationsPage;
