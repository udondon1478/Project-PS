"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

// Define the types for the props
interface HistoryEditor {
  id: string;
  name: string | null;
  image: string | null;
}

interface TagEditHistory {
  id: string;
  editor: HistoryEditor;
  version: number;
  addedTags: string[]; // These are IDs
  removedTags: string[]; // These are IDs
  keptTags: string[]; // These are IDs
  comment: string | null;
  score: number;
  createdAt: string;
}

interface TagEditHistoryItemProps {
  history: TagEditHistory;
  onVote: (historyId: string, score: number) => Promise<void>;
  tagMap: { [key: string]: string };
}

const TAG_DISPLAY_LIMIT = 5;

const TagList: React.FC<{
  tagIds: string[],
  colorClass: string,
  tagMap: { [key: string]: string }
}> = ({ tagIds, colorClass, tagMap }) => {
  const [showAll, setShowAll] = useState(false);

  if (tagIds.length === 0) {
    return null;
  }

  const tagNames = tagIds.map(id => tagMap[id] || id); // Fallback to ID if name not found
  const displayedTags = showAll ? tagNames : tagNames.slice(0, TAG_DISPLAY_LIMIT);

  return (
    <div>
      <p className={colorClass}>
        {displayedTags.join(', ')}
      </p>
      {tagNames.length > TAG_DISPLAY_LIMIT && (
        <Button variant="link" size="sm" onClick={() => setShowAll(!showAll)}>
          {showAll ? '一部を隠す' : `...あと ${tagNames.length - TAG_DISPLAY_LIMIT} 件全て表示`}
        </Button>
      )}
    </div>
  );
};


const TagEditHistoryItem: React.FC<TagEditHistoryItemProps> = ({ history, onVote, tagMap }) => {
  return (
    <div className="border dark:border-gray-700 p-4 rounded-lg shadow-sm bg-white dark:bg-gray-800/50">
      <div className="flex items-center mb-2">
        <Image
          src={history.editor.image || '/default-avatar.png'} // Provide a fallback avatar image
          alt={history.editor.name || 'Unknown user'}
          width={40}
          height={40}
          className="rounded-full mr-3"
        />
        <div>
          <p className="font-semibold">{history.editor.name || '不明なユーザー'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            バージョン: {history.version} | 日時: {new Date(history.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {history.comment && (
        <p className="mt-2 text-gray-700 dark:text-gray-300">コメント: {history.comment}</p>
      )}

      <div className="mt-2 text-sm space-y-1">
        {history.addedTags.length > 0 && (
          <div>
            <span className="font-semibold text-green-600">追加タグ:</span>
            <TagList tagIds={history.addedTags} colorClass="text-green-600" tagMap={tagMap} />
          </div>
        )}
        {history.removedTags.length > 0 && (
          <div>
            <span className="font-semibold text-red-600">削除タグ:</span>
            <TagList tagIds={history.removedTags} colorClass="text-red-600" tagMap={tagMap} />
          </div>
        )}
        {history.keptTags.length > 0 && (
          <div>
            <span className="font-semibold text-gray-600 dark:text-gray-400">維持タグ:</span>
            <TagList tagIds={history.keptTags} colorClass="text-gray-600 dark:text-gray-400" tagMap={tagMap} />
          </div>
        )}
      </div>

      <div className="flex items-center mt-3">
        <span className="font-semibold mr-2">評価: {history.score}</span>
        <Button variant="outline" size="sm" className="mr-2" onClick={() => onVote(history.id, 1)}>
          👍
        </Button>
        <Button variant="outline" size="sm" onClick={() => onVote(history.id, -1)}>
          👎
        </Button>
      </div>
    </div>
  );
};

export default TagEditHistoryItem;
