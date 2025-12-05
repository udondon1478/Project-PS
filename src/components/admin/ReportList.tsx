"use client";

import { useEffect, useState } from "react";
import { ReportStatus } from "@/lib/constants";
import { ReportWithDetails } from "@/types/report";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, AlertCircle, RefreshCcw } from "lucide-react";

const getLocalizedErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  
  if (message.includes("Failed to fetch reports")) {
    return "レポートの取得に失敗しました";
  }
  if (message.includes("Failed to update status")) {
    return "ステータスの更新に失敗しました";
  }
  
  return "予期せぬエラーが発生しました";
};

export default function ReportList() {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFatalError, setIsFatalError] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    setIsFatalError(false);
    try {
      const response = await fetch("/api/admin/reports");
      if (!response.ok) {
        const err = new Error("Failed to fetch reports");
        (err as any).isFatal = true;
        throw err;
      }
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      const userMessage = getLocalizedErrorMessage(error);
      setError(userMessage);
      
      // Fatal if explicitly marked or if we have no data to show
      const isFatal = error.isFatal || reports.length === 0;
      setIsFatalError(isFatal);

      if (!isFatal) {
        toast.error(userMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusChange = async (id: string, status: ReportStatus) => {
    setUpdatingId(id);
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
      const userMessage = getLocalizedErrorMessage(error);
      toast.error(userMessage);
    } finally {
      setUpdatingId(null);
    }
  };

  if (isFatalError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={fetchReports} variant="outline">
          再試行
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">通報一覧</h2>
      
      {error && !isFatalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchReports} 
              className="ml-2 bg-background hover:bg-accent"
            >
              <RefreshCcw className="mr-2 h-3 w-3" />
              再試行
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Table aria-busy={loading} aria-label={loading ? "Loading reports" : undefined}>
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
          {loading && reports.length === 0 ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell>
                  <div className="h-4 w-32 bg-muted/50 animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-muted/50 animate-pulse rounded" />
                    <div className="h-3 w-24 bg-muted/50 animate-pulse rounded" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-48 bg-muted/50 animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-muted/50 animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted/50 animate-pulse rounded" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-5 w-16 bg-muted/50 animate-pulse rounded-full" />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <div className="h-8 w-16 bg-muted/50 animate-pulse rounded" />
                    <div className="h-8 w-16 bg-muted/50 animate-pulse rounded" />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground" role="status" aria-live="polite">
                通報はありません
              </TableCell>
            </TableRow>
          ) : (
            reports.map((report) => (
              <TableRow key={report.id} className={loading ? "opacity-50 pointer-events-none" : ""}>
                <TableCell>{new Date(report.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <div className="font-medium">
                    {report.targetUrl ? (
                      <a
                        href={report.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                        data-testid="report-link"
                        aria-label={`${report.targetName || "Unknown"} (新しいタブで開く)`}
                      >
                        {report.targetName || "Unknown"}
                        <span className="text-xs" aria-hidden="true">↗</span>
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
                <TableCell className="max-w-[200px] truncate" title={report.reason} data-testid="report-reason">
                  {report.reason}
                </TableCell>
                <TableCell>
                  {report.reporter.name || "Unknown"}
                  {report.reporter.email && (
                    <div className="text-xs text-muted-foreground">
                      {report.reporter.email}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    data-testid="report-status-badge"
                    variant={
                      report.status === "PENDING"
                        ? "destructive"
                        : report.status === "RESOLVED"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {report.status === "PENDING"
                      ? "保留中"
                      : report.status === "RESOLVED"
                      ? "解決済み"
                      : "無視"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {report.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          data-testid="report-resolve-button"
                          onClick={() => handleStatusChange(report.id, "RESOLVED")}
                          disabled={updatingId === report.id}
                        >
                          {updatingId === report.id && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          解決
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid="ignore-button"
                          onClick={() => handleStatusChange(report.id, "IGNORED")}
                          disabled={updatingId === report.id}
                        >
                          {updatingId === report.id && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
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
