'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import TagImplicationTable from './TagImplicationTable';
import TagImplicationCreateModal from './TagImplicationCreateModal';

interface Tag {
  id: string;
  name: string;
  displayName: string | null;
}

interface TagImplication {
  id: string;
  implyingTag: Tag;
  impliedTag: Tag;
  createdAt: string;
}

const PAGE_SIZE = 20;

export default function TagImplicationManager() {
  const [implications, setImplications] = useState<TagImplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchImplications = useCallback(async () => {
    setIsLoading(true);
    try {
      let tagId: string | null = null;

      if (debouncedSearch.trim()) {
        const searchRes = await fetch(
          `/api/tags/search?query=${encodeURIComponent(debouncedSearch)}`
        );
        if (searchRes.ok) {
          const tags = await searchRes.json();
          if (tags.length > 0) {
            tagId = tags[0].id;
          } else {
            setImplications([]);
            setTotal(0);
            setIsLoading(false);
            return;
          }
        }
      }

      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (tagId) {
        params.set('tagId', tagId);
      }

      const res = await fetch(`/api/admin/tag-implications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setImplications(data.implications);
        setTotal(data.total);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchImplications();
  }, [fetchImplications]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">含意タグ管理</h2>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          含意ルールを追加
        </Button>
      </div>

      <div className="mb-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="タグ名で検索..."
          className="max-w-sm"
        />
      </div>

      <TagImplicationTable
        implications={implications}
        total={total}
        page={page}
        onPageChange={setPage}
        onDeleted={handleRefresh}
        isLoading={isLoading}
      />

      <TagImplicationCreateModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleRefresh}
      />
    </div>
  );
}
