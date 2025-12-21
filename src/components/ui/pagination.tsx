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
 * Generate an ordered sequence of page indicators including numbers and 'ellipsis' markers.
 *
 * Always includes page 1 and, when totalPages > 1, the last page; includes a compact window around
 * the current page and uses the string literal `'ellipsis'` to represent skipped ranges.
 *
 * @param currentPage - The currently active page (1-based)
 * @param totalPages - The total number of available pages
 * @returns An array of page numbers and the string `'ellipsis'` in display order
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
 * Builds a URL targeting a specific pagination page.
 *
 * @param baseUrl - The base URL to which the page parameter may be appended
 * @param page - The 1-based page number to target
 * @returns The URL for the given page; returns `baseUrl` unchanged for page 1, otherwise `baseUrl` with a `page` query parameter appended
 */
function buildPageUrl(baseUrl: string, page: number): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return page === 1 ? baseUrl : `${baseUrl}${separator}page=${page}`;
}

/**
 * Render a pagination navigation bar with previous/next controls and a concise sequence of page links.
 *
 * The component always shows page 1 and the last page (when totalPages > 1), displays a window of pages around
 * the current page, and inserts ellipsis where ranges are omitted. Previous and Next controls are disabled
 * at the boundaries; the current page is rendered as non-interactive and marked with `aria-current="page"`.
 *
 * @param currentPage - The active page number (1-based)
 * @param totalPages - The total number of pages available
 * @param baseUrl - Base URL to build page links from; if `page` is 1 the `baseUrl` is used unchanged (supports existing query string)
 * @param className - Optional additional CSS class names for the root nav element
 * @returns The pagination navigation element
 *
 * @example
 * ```tsx
 * <Pagination currentPage={2} totalPages={10} baseUrl="/search?tags=3D" />
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