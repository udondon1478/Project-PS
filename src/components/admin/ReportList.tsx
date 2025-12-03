"use client";

import { useEffect, useState } from "react";
import { Report, ReportStatus } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ReportWithDetails = Report & {
  reporter: {
    name: string | null;
    email: string | null;
  };
  targetName?: string;
  targetContext?: string;
  targetUrl?: string;
};

export default function ReportList() {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/reports");
      if (!response.ok) throw new Error("Failed to fetch reports");
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("通報一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusChange = async (id: string, status: ReportStatus) => {
    try {
      const response = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast.success("ステータスを更新しました");
      fetchReports();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("ステータスの更新に失敗しました");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">通報一覧</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日時</TableHead>
            <TableHead>対象</TableHead>
            <TableHead>理由</TableHead>
            <TableHead>通報者</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground" role="status" aria-live="polite">
                通報はありません
              </TableCell>
            </TableRow>
          ) : (
            reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell>{new Date(report.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <div className="font-medium">
                    {report.targetUrl ? (
                      <a
                        href={report.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {report.targetName || "Unknown"}
                        <span className="text-xs">↗</span>
                      </a>
                    ) : (
                      report.targetName || "Unknown"
                    )}
                  </div>
                  {report.targetContext && (
                    <div className="text-xs text-muted-foreground">
                      on {report.targetContext}
                    </div>
                  )}
                  <Badge variant="outline" className="mt-1">{report.targetType}</Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={report.reason}>
                  {report.reason}
                </TableCell>
                <TableCell>
                  {report.reporter.name || "Unknown"}
                  <div className="text-xs text-muted-foreground">
                    {report.reporter.email}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      report.status === "PENDING"
                        ? "destructive"
                        : report.status === "RESOLVED"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {report.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {report.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(report.id, "RESOLVED")}
                        >
                          解決
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(report.id, "IGNORED")}
                        >
                          無視
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
