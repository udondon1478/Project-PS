import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  /** 現在のページ番号（1始まり） */
  currentPage: number;
  /** 総ページ数 */
  totalPages: number;
  /** ベースURL（ページパラメータを除く） */
  baseUrl: string;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * ページ番号のリストを生成（現在ページ±2、省略記号付き）
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];
  const delta = 2; // 現在ページの前後に表示するページ数

  // 常に1ページ目を含める
  pages.push(1);

  // 現在ページ周辺のページを計算
  const rangeStart = Math.max(2, currentPage - delta);
  const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

  // 1ページ目と表示範囲の間にギャップがある場合は省略記号
  if (rangeStart > 2) {
    pages.push('ellipsis');
  }

  // ページ範囲を追加
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  // 表示範囲と最終ページの間にギャップがある場合は省略記号
  if (rangeEnd < totalPages - 1) {
    pages.push('ellipsis');
  }

  // 最終ページを追加（1ページのみの場合は除く）
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * ページ番号付きのURLを構築
 */
function buildPageUrl(baseUrl: string, page: number): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return page === 1 ? baseUrl : `${baseUrl}${separator}page=${page}`;
}

/**
 * ページネーションコンポーネント
 * 
 * @example
 * ```tsx
 * <Pagination 
 *   currentPage={2} 
 *   totalPages={10} 
 *   baseUrl="/search?tags=3D" 
 * />
 * ```
 */
export function Pagination({ 
  currentPage, 
  totalPages, 
  baseUrl, 
  className 
}: PaginationProps) {
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav 
      aria-label="ページネーション"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      {/* Previous ボタン */}
      <Button
        variant="ghost"
        size="icon-sm"
        asChild={currentPage > 1}
        disabled={currentPage <= 1}
        aria-label="前のページ"
        className={cn(
          currentPage <= 1 && "pointer-events-none opacity-50"
        )}
      >
        {currentPage > 1 ? (
          <Link href={buildPageUrl(baseUrl, currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span>
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
      </Button>

      {/* ページ番号 */}
      {pageNumbers.map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <span 
              key={`ellipsis-${index}`}
              className="flex h-8 w-8 items-center justify-center"
              aria-hidden="true"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </span>
          );
        }

        const isCurrentPage = page === currentPage;

        return (
          <Button
            key={page}
            variant={isCurrentPage ? "default" : "ghost"}
            size="icon-sm"
            asChild={!isCurrentPage}
            aria-label={`ページ ${page}`}
            aria-current={isCurrentPage ? "page" : undefined}
            className={cn(
              "min-w-8",
              isCurrentPage && "pointer-events-none"
            )}
          >
            {isCurrentPage ? (
              <span>{page}</span>
            ) : (
              <Link href={buildPageUrl(baseUrl, page)}>
                {page}
              </Link>
            )}
          </Button>
        );
      })}

      {/* Next ボタン */}
      <Button
        variant="ghost"
        size="icon-sm"
        asChild={currentPage < totalPages}
        disabled={currentPage >= totalPages}
        aria-label="次のページ"
        className={cn(
          currentPage >= totalPages && "pointer-events-none opacity-50"
        )}
      >
        {currentPage < totalPages ? (
          <Link href={buildPageUrl(baseUrl, currentPage + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span>
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </Button>
    </nav>
  );
}
