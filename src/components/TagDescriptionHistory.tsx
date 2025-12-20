"use client";

import { TagMetadataHistory } from '@prisma/client';
import Image from 'next/image';

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

// Augment the generated type to include the editor relation
type HistoryWithEditor = TagMetadataHistory & {
  editor: User;
};

interface TagDescriptionHistoryProps {
  history: HistoryWithEditor[];
}

export function TagDescriptionHistory({ history }: TagDescriptionHistoryProps) {
  if (history.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No description history found.</p>;
  }

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <div key={item.id} className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Image
                src={item.editor.image || '/images/PolySeek_10_export_icon.svg'}
                alt={item.editor.name || 'User'}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span className="font-semibold text-sm">{item.editor.name || 'Unknown User'}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(item.createdAt).toLocaleString()}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Before:</p>
            <blockquote className="p-2 text-sm border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 rounded-r-lg my-1">
              {item.oldValue || 'N/A'}
            </blockquote>
            <p className="text-xs text-gray-500">After:</p>
            <blockquote className="p-2 text-sm border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-r-lg my-1">
              {item.newValue || 'N/A'}
            </blockquote>
            {item.comment && (
              <>
                <p className="text-xs text-gray-500 mt-2">Comment:</p>
                <p className="p-2 text-sm">{item.comment}</p>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
