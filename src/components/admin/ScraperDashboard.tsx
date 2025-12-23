'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Type definitions to match Prisma/API
interface ScraperRun {
  runId: string;
  status: string;
  mode?: string;
  startTime: Date | string;
  endTime?: Date | string | null;
  productsFound: number;
  productsCreated: number;
  lastProcessedPage?: number | null;
  metadata?: any;
}

interface ScraperStatus {
  runId: string;
  mode: string;
  status: string;
  progress: {
    pagesProcessed: number;
    productsFound: number;
    productsExisting: number;
    productsCreated: number;
    productsSkipped: number;
    productsFailed: number;
    lastProcessedPage: number;
  };
  logs: string[];
}

interface DashboardProps {
  recentRuns: ScraperRun[];
}

export default function ScraperDashboard({ recentRuns }: DashboardProps) {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<ScraperStatus | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Config Inputs
  const [mode, setMode] = useState<'NEW' | 'BACKFILL'>('NEW');
  const [pageLimit, setPageLimit] = useState<number>(3);
  const [rateLimit, setRateLimit] = useState<number>(2500);

  // Poll status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/admin/booth-scraper/scrape');
        if (res.ok) {
          const data = await res.json();
          setActiveStatus(data.status);
          if (data.status && data.status.status === 'running') {
             // Continue polling
          } else if (activeStatus?.status === 'running' && data.status?.status !== 'running') {
            // Just finished
            router.refresh(); // Refresh list
          }
        }
      } catch (e) {
        console.error('Poll error', e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [router, activeStatus?.status]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/booth-scraper/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          options: {
            pageLimit,
            rateLimitOverride: rateLimit
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

  const statusColor = (s: string) => {
    switch (s) {
      case 'running': return 'text-blue-500 font-bold';
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
            <label className="block text-sm font-medium mb-1">Mode</label>
            <select 
              value={mode} 
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full p-2 border rounded dark:bg-gray-700"
            >
              <option value="NEW">New Product Scan (Default)</option>
              <option value="BACKFILL">Backfill (Resume History)</option>
            </select>
          </div>
          
          <div>
             <label className="block text-sm font-medium mb-1">Page Limit</label>
             <input 
               type="number" 
               value={pageLimit} 
               onChange={(e) => setPageLimit(Number(e.target.value))}
               className="w-full p-2 border rounded dark:bg-gray-700"
             />
             <div className="text-xs text-gray-500 mt-1">
               Default: NEW=3, BACKFILL=10
             </div>
          </div>
          
          <div>
             <label className="block text-sm font-medium mb-1">Interval (ms)</label>
             <input 
               type="number" 
               value={rateLimit} 
               onChange={(e) => setRateLimit(Number(e.target.value))}
               className="w-full p-2 border rounded dark:bg-gray-700"
             />
          </div>
        </div>

        <button 
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
            <span className={statusColor(activeStatus.status)}>{activeStatus.status.toUpperCase()}</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
             <StatCard label="Pages" value={activeStatus.progress.pagesProcessed} />
             <StatCard label="Found" value={activeStatus.progress.productsFound} />
             <StatCard label="Created" value={activeStatus.progress.productsCreated} />
             <StatCard label="Failed" value={activeStatus.progress.productsFailed} />
          </div>

          <div className="bg-black text-xs text-green-400 p-4 rounded h-48 overflow-y-auto font-mono">
             {activeStatus.logs.map((log, i) => (
               <div key={i}>{log}</div>
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
