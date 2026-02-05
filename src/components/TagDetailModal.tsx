"use client";

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TagDescriptionEditor } from './TagDescriptionEditor';
import { TagDescriptionHistory } from './TagDescriptionHistory';
import { Tag, TagMetadataHistory } from '@prisma/client';
import { REPORT_TARGET_TAG } from '@/lib/constants';
import Link from 'next/link';
import Image from 'next/image';
import { Flag, ExternalLink, CheckCircle } from 'lucide-react';
import { ReportDialog } from './reports/ReportDialog';

// Extend Tag type to include API-returned displayName
type TagWithDisplayName = Tag & { displayName?: string };

/**
 * Interface for external links returned from the API.
 */
interface ExternalLinkData {
  name: string;
  url: string;
}

/**
 * Extended Tag interface including relations and additional metadata returned by the API.
 */
type TagDetails = Omit<Tag, 'wikiContent' | 'externalLinks' | 'distinguishingFeatures' | 'productTags' | 'tagCategory' | 'tagCategoryId' | 'count' | 'sourceTranslations' | 'translatedTranslations' | 'implyingRelations' | 'impliedRelations' | 'parentRelations' | 'childRelations' | 'metadataHistory' | 'reports'> & {
  parentTags: TagWithDisplayName[];
  childTags: TagWithDisplayName[];
  products: {
    id: string;
    title: string;
    mainImageUrl: string | null;
  }[];
  history: (TagMetadataHistory & { editor: { id: string; name: string | null; image: string | null; }})[];
  hasReported?: boolean;
  /** Markdown content for the tag wiki */
  wikiContent?: string | null;
  /** List of external references */
  externalLinks?: ExternalLinkData[] | null;
  /** Array of distinguishing features text */
  distinguishingFeatures?: string[] | null;
}

/**
 * Props for the TagDetailModal component.
 */
interface TagDetailModalProps {
  /** The ID of the tag to display. Null if no tag is selected. */
  tagId: string | null;
  /** Boolean indicating if the modal is open */
  open: boolean;
  /** Callback to handle modal open/close state changes */
  onOpenChange: (open: boolean) => void;
}

/**
 * Validates and normalizes URLs to prevent XSS attacks via javascript: URIs.
 * 
 * @param url - The URL to validate.
 * @returns The sanitized URL if valid (http/https), otherwise '#'.
 */
function safeUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    return '#';
  } catch {
    return '#';
  }
}

/**
 * A modal component for displaying detailed information about a tag.
 * 
 * Features:
 * - Displays tag description, Wiki content, external links, and distinguishing features.
 * - Shows tag hierarchy (parent/child tags) and associated products.
 * - Provides access to edit functionality (TagDescriptionEditor) and change history.
 * - Allows users to report inappropriate tags.
 * - Fetches data dynamically when opened.
 */
