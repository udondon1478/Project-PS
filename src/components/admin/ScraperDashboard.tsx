'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(false);
  
  const activeStatusRef = useRef(activeStatus);
  activeStatusRef.current = activeStatus;
  
  // Config Inputs
  const [mode, setMode] = useState<'NEW' | 'BACKFILL'>('NEW');
  const [pageLimit, setPageLimit] = useState<string>('3');
  const [rateLimit, setRateLimit] = useState<string>('2500');

  // Search Params
  const [searchQuery, setSearchQuery] = useState<string>('VRChat');
  const [category, setCategory] = useState<string>('');
  const [adult, setAdult] = useState<boolean>(false);
  const [useTargetTags, setUseTargetTags] = useState<boolean>(false);

  // Target Tags
  const [tags, setTags] = useState<Array<{ id: string, tag: string, enabled: boolean }>>([]);
  const [newTagInput, setNewTagInput] = useState('');

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
        body: JSON.stringify({ tag: newTagInput }),
      });
      if (res.ok) {
        const tag = await res.json();
        setTags(prev => [tag, ...prev]);
        setNewTagInput('');
        toast.success('Tag added successfully');
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to add tag' }));
        toast.error(err.error || 'Failed to add tag');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add tag');
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    try {
      await fetch(`/api/admin/booth-scraper/tags/${id}`, { method: 'DELETE' });
      setTags(prev => prev.filter(t => t.id !== id));
      toast.success('Tag deleted');
    } catch (e) {
      toast.error('Failed to delete tag');
    }
  };

  const handleToggleTag = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/booth-scraper/tags/${id}`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !current })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to toggle tag' }));
        toast.error(err.error || 'Failed to toggle tag');
        return;
      }

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
          // Log entries from orchestrator are now objects {id, timestamp, message}
          setActiveStatus(data.status);
          if (data.status && data.status.status === 'running') {
             // Continue polling
          } else if (activeStatusRef.current?.status === 'running' && data.status?.status !== 'running') {
            // Just finished
            router.refresh(); // Refresh list
          }
        }
      } catch (e) {
        console.error('Poll error', e);
        // Do not crash the poll, but maybe show a toast if it's persistent? 
        // For polling, constant toasts might be annoying. 
        // Review comment said: "update the catch to surface an in-UI notification... ensuring you import/use the app's toast API consistently"
        // Let's show it once or use a specific error handling strategy.
        // For now, I'll add the toast as requested.
        toast.error('Failed to poll scraper status', {
           description: e instanceof Error ? e.message : String(e)
        });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [router]);

  const handleStart = async () => {
    // Validation
    const pLimit = parseInt(pageLimit, 10);
    const rLimit = parseInt(rateLimit, 10);

    if (isNaN(pLimit) || pLimit < 1) {
      toast.error('Invalid Page Limit', { description: 'Please enter a valid number greater than 0' });
      return;
    }

    if (isNaN(rLimit) || rLimit < 1000) {
      toast.error('Invalid Rate Limit', { description: 'Rate limit must be at least 1000ms' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/booth-scraper/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          options: {
            pageLimit: pLimit,
            rateLimitOverride: rLimit,
            searchParams: {
              query: searchQuery,
              category: category || undefined,
              adult,
              useTargetTags
            }
          }
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert(`Failed: ${err.error}`);
      } else {
        // Trigger poll immediately
      }
    } catch (e) {
      alert('Error starting scraper');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!confirm('Are you sure you want to stop the scraper?')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/booth-scraper/scrape', {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const err = await res.json();
        toast.error(`Failed to stop: ${err.error}`);
      } else {
        toast.success('Scraper stop requested');
      }
    } catch (e) {
      toast.error('Error stopping scraper');
    } finally {
      setLoading(false);
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
      {/* Control Panel */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md space-y-4">
        <h2 className="text-xl font-semibold">Start Scraper</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="mode-select" className="block text-sm font-medium mb-1">Mode</label>
            <select 
              id="mode-select"
              value={mode} 
              onChange={(e) => setMode(e.target.value as 'NEW' | 'BACKFILL')}
              className="w-full p-2 border rounded dark:bg-gray-700"
            >
              <option value="NEW">New Product Scan (Default)</option>
              <option value="BACKFILL">Backfill (Resume History)</option>
            </select>
          </div>
          
          <div>
             <label htmlFor="pageLimit" className="block text-sm font-medium mb-1">Page Limit</label>
             <input 
               id="pageLimit"
               type="text" 
               inputMode="numeric"
               value={pageLimit} 
               onChange={(e) => setPageLimit(e.target.value)}
               className="w-full p-2 border rounded dark:bg-gray-700"
             />
             <div className="text-xs text-gray-500 mt-1">
               Default: NEW=3, BACKFILL=10
             </div>
          </div>
          
          <div>
             <label htmlFor="rateLimit" className="block text-sm font-medium mb-1">Interval (ms)</label>
             <input 
               id="rateLimit"
               type="text"
               inputMode="numeric" 
               value={rateLimit} 
               onChange={(e) => setRateLimit(e.target.value)}
               className="w-full p-2 border rounded dark:bg-gray-700"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 dark:border-gray-700">
           <div>
              <label htmlFor="searchQuery" className="block text-sm font-medium mb-1">Search Query</label>
              <input 
                id="searchQuery"
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700"
                placeholder="VRChat"
              />
           </div>
           
           <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1">Category (Optional)</label>
              <input 
                id="category"
                type="text" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700"
                placeholder="3D models"
              />
           </div>

           <div className="flex items-center pt-6 space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={adult}
                  onChange={(e) => setAdult(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Include Adult Content</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={useTargetTags}
                  onChange={(e) => setUseTargetTags(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Use Target Tag List</span>
              </label>
           </div>
        </div>

        {/* Target Tag Manager */}
        <div className="border-t pt-4 dark:border-gray-700">
           <h3 className="text-sm font-medium mb-2">Target Tag List (Used when "Use Target Tag List" is checked)</h3>
           <div className="flex gap-2 mb-2">
             <input 
               type="text" 
               value={newTagInput}
               onChange={(e) => setNewTagInput(e.target.value)}
               className="border p-2 rounded dark:bg-gray-700"
               placeholder="Add new tag (e.g. '3D Costume')"
             />
             <button onClick={handleAddTag} type="button" className="bg-green-600 text-white px-3 py-1 rounded">Add</button>
           </div>
           <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50 dark:bg-gray-900">
              {tags.map(t => (
                <div key={t.id} className="flex justify-between items-center py-1 border-b last:border-0 border-gray-200 dark:border-gray-700">
                   <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={t.enabled} 
                        onChange={() => handleToggleTag(t.id, t.enabled)}
                      />
                      <span className={t.enabled ? '' : 'text-gray-400 line-through'}>{t.tag}</span>
                   </div>
                   <button type="button" onClick={() => handleDeleteTag(t.id)} className="text-red-500 text-xs hover:underline">Delete</button>
                </div>
              ))}
              {tags.length === 0 && <div className="text-gray-400 text-sm">No target tags defined.</div>}
           </div>
        </div>

        <button 
          type="button"
          onClick={handleStart} 
          disabled={loading || activeStatus?.status === 'running'}
          className={`px-4 py-2 rounded text-white font-medium ${
            activeStatus?.status === 'running' ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {activeStatus?.status === 'running' ? 'Scraper Running...' : 'Start Scraper'}
        </button>
      </div>

      {/* Live Status */}
      {activeStatus && (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Current Run: {activeStatus.runId}</h3>
            <div className="flex items-center gap-4">
              <span className={statusColor(activeStatus.status)}>{activeStatus.status.toUpperCase()}</span>
              {(activeStatus.status === 'running' || activeStatus.status === 'stopping') && (
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={loading || activeStatus.status === 'stopping'}
                  className={`px-3 py-1 rounded text-white text-sm font-medium ${
                    activeStatus.status === 'stopping' 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {activeStatus.status === 'stopping' ? 'Stopping...' : 'Stop'}
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
             <StatCard label="Pages" value={activeStatus.progress.pagesProcessed} />
             <StatCard label="Found" value={activeStatus.progress.productsFound} />
             <StatCard label="Created" value={activeStatus.progress.productsCreated} />
             <StatCard label="Failed" value={activeStatus.progress.productsFailed} />
          </div>

          <div className="bg-black text-xs text-green-400 p-4 rounded h-48 overflow-y-auto font-mono">
             {activeStatus.logs.map((log) => (
               <div key={log.id}>{log.message}</div>
             ))}
             {activeStatus.logs.length === 0 && <div>No logs yet...</div>}
          </div>
        </div>
      )}

      {/* History */}
      <div className="space-y-4">
         <h3 className="text-xl font-semibold">Recent History</h3>
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="border-b dark:border-gray-700">
                 <th className="p-3">Run ID</th>
                 <th className="p-3">Status</th>
                 <th className="p-3">Created</th>
                 <th className="p-3">Found</th>
                 <th className="p-3">Time</th>
                 <th className="p-3">Last Page</th>
               </tr>
             </thead>
             <tbody>
               {recentRuns.map(run => (
                 <tr key={run.runId} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                   <td className="p-3 font-mono text-sm">{run.runId}</td>
                   <td className="p-3"><span className={statusColor(run.status)}>{run.status}</span></td>
                   <td className="p-3">{run.productsCreated}</td>
                   <td className="p-3">{run.productsFound}</td>
                   <td className="p-3 text-sm">{new Date(run.startTime).toLocaleString()}</td>
                   <td className="p-3">{run.lastProcessedPage || '-'}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string, value: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
      <div className="text-gray-500 text-xs uppercase">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
