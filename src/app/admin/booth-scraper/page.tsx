import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import ScraperDashboard from "@/components/admin/ScraperDashboard";
import AdminLayout from "@/components/admin/AdminLayout";
import { prisma } from "@/lib/prisma";

export default async function BoothScraperAdminPage() {
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) redirect("/");

  // Fetch recent runs
  const runs = await prisma.scraperRun.findMany({
    take: 10,
    orderBy: { startTime: 'desc' },
  });

  // Explicitly serialize Date fields and metadata for passing to Client Component
  const recentRuns = runs.map(r => ({
    ...r,
    startTime: r.startTime.toISOString(),
    endTime: r.endTime?.toISOString(),
    metadata: r.metadata as { target?: string; mode?: string; [key: string]: unknown } | null,
  }));

  return (
    <AdminLayout>
      <ScraperDashboard recentRuns={recentRuns} />
    </AdminLayout>
  );
}
