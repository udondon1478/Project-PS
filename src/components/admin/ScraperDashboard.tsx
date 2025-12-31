'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { ClockIcon, TrashIcon, FastForwardIcon, ListIcon, PlayIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { type ScraperRun, type ScraperLog, type ScraperStatus } from '@/lib/booth-scraper/orchestrator';

interface SerializedScraperRun extends Omit<ScraperRun, 'startTime' | 'endTime'> {
  startTime: string;
  endTime?: string | null;
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

  // Fetch Scheduler Config
  useEffect(() => {
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
        }
      })
      .catch(e => {
        console.error('Failed to load scheduler config', e);
        toast.error(`Failed to load scheduler config: ${e?.message || e}`);
      });
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
    } catch (e) {
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
      .catch(e => toast.error('Failed to load tags'));
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
    } catch (e) {
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
          await fetch(`/api/admin/booth-scraper/tags/${id}`, { method: 'DELETE' });
          setTags(prev => prev.filter(t => t.id !== id));
          toast.success('Tag deleted');
        } catch (e) {
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
    } catch (e) {
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

  const handleEnqueue = async (tagQuery: string) => {
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
              query: tagQuery,
              useTargetTags: false // Explicit single
            }
          }
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        toast.error(`Failed: ${err.error}`);
      } else {
        toast.success(`Enqueued: ${tagQuery}`);
      }
    } catch (e) {
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
        }
      } catch (e) {
        toast.error('Error starting all');
      } finally {
        setLoading(false);
      }
  };

  const handleSkipCurrent = async () => {
    try {
        await fetch('/api/admin/booth-scraper/scrape?skipCurrent=true', { method: 'DELETE' });
        toast.info('Skipping current task...');
    } catch(e) {
        toast.error('Failed to skip');
    }
  };

  const handleRemoveFromQueue = async (targetId: string) => {
      try {
          await fetch(`/api/admin/booth-scraper/scrape?targetId=${targetId}`, { method: 'DELETE' });
          toast.success('Removed from queue');
      } catch(e) {
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

  return (
    <div className="space-y-8">
      {/* Top Section: Active Job & Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Active Task Monitor */}
          <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-green-600" />
                  Running Task
              </h2>
              
              {activeStatus && activeStatus.status === 'running' ? (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                          <PlayIcon className="w-32 h-32 text-blue-500" />
                      </div>
                      
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <div className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Current Target</div>
                              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                  {activeStatus.currentTarget?.targetName || 'Unknown Target'}
                              </div>
                              <div className="flex gap-2 mt-2">
                                  <Badge variant="outline">{activeStatus.mode}</Badge>
                                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0">RUNNING</Badge>
                              </div>
                          </div>
                          
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleSkipCurrent}
                            className="z-10 shadow-lg"
                          >
                             <FastForwardIcon className="w-4 h-4 mr-2" />
                             Skip This Task
                          </Button>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-6 relative z-10">
                          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                              <div className="text-xs text-gray-500">Pages</div>
                              <div className="text-xl font-bold">{activeStatus.progress.pagesProcessed}</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                              <div className="text-xs text-gray-500">Found</div>
                              <div className="text-xl font-bold">{activeStatus.progress.productsFound}</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                              <div className="text-xs text-gray-500">Created</div>
                              <div className="text-xl font-bold text-green-600">{activeStatus.progress.productsCreated}</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                              <div className="text-xs text-gray-500">Failed</div>
                              <div className="text-xl font-bold text-red-500">{activeStatus.progress.productsFailed}</div>
                          </div>
                      </div>

                      {/* Live Log Snippet */}
                      <div className="bg-black text-xs text-green-400 p-4 rounded h-32 overflow-y-auto font-mono custom-scrollbar">
                           {activeStatus.logs.slice(-5).map((log) => (
                             <div key={log.id} className="truncate">
                               <span className="opacity-50 mr-2">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                               {log.message}
                             </div>
                           ))}
                           {activeStatus.logs.length === 0 && <div className="opacity-50">Waiting for logs...</div>}
                      </div>
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
                        className="w-full mb-2 p-2 rounded border text-sm"
                        value={mode}
                        onChange={e => setMode(e.target.value as any)}
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
                       className="flex-1 border rounded p-2" 
                       placeholder="New Tag Name" 
                       value={newTagInput}
                       onChange={e => setNewTagInput(e.target.value)}
                     />
                     <input 
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
                                            onClick={() => handleEnqueue(tag.tag)}
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
                      <span className="text-sm font-medium">Scheduler Enabled</span>
                      <input 
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
      
      {/* Running Workers from DB (visible if other processes are running) */}
      {(() => {
        // Filter out the currently displayed local run to avoid duplication
        const remoteWorkers = runningFromDb.filter(r => r.runId !== activeStatus?.runId);
        
        if (remoteWorkers.length === 0) return null;

        return (
        <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">🔄 実行中のワーカー（別プロセス）</h3>
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              DBから検出: {remoteWorkers.length}件
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            このプロセスでは詳細なログを見れませんが、ワーカーが実行中です。
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="p-2">Run ID</th>
                  <th className="p-2">開始時間</th>
                  <th className="p-2">進捗</th>
                  <th className="p-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {remoteWorkers.map(run => (
                  <tr key={run.runId} className="border-b dark:border-gray-700">
                    <td className="p-2 font-mono text-xs">{run.runId}</td>
                    <td className="p-2">{new Date(run.startTime).toLocaleString()}</td>
                    <td className="p-2">
                      ページ: {run.processedPages || 0}, 作成: {run.productsCreated}
                    </td>
                    <td className="p-2 flex gap-2">
                       <button
                         type="button"
                         onClick={() => fetchLogs(run.runId)}
                         className="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 px-2 py-1 rounded"
                       >
                         Logs
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

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
                     <div className="font-medium">{(run.metadata as any)?.target || 'Unknown'}</div>
                     <div className="text-xs text-gray-500">{(run.metadata as any)?.mode || '-'}</div>
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
