import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScraperLog } from '@/lib/booth-scraper/orchestrator';
import { FastForwardIcon, Loader2, PlayIcon } from 'lucide-react';

export interface UnifiedRunningTask {
  id: string;
  runId: string;
  source: 'local' | 'remote';
  targetName: string;
  mode: string;
  status: string;
  startTime: string;
  progress: {
    pagesProcessed: number;
    productsFound: number;
    productsCreated: number;
    productsFailed: number;
  };
  logs: ScraperLog[];
  skipRequested?: boolean;
}

interface RunningTaskCardProps {
  task: UnifiedRunningTask;
  isSkipping: boolean;
  onSkip: (task: UnifiedRunningTask) => void;
}

export function RunningTaskCard({ task, isSkipping, onSkip }: RunningTaskCardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 p-6 rounded-xl border shadow-sm relative overflow-hidden ${
        task.source === 'local'
          ? 'border-blue-200 dark:border-blue-900'
          : 'border-orange-200 dark:border-orange-900'
      }`}
    >
        <div className={`absolute top-0 right-0 p-4 opacity-10`}>
            <PlayIcon className={`w-32 h-32 ${task.source === 'local' ? 'text-blue-500' : 'text-orange-500'}`} />
        </div>

        <div className="flex justify-between items-start mb-6">
            <div>
                {/* Source Badge */}
                <div className="mb-2">
                  <Badge
                    className={task.source === 'local'
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-0'
                      : 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-0'
                    }
                  >
                    {task.source === 'local' ? 'Local' : 'Remote'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Current Target</div>
                <div className={`text-3xl font-bold ${task.source === 'local' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {task.targetName}
                </div>
                <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{task.mode}</Badge>
                    <Badge className={task.source === 'local'
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-0'
                      : 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-0'
                    }>RUNNING</Badge>
                </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              disabled={isSkipping}
              onClick={() => onSkip(task)}
              className="z-10 shadow-lg"
            >
               {isSkipping ? (
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
               ) : (
                 <FastForwardIcon className="w-4 h-4 mr-2" />
               )}
               {isSkipping ? 'Skipping...' : 'Skip This Task'}
            </Button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6 relative z-10">
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <div className="text-xs text-gray-500">Pages</div>
                <div className="text-xl font-bold">{task.progress.pagesProcessed}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <div className="text-xs text-gray-500">Found</div>
                <div className="text-xl font-bold">{task.progress.productsFound}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <div className="text-xs text-gray-500">Created</div>
                <div className="text-xl font-bold text-green-600">{task.progress.productsCreated}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <div className="text-xs text-gray-500">Failed</div>
                <div className="text-xl font-bold text-red-500">{task.progress.productsFailed}</div>
            </div>
        </div>

        {/* Live Log Snippet */}
        <div className="bg-black text-xs text-green-400 p-4 rounded h-32 overflow-y-auto font-mono custom-scrollbar">
             {task.logs.slice(-5).map((log) => {
               // Safe timestamp formatting with fallback
               let timeStr = '';
               try {
                 const date = new Date(log.timestamp);
                 timeStr = isNaN(date.getTime()) ? log.timestamp : date.toLocaleTimeString();
               } catch {
                 timeStr = log.timestamp;
               }
               return (
                 <div key={log.id} className="truncate">
                   <span className="opacity-50 mr-2">[{timeStr}]</span>
                   {log.message}
                 </div>
               );
             })}
             {task.logs.length === 0 && <div className="opacity-50">{task.source === 'remote' ? 'Loading logs...' : 'Waiting for logs...'}</div>}
        </div>
    </div>
  );
}
