import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import ScraperDashboard from "@/components/admin/ScraperDashboard";
import AdminLayout from "@/components/admin/AdminLayout";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function BoothScraperAdminPage() {
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) redirect("/");

  try {
    // Fetch recent runs
    const runs = await prisma.scraperRun.findMany({
      take: 10,
      orderBy: { startTime: 'desc' },
    });

    // Explicitly serialize Date fields and metadata for passing to Client Component
    // Manually map fields to avoid any serialization issues with spread operator or hidden properties
    const recentRuns = runs.map(r => {
      // Safely handle metadata serialization
      let safeMetadata = null;
      if (r.metadata && typeof r.metadata === 'object') {
        try {
          // Ensure it's a plain object and JSON serializable
          safeMetadata = JSON.parse(JSON.stringify(r.metadata));
        } catch (e) {
          console.error(`Failed to serialize metadata for run ${r.id}`, e);
          safeMetadata = { error: 'Serialization failed' };
        }
      }

      return {
        id: r.id,
        runId: r.runId,
        status: r.status,
        productsFound: r.productsFound,
        productsCreated: r.productsCreated,
        errors: r.errors,
        lastProcessedPage: r.lastProcessedPage,
        processedPages: r.processedPages,
        failedUrls: r.failedUrls,
        skipRequested: r.skipRequested,
        startTime: r.startTime.toISOString(),
        endTime: r.endTime ? r.endTime.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        metadata: safeMetadata as { target?: string; mode?: string; [key: string]: unknown } | null,
      };
    });

    return (
      <AdminLayout>
        <ScraperDashboard recentRuns={recentRuns} />
      </AdminLayout>
    );
  } catch (error) {
    console.error('Error in BoothScraperAdminPage:', error);

    // Fallback UI in case of error
    return (
      <AdminLayout>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-bold text-red-800 mb-2">データの読み込み中にエラーが発生しました</h2>
          <p className="text-red-600 mb-4">スクレイパーの実行履歴を取得できませんでした。</p>
          <div className="bg-white p-4 rounded border border-red-100 overflow-auto">
            <pre className="text-xs text-red-500 font-mono">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </div>
        </div>
      </AdminLayout>
    );
  }
}

