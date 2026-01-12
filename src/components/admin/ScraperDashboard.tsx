'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClockIcon, TrashIcon, ListIcon, AlertTriangleIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, PlayIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RunningTaskCard, type UnifiedRunningTask } from './RunningTaskCard';

import { type ScraperRun, type ScraperLog, type ScraperStatus } from '@/lib/booth-scraper/orchestrator';

interface SerializedScraperRun extends Omit<ScraperRun, 'startTime' | 'endTime' | 'metadata'> {
  startTime: string;
  endTime?: string | null;
  metadata: {
    target?: string;
    mode?: string;
    [key: string]: unknown;
  } | null;
}

interface DashboardProps {
  recentRuns: SerializedScraperRun[];
}

export default function ScraperDashboard({ recentRuns }: DashboardProps) {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<ScraperStatus | null>(null);
  const [runningFromDb, setRunningFromDb] = useState<SerializedScraperRun[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Config Inputs for "Manual Enqueue"
  const [mode, setMode] = useState<'NEW' | 'BACKFILL'>('NEW');

  // Search Params
  const [tags, setTags] = useState<Array<{ id: string, tag: string, category: string | null, enabled: boolean }>>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  // Logger state
  const [logViewer, setLogViewer] = useState<{
    open: boolean;
    runId: string;
    logs: ScraperLog[];
    loading: boolean;
  }>({ open: false, runId: '', logs: [], loading: false });

  // Scheduler Status State (from API)
  interface SchedulerStatusType {
    lastNewRun: { startTime: string; endTime: string | null; status: string; productsCreated: number; productsFound: number } | null;
    lastBackfillRun: { startTime: string; endTime: string | null; status: string; productsCreated: number; productsFound: number } | null;
    nextNewScanAt: string;
    nextBackfillAt: string;
    activeRunsCount: number;
    staleRunsCount: number;
    staleRuns: Array<{ runId: string; startTime: string; ageMinutes: number }>;
  }

  // Scheduler Config State (For interval display only mostly)
  const [schedulerConfig, setSchedulerConfig] = useState<{
    isSchedulerEnabled: boolean;
    newScanIntervalMin: number;
    newScanPageLimit: number;
    backfillIntervalMin: number;
    backfillPageCount: number;
    backfillProductLimit: number;
    requestIntervalMs: number;
  }>({
    isSchedulerEnabled: true,
    newScanIntervalMin: 10,
    newScanPageLimit: 3,
    backfillIntervalMin: 5,
    backfillPageCount: 3,
    backfillProductLimit: 9,
    requestIntervalMs: 5000,
  });

  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatusType | null>(null);

  // Remote task logs state (for polling)
  const [remoteTaskLogs, setRemoteTaskLogs] = useState<Record<string, ScraperLog[]>>({});

  // Skipping state to prevent double clicks
  const [skippingRunIds, setSkippingRunIds] = useState<Set<string>>(new Set());

  // Unified running tasks - combines local (activeStatus) and remote (runningFromDb)
  const allRunningTasks = useMemo<UnifiedRunningTask[]>(() => {
    const tasks: UnifiedRunningTask[] = [];

    // Add local task if running
    if (activeStatus && activeStatus.status === 'running') {
      tasks.push({
        id: activeStatus.runId || 'local',
        runId: activeStatus.runId || 'local',
        source: 'local',
        targetName: activeStatus.currentTarget?.targetName || 'Unknown Target',
        mode: activeStatus.mode || 'NEW',
        status: 'RUNNING',
        startTime: activeStatus.timings?.startTime ? new Date(activeStatus.timings.startTime).toISOString() : new Date().toISOString(),
        progress: {
          pagesProcessed: activeStatus.progress.pagesProcessed,
          productsFound: activeStatus.progress.productsFound,
          productsCreated: activeStatus.progress.productsCreated,
          productsFailed: activeStatus.progress.productsFailed,
        },
        logs: activeStatus.logs,
      });
    }

    // Add remote tasks (excluding the local one if it exists)
    const localRunId = activeStatus?.runId;
    runningFromDb
      .filter(r => r.runId !== localRunId)
      .forEach(run => {
        tasks.push({
          id: run.runId,
          runId: run.runId,
          source: 'remote',
          targetName: run.metadata?.target || 'Unknown Target',
          mode: run.metadata?.mode || 'NEW',
          status: run.status,
          startTime: run.startTime,
          progress: {
            pagesProcessed: run.processedPages || 0,
            productsFound: run.productsFound,
            productsCreated: run.productsCreated,
            productsFailed: 0,
          },
          logs: remoteTaskLogs[run.runId] || [],
          skipRequested: run.skipRequested,
        });
      });

    return tasks;
  }, [activeStatus, runningFromDb, remoteTaskLogs]);

  // Fetch logs for remote tasks
  const fetchRemoteLogs = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/admin/booth-scraper/logs/${runId}?limit=10`);
      if (res.ok) {
        const logs = await res.json();
        setRemoteTaskLogs(prev => ({ ...prev, [runId]: logs }));
      }
    } catch (error) {
      console.error('Failed to fetch remote logs:', error);
    }
  }, []);

  // Poll logs for remote tasks every 2 seconds
  useEffect(() => {
    const remoteTasks = allRunningTasks.filter(t => t.source === 'remote');
    if (remoteTasks.length === 0) return;

    // Initial fetch
    remoteTasks.forEach(task => fetchRemoteLogs(task.runId));

    const interval = setInterval(() => {
      remoteTasks.forEach(task => fetchRemoteLogs(task.runId));
    }, 2000);

    return () => clearInterval(interval);
  }, [allRunningTasks, fetchRemoteLogs]);

  // Handle skip request (works for both local and remote)
  const handleSkip = async (runId: string) => {
    if (skippingRunIds.has(runId)) return;

    setSkippingRunIds(prev => {
      const next = new Set(prev);
      next.add(runId);
      return next;
    });

    try {
      let res;
      if (runId === 'local') {
         // Fallback for legacy/dev local tasks without DB ID
         res = await fetch('/api/admin/booth-scraper/scrape?skipCurrent=true', { method: 'DELETE' });
      } else {
         res = await fetch(`/api/admin/booth-scraper/scrape/${runId}/skip`, {
           method: 'POST',
         });
      }

      if (res.ok) {
        toast.info('Skip request sent. The task will stop shortly.');
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(`Failed to skip: ${err.error}`);
      }
    } catch (_) {
      toast.error('Failed to send skip request');
    } finally {
      setSkippingRunIds(prev => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    }
  };

  // Fetch Scheduler Config
  const fetchSchedulerConfig = () => {
    fetch('/api/admin/scraper-config')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.id) {
           setSchedulerConfig({
             isSchedulerEnabled: data.isSchedulerEnabled,
             newScanIntervalMin: data.newScanIntervalMin,
             newScanPageLimit: data.newScanPageLimit ?? 3,
             backfillIntervalMin: data.backfillIntervalMin,
             backfillPageCount: data.backfillPageCount ?? 3,
             backfillProductLimit: data.backfillProductLimit ?? 9,
             requestIntervalMs: data.requestIntervalMs ?? 5000,
           });
           if (data.schedulerStatus) {
             setSchedulerStatus(data.schedulerStatus);
           }
        }
      })
      .catch(e => {
        console.error('Failed to load scheduler config', e);
        toast.error(`Failed to load scheduler config: ${e?.message || e}`);
      });
  };

  useEffect(() => {
    fetchSchedulerConfig();
    // Refresh scheduler status every 30 seconds
    const interval = setInterval(fetchSchedulerConfig, 30000);
    return () => clearInterval(interval);
  }, []);

  const saveSchedulerConfig = async () => {
     try {
       const res = await fetch('/api/admin/scraper-config', {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(schedulerConfig)
       });
       if (res.ok) {
         toast.success('Scheduler settings saved');
       } else {
         const err = await res.json();
         toast.error(`Failed to save settings: ${err.error}`);
       }
     } catch(e: unknown) {
       const errorMessage = e instanceof Error ? e.message : String(e);
       console.error('Error saving scheduler settings:', e);
       toast.error(`Error saving settings: ${errorMessage}`);
     }
  };

  // Fetch logs logic
  const fetchLogs = async (runId: string) => {
    setLogViewer(prev => ({ ...prev, open: true, runId, loading: true }));
    try {
      const res = await fetch(`/api/admin/booth-scraper/logs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setLogViewer(prev => ({ ...prev, logs: data, loading: false }));
      } else {
        toast.error('Failed to fetch logs');
        setLogViewer(prev => ({ ...prev, loading: false }));
      }
    } catch (_) {
      toast.error('Error fetching logs');
      setLogViewer(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetch('/api/admin/booth-scraper/tags')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTags(data);
      })
      .catch(() => toast.error('Failed to load tags'));
  }, []);

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    try {
      const res = await fetch('/api/admin/booth-scraper/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tag: newTagInput,
          category: newCategoryInput.trim() || null,
        }),
      });
      if (res.ok) {
        const tag = await res.json();
        setTags(prev => [tag, ...prev]);
        setNewTagInput('');
        setNewCategoryInput('');
        toast.success('Tag added');
      } else {
        toast.error('Failed to add tag');
      }
    } catch (_) {
      toast.error('Failed to add tag');
    }
  };

  const handleDeleteTag = async (id: string) => {
    setConfirmDialog({
      open: true,
      title: 'タグを削除しますか？',
      description: 'この操作は取り消せません。設定から削除されます。',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/booth-scraper/tags/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setTags(prev => prev.filter(t => t.id !== id));
            toast.success('Tag deleted');
          } else {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            toast.error(`Failed to delete tag: ${err.error || 'Server error'}`);
          }
        } catch (_) {
          toast.error('Failed to delete tag');
        }
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  };

  const handleToggleTag = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/booth-scraper/tags/${id}`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !current })
      });
      if (!res.ok) return;
      setTags(prev => prev.map(t => t.id === id ? { ...t, enabled: !current } : t));
    } catch (_) {
      toast.error('Failed to toggle tag');
    }
  };

  // Poll status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/admin/booth-scraper/scrape');
        if (res.ok) {
          const data = await res.json();
          setActiveStatus(data.status);
          if (data.runningFromDb) {
            setRunningFromDb(data.runningFromDb);
          }
        }
      } catch (e) {
        console.error('Poll error', e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [router]);

  const handleEnqueue = async (tagName: string, category: string | null) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/booth-scraper/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          options: {
            // Default options, using config values roughly
            pageLimit: schedulerConfig.newScanPageLimit,
            requestInterval: schedulerConfig.requestIntervalMs,
            pagesPerRun: schedulerConfig.backfillPageCount,
            maxProducts: schedulerConfig.backfillProductLimit,
            searchParams: {
              tags: [tagName], // Use tags[] parameter for exact tag matching
              category: category || undefined, // Include category if set
              useTargetTags: false // Explicit single
            }
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(`Failed: ${err.error}`);
      } else {
        toast.success(`Enqueued: ${tagName}${category ? ` (${category})` : ''}`);
      }
    } catch (_) {
      toast.error('Error starting scraper');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAll = async () => {
    setLoading(true);
      try {
        const res = await fetch('/api/admin/booth-scraper/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            options: {
              pageLimit: schedulerConfig.newScanPageLimit,
              requestInterval: schedulerConfig.requestIntervalMs,
              pagesPerRun: schedulerConfig.backfillPageCount,
              maxProducts: schedulerConfig.backfillProductLimit,
              searchParams: {
                useTargetTags: true
              }
            }
          })
        });
        
        if (res.ok) {
            toast.success('All enabled tags enqueued');
        } else {
            const err = await res.json().catch(() => ({ error: res.statusText || 'Unknown error' }));
            toast.error(`Failed: ${err.error || 'Server error'}`);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('Error starting all:', e);
        toast.error(`Error starting all: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
  };

  const handleRemoveFromQueue = async (targetId: string) => {
      try {
          const res = await fetch(`/api/admin/booth-scraper/scrape?targetId=${targetId}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success('Removed from queue');
          } else {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            toast.error(`Failed to remove: ${err.error || 'Server error'}`);
          }
      } catch(_) {
          toast.error('Failed to remove');
      }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'running': return 'text-blue-500 font-bold';
      case 'stopping': return 'text-yellow-500 font-bold';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Helper to format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const absDiff = Math.abs(diff);
    const minutes = Math.floor(absDiff / 1000 / 60);
    const hours = Math.floor(minutes / 60);

    if (diff > 0) {
      // Future
      if (minutes < 1) return 'まもなく';
      if (minutes < 60) return `${minutes}分後`;
      return `${hours}時間${minutes % 60}分後`;
    } else {
      // Past (overdue)
      if (minutes < 1) return '実行待ち';
      if (minutes < 60) return `${minutes}分超過`;
      return `${hours}時間${minutes % 60}分超過`;
    }
  };

  const isOverdue = (dateStr: string) => new Date(dateStr).getTime() < new Date().getTime();

  return (
    <div className="space-y-8">
      {/* Warnings Section */}
      {schedulerStatus && (schedulerStatus.staleRunsCount > 0 || !schedulerConfig.isSchedulerEnabled) && (
        <div className="space-y-3">
          {/* Stale Runs Warning */}
          {schedulerStatus.staleRunsCount > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-yellow-800 dark:text-yellow-200">スタックしたジョブが検出されました</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {schedulerStatus.staleRunsCount}件のジョブが1時間以上RUNNING状態のまま残っています。
                  次回のcron実行時に自動的にFAILEDに更新されます。
                </p>
                <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                  {schedulerStatus.staleRuns.map(run => (
                    <div key={run.runId} className="font-mono">
                      {run.runId} - {run.ageMinutes}分経過
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scheduler Disabled Warning */}
          {!schedulerConfig.isSchedulerEnabled && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 flex items-start gap-3">
              <XCircleIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-orange-800 dark:text-orange-200">スケジューラーが無効です</h3>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  自動スキャンは実行されません。有効にするには下部の設定で「Scheduler Enabled」をONにしてください。
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scheduler Status Overview */}
      {schedulerStatus && schedulerConfig.isSchedulerEnabled && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-green-600" />
            スケジューラー状態
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Next NEW Scan */}
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">次回NEWスキャン</div>
              <div className={`text-lg font-bold ${isOverdue(schedulerStatus.nextNewScanAt) ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>
                {formatRelativeTime(schedulerStatus.nextNewScanAt)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                間隔: {schedulerConfig.newScanIntervalMin}分
              </div>
            </div>

            {/* Next Backfill */}
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">次回Backfill</div>
              <div className={`text-lg font-bold ${isOverdue(schedulerStatus.nextBackfillAt) ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>
                {formatRelativeTime(schedulerStatus.nextBackfillAt)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                間隔: {schedulerConfig.backfillIntervalMin}分
              </div>
            </div>

            {/* Last NEW Run Status */}
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">最後のNEWスキャン</div>
              {schedulerStatus.lastNewRun ? (
                <>
                  <div className="flex items-center gap-2">
                    {schedulerStatus.lastNewRun.status === 'COMPLETED' ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`font-bold ${schedulerStatus.lastNewRun.status === 'COMPLETED' ? 'text-green-600' : 'text-red-600'}`}>
                      {schedulerStatus.lastNewRun.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    +{schedulerStatus.lastNewRun.productsCreated} / {schedulerStatus.lastNewRun.productsFound}件
                  </div>
                </>
              ) : (
                <div className="text-gray-400">未実行</div>
              )}
            </div>

            {/* Last Backfill Status */}
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">最後のBackfill</div>
              {schedulerStatus.lastBackfillRun ? (
                <>
                  <div className="flex items-center gap-2">
                    {schedulerStatus.lastBackfillRun.status === 'COMPLETED' ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`font-bold ${schedulerStatus.lastBackfillRun.status === 'COMPLETED' ? 'text-green-600' : 'text-red-600'}`}>
                      {schedulerStatus.lastBackfillRun.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    +{schedulerStatus.lastBackfillRun.productsCreated} / {schedulerStatus.lastBackfillRun.productsFound}件
                  </div>
                </>
              ) : (
                <div className="text-gray-400">未実行</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Section: Active Job & Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Active Task Monitor */}
          <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-green-600" />
                  Running Tasks
                  {allRunningTasks.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{allRunningTasks.length}</Badge>
                  )}
              </h2>

              {allRunningTasks.length > 0 ? (
                <div className="space-y-4">
                  {allRunningTasks.map((task) => (
                    <RunningTaskCard
                      key={task.id}
                      task={task}
                      isSkipping={skippingRunIds.has(task.runId) || !!task.skipRequested}
                      onSkip={(t) => handleSkip(t.runId)}
                    />
                  ))}
                </div>
              ) : (
                  <div className="bg-gray-100 dark:bg-gray-800/50 p-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-center flex flex-col items-center justify-center h-64">
                      <ClockIcon className="w-12 h-12 text-gray-300 mb-3" />
                      <h3 className="text-lg font-medium text-gray-500">No Active Tasks</h3>
                      <p className="text-sm text-gray-400">The scraper is currently idle.</p>
                  </div>
              )}
          </div>

          {/* Right: Queue List */}
          <div className="space-y-4">
               <h2 className="text-xl font-bold flex items-center gap-2">
                  <ListIcon className="w-5 h-5 text-gray-600" />
                  Execution Queue
                  <Badge variant="secondary" className="ml-auto">{activeStatus?.queue.length || 0}</Badge>
              </h2>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm h-[400px] overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {activeStatus?.queue.map((item, i) => (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded border group hover:border-blue-300 transition-colors">
                              <div>
                                  <div className="font-bold text-sm truncate max-w-[150px]">{item.targetName}</div>
                                  <div className="text-xs text-gray-500 flex gap-1">
                                      <span className="uppercase">{item.mode}</span>
                                      <span>•</span>
                                      <span>#{i + 1}</span>
                                  </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleRemoveFromQueue(item.id)}
                              >
                                  <TrashIcon className="w-4 h-4" />
                              </Button>
                          </div>
                      ))}
                      {(!activeStatus?.queue || activeStatus.queue.length === 0) && (
                          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                              Queue is empty
                          </div>
                      )}
                  </div>
                  {/* Quick Queue Actions */}
                  <div className="p-3 border-t bg-gray-50 dark:bg-gray-900/50">
                      <select 
                        id="scanModeSelect"
                        aria-label="Scan mode"
                        className="w-full mb-2 p-2 rounded border text-sm"
                        value={mode}
                        onChange={e => setMode(e.target.value as 'NEW' | 'BACKFILL')}
                      >
                          <option value="NEW">Mode: New Scan</option>
                          <option value="BACKFILL">Mode: Backfill</option>
                      </select>
                      <Button onClick={handleRunAll} className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                          Enqueue All Configured Tags
                      </Button>
                  </div>
              </div>
          </div>
      </div>

      {/* Scheduler Config & Tag Manager */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex justify-between items-center mb-6">
              <div>
                  <h2 className="text-xl font-bold">Target Configuration</h2>
                  <p className="text-sm text-gray-500">Manage monitoring targets and schedule settings.</p>
              </div>
              <Button variant="outline" onClick={() => saveSchedulerConfig()}>
                  Save Global Config
              </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Tag List */}
              <div className="lg:col-span-2 space-y-4">
                  <div className="flex gap-2">
                     <input 
                       id="newTagNameInput"
                       aria-label="New Tag Name"
                       className="flex-1 border rounded p-2" 
                       placeholder="New Tag Name" 
                       value={newTagInput}
                       onChange={e => setNewTagInput(e.target.value)}
                     />
                     <input 
                       id="newCategoryInput"
                       aria-label="Category"
                       className="w-32 border rounded p-2" 
                       placeholder="Category" 
                       value={newCategoryInput}
                       onChange={e => setNewCategoryInput(e.target.value)}
                     />
                     <Button onClick={handleAddTag}>Add Target</Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-gray-100 dark:bg-gray-900">
                              <tr>
                                  <th className="p-3">Enabled</th>
                                  <th className="p-3">Tag Name</th>
                                  <th className="p-3">Category</th>
                                  <th className="p-3 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y">
                              {tags.map(tag => (
                                  <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                                      <td className="p-3">
                                          <input 
                                            type="checkbox" 
                                            aria-label={`Enable tag ${tag.tag}`}
                                            checked={tag.enabled} 
                                            onChange={() => handleToggleTag(tag.id, tag.enabled)}
                                          />
                                      </td>
                                      <td className={`p-3 font-medium ${!tag.enabled && 'text-gray-400 line-through'}`}>{tag.tag}</td>
                                      <td className="p-3 text-gray-500">{tag.category || '-'}</td>
                                      <td className="p-3 text-right flex justify-end gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs"
                                            onClick={() => handleEnqueue(tag.tag, tag.category)}
                                          >
                                              <PlayIcon className="w-3 h-3 mr-1" />
                                              Enqueue
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-7 w-7 text-red-400"
                                            onClick={() => handleDeleteTag(tag.id)}
                                          >
                                              <TrashIcon className="w-3 h-3" />
                                          </Button>
                                      </td>
                                  </tr>
                              ))}
                              {tags.length === 0 && (
                                  <tr><td colSpan={4} className="p-4 text-center text-gray-400">No tags configured</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* Scheduler Settings */}
              <div className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                  <h3 className="font-bold text-sm uppercase text-gray-500">Auto-Scheduler Settings</h3>
                  
                  <div className="flex items-center justify-between">
                      <label htmlFor="schedulerEnabledCheckbox" className="text-sm font-medium">Scheduler Enabled</label>
                      <input 
                        id="schedulerEnabledCheckbox"
                        type="checkbox" 
                        checked={schedulerConfig.isSchedulerEnabled}
                        onChange={e => setSchedulerConfig(prev => ({ ...prev, isSchedulerEnabled: e.target.checked }))}
                        className="toggle"
                      />
                  </div>

                  <div className="border-t pt-4 space-y-3">
                      <div>
                          <label htmlFor="newScanIntervalMinInput" className="text-xs text-gray-500 block mb-1">New Scan Interval (min)</label>
                          <input 
                            id="newScanIntervalMinInput"
                            type="number" 
                            className="w-full border rounded p-1 text-sm bg-white dark:bg-black"
                            value={schedulerConfig.newScanIntervalMin}
                            onChange={e => setSchedulerConfig(prev => ({ ...prev, newScanIntervalMin: parseInt(e.target.value) || 10 }))}
                          />
                      </div>
                      <div>
                          <label htmlFor="newScanPageLimitInput" className="text-xs text-gray-500 block mb-1">Page Limit per Run</label>
                          <input 
                            id="newScanPageLimitInput"
                            type="number" 
                            className="w-full border rounded p-1 text-sm bg-white dark:bg-black"
                            value={schedulerConfig.newScanPageLimit}
                            onChange={e => setSchedulerConfig(prev => ({ ...prev, newScanPageLimit: parseInt(e.target.value) || 3 }))}
                          />
                      </div>
                      <div>
                          <label htmlFor="backfillIntervalMinInput" className="text-xs text-gray-500 block mb-1">Backfill Interval (min)</label>
                          <input 
                            id="backfillIntervalMinInput"
                            type="number" 
                            className="w-full border rounded p-1 text-sm bg-white dark:bg-black"
                            value={schedulerConfig.backfillIntervalMin}
                            onChange={e => setSchedulerConfig(prev => ({ ...prev, backfillIntervalMin: parseInt(e.target.value) || 5 }))}
                          />
                      </div>
                      
                      <div className="pt-2 border-t mt-2">
                        <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">Advanced Tuning</h4>
                        <div className="space-y-3">
                           <div>
                              <label htmlFor="backfillPageCountInput" className="text-xs text-gray-500 block mb-1">Backfill Page Count (Depth)</label>
                              <input 
                                id="backfillPageCountInput"
                                type="number" 
                                className="w-full border rounded p-1 text-sm bg-white dark:bg-black"
                                value={schedulerConfig.backfillPageCount}
                                onChange={e => setSchedulerConfig(prev => ({ ...prev, backfillPageCount: parseInt(e.target.value) || 3 }))}
                              />
                           </div>
                           <div>
                              <label htmlFor="backfillProductLimitInput" className="text-xs text-gray-500 block mb-1">Backfill Product Limit (Per Run)</label>
                              <input 
                                id="backfillProductLimitInput"
                                type="number" 
                                className="w-full border rounded p-1 text-sm bg-white dark:bg-black"
                                value={schedulerConfig.backfillProductLimit}
                                onChange={e => setSchedulerConfig(prev => ({ ...prev, backfillProductLimit: parseInt(e.target.value) || 9 }))}
                              />
                           </div>
                           <div>
                              <label htmlFor="requestIntervalMsInput" className="text-xs text-gray-500 block mb-1">Request Interval (ms)</label>
                              <input 
                                id="requestIntervalMsInput"
                                type="number" 
                                className="w-full border rounded p-1 text-sm bg-white dark:bg-black"
                                value={schedulerConfig.requestIntervalMs}
                                onChange={e => setSchedulerConfig(prev => ({ ...prev, requestIntervalMs: parseInt(e.target.value) || 5000 }))}
                              />
                           </div>
                        </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

       {/* Confirmation Dialog */}
       <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDialog.onConfirm}
            >
              確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recent History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Recent History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="p-3">Status</th>
                <th className="p-3">Target / Mode</th>
                <th className="p-3 text-right">Products</th>
                <th className="p-3 text-right">Created</th>
                <th className="p-3 text-right">Duration</th>
                <th className="p-3">Ended</th>
                <th className="p-3">Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {recentRuns.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className={`p-3 font-bold ${statusColor(run.status.toLowerCase())}`}>
                    {run.status}
                  </td>
                  <td className="p-3">
                     <div className="font-medium">{run.metadata?.target ?? 'Unknown'}</div>
                     <div className="text-xs text-gray-500">{run.metadata?.mode ?? '-'}</div>
                  </td>
                  <td className="p-3 text-right">{run.productsFound}</td>
                  <td className="p-3 text-right text-green-600 font-bold">+{run.productsCreated}</td>
                  <td className="p-3 text-right text-gray-500">
                    {run.endTime ? 
                      ((new Date(run.endTime).getTime() - new Date(run.startTime).getTime()) / 1000).toFixed(1) + 's' 
                      : '-'}
                  </td>
                  <td className="p-3 text-gray-500 text-xs">
                    {run.endTime ? new Date(run.endTime).toLocaleString() : '-'}
                  </td>
                  <td className="p-3">
                     <button type="button" className="text-blue-500 hover:underline text-xs" onClick={() => fetchLogs(run.runId)}>
                        View Logs
                     </button>
                  </td>
                </tr>
              ))}
              {recentRuns.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-gray-400">No recent runs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Viewer Dialog */}
      <Dialog open={logViewer.open} onOpenChange={(open) => setLogViewer(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Worker Logs: {logViewer.runId}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchLogs(logViewer.runId)}>Refresh</Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-black text-xs text-green-400 p-4 rounded font-mono">
            {logViewer.loading ? (
              <div>Loading...</div>
            ) : logViewer.logs.length === 0 ? (
              <div>No logs found.</div>
            ) : (
              logViewer.logs.map((log) => (
                <div key={log.id} className="mb-1 border-b border-gray-900 pb-1">
                   <span className="text-gray-500 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                   {log.message}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