export function TagDetailModal({ tagId, open, onOpenChange }: TagDetailModalProps) {
  const { data: session } = useSession();
  const [details, setDetails] = useState<TagDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const fetchDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tags/${id}/details`);
      if (!res.ok) {
        let errorMessage = 'タグ詳細の取得に失敗しました';
        try {
          const body = await res.json();
          if (body && typeof body === 'object') {
            errorMessage = body.error || body.message || errorMessage;
          }
        } catch {
          // Ignore JSON parse errors on error response
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      setDetails(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'タグ詳細の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && tagId) {
      fetchDetails(tagId);
    } else {
      setDetails(null);
    }
  }, [open, tagId]);

  const handleEditorSuccess = () => {
    // Re-fetch details to show updated description
    if (tagId) {
      fetchDetails(tagId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-start pr-8">
            <DialogTitle>タグ詳細</DialogTitle>
            {details && session?.user && (
              // Note: Tags are global entities and do not have an owner, so we don't check for ownership here.
              // Users can report any tag unless they are suspended or have already reported it.
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block" tabIndex={details.hasReported || session?.user?.status === 'SUSPENDED' ? 0 : -1}>
                    <Button
                      variant={details.hasReported ? "secondary" : "ghost"}
                      size="icon"
                      className={`${!details.hasReported ? 'text-muted-foreground' : ''} ${details.hasReported || session?.user?.status === 'SUSPENDED' ? 'opacity-50 cursor-not-allowed' : 'hover:text-destructive'}`}
                      onClick={() => setIsReportOpen(true)}
                      aria-label={session?.user?.status === 'SUSPENDED' ? "アカウントが停止されています" : details.hasReported ? "既に通報済みです" : "このタグを通報する"}
                      disabled={details.hasReported || session?.user?.status === 'SUSPENDED'}
                      data-testid="report-tag-button"
                    >
                      <Flag className={`h-4 w-4 ${details.hasReported ? 'fill-current' : ''}`} />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{session?.user?.status === 'SUSPENDED' ? "アカウントが停止されています" : details.hasReported ? "既に通報済みです" : "このタグを通報する"}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4">
          {loading && <p>読み込み中...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {details && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">{details.displayName || details.name}</h2>

              {/* Description Section */}
              <section>
                <h3 className="text-lg font-semibold border-b mb-2">説明</h3>
                <p className="text-base whitespace-pre-wrap">{details.description || '説明文はありません。'}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => setIsEditorOpen(true)}>説明を編集</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowHistory(!showHistory)}>
                    {showHistory ? '履歴を隠す' : '履歴を表示'}
                  </Button>
                </div>
                {showHistory && <div className="mt-4"><TagDescriptionHistory history={details.history} /></div>}
              </section>

              {/* Wiki Content Section (Issue #252) */}
              {details.wikiContent && (
                <section>
                  <h3 className="text-lg font-semibold border-b mb-2">詳細Wiki</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        // Sanitize links to prevent XSS
                        a: ({ href, children }) => {
                          const sanitizedHref = href ? safeUrl(DOMPurify.sanitize(href)) : '#';
                          return (
                            <a
                              href={sanitizedHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {DOMPurify.sanitize(details.wikiContent)}
                    </ReactMarkdown>
                  </div>
                </section>
              )}

              {/* Distinguishing Features Section (Issue #252) */}
              {details.distinguishingFeatures && details.distinguishingFeatures.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold border-b mb-2">識別要素</h3>
                  <ul className="space-y-1">
                    {details.distinguishingFeatures.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* External Links Section (Issue #252) */}
              {details.externalLinks && details.externalLinks.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold border-b mb-2">外部リンク</h3>
                  <ul className="space-y-2">
                    {details.externalLinks.map((link, index) => (
                      <li key={index}>
                        <a
                          href={safeUrl(DOMPurify.sanitize(link.url))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4 flex-shrink-0" />
                          <span>{link.name}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Tag Hierarchy Section */}
              {(details.parentTags.length > 0 || details.childTags.length > 0) && (
                <section>
                  <h3 className="text-lg font-semibold border-b mb-2">階層構造</h3>
                  {details.parentTags.length > 0 && (
                    <div>
                      <h4 className="font-semibold">親タグ:</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {details.parentTags.map(tag => <Link key={tag.id} href={`/search?tags=${tag.name}`} className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md text-sm hover:bg-gray-300">{tag.displayName || tag.name}</Link>)}
                      </div>
                    </div>
                  )}
                  {details.childTags.length > 0 && (
                    <div className="mt-2">
                      <h4 className="font-semibold">子タグ:</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {details.childTags.map(tag => <Link key={tag.id} href={`/search?tags=${tag.name}`} className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md text-sm hover:bg-gray-300">{tag.displayName || tag.name}</Link>)}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Products Section */}
              {details.products.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold border-b mb-2">このタグが付いた商品</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {details.products.map(product => (
                      <Link href={`/products/${product.id}`} key={product.id} className="block group">
                        <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                          <Image src={product.mainImageUrl || '/images/PolySeek_10_export_icon.svg'} alt={product.title} width={200} height={200} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <p className="text-xs mt-1 truncate">{product.title}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}
        </div>
        <DialogFooter className="flex-shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="outline">閉じる</Button>
          </DialogClose>
        </DialogFooter>
        {details && (
          <>
            <TagDescriptionEditor
              tag={details}
              open={isEditorOpen}
              onOpenChange={setIsEditorOpen}
              onSuccess={handleEditorSuccess}
            />
            <ReportDialog
              open={isReportOpen}
              onOpenChange={(open) => {
                setIsReportOpen(open);
                if (!open && tagId) {
                  fetchDetails(tagId);
                }
              }}
              targetType={REPORT_TARGET_TAG}
              targetId={details.id}
              targetName={details.name}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
