import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import ScraperDashboard from "@/components/admin/ScraperDashboard";
import { prisma } from "@/lib/prisma";

export default async function BoothScraperAdminPage() {
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) redirect("/");

  // Fetch recent runs
  const runs = await prisma.scraperRun.findMany({
    take: 10,
    orderBy: { startTime: 'desc' },
  });

  // Explicitly serialize Date fields to strings for passing to Client Component
  const recentRuns = runs.map(r => ({
    ...r,
    startTime: r.startTime.toISOString(),
    endTime: r.endTime?.toISOString()
  }));

  return (
    <div className="container mx-auto p-4 pt-20">
      <h1 className="text-2xl font-bold mb-4">BOOTH Scraper Control</h1>
      <ScraperDashboard recentRuns={recentRuns} />
    </div>
  );
}
