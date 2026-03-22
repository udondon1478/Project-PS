'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

interface TagImplicationTableProps {
  implications: TagImplication[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  onDeleted: () => void;
  isLoading: boolean;
}

const PAGE_SIZE = 20;

export default function TagImplicationTable({
  implications,
  total,
  page,
  onPageChange,
  onDeleted,
  isLoading,
}: TagImplicationTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/tag-implications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        toast.success('含意ルールを削除しました。');
        onDeleted();
      } else {
        const data = await res.json();
        toast.error(data.message || '削除に失敗しました。');
      }
    } catch {
      toast.error('通信エラーが発生しました。');
    } finally {
      setDeletingId(null);
    }
  };

  const formatTagName = (tag: Tag) => tag.displayName || tag.name;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (implications.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        含意ルールがありません
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>元タグ (A)</TableHead>
            <TableHead className="text-center w-12"></TableHead>
            <TableHead>含意タグ (B)</TableHead>
            <TableHead>作成日</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {implications.map((impl) => (
            <TableRow key={impl.id}>
              <TableCell className="font-medium">
                {formatTagName(impl.implyingTag)}
              </TableCell>
              <TableCell className="text-center text-gray-400">→</TableCell>
              <TableCell className="font-medium">
                {formatTagName(impl.impliedTag)}
              </TableCell>
              <TableCell className="text-gray-500 text-sm">
                {new Date(impl.createdAt).toLocaleDateString('ja-JP')}
              </TableCell>
              <TableCell className="text-right">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === impl.id}
                    >
                      削除
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>含意ルールの削除</AlertDialogTitle>
                      <AlertDialogDescription>
                        「{formatTagName(impl.implyingTag)} → {formatTagName(impl.impliedTag)}」
                        の含意ルールを削除しますか？この操作は取り消せません。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(impl.id)}>
                        削除する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            全 {total} 件中 {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} 件
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
            >
              前へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
            >
              次へ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
