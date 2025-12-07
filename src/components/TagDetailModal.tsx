"use client";

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
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
import { Flag } from 'lucide-react';
import { ReportDialog } from './reports/ReportDialog';

// Define the shape of the data expected from the API
interface TagDetails extends Tag {
  parentTags: Tag[];
  childTags: Tag[];
  products: {
    id: string;
    title: string;
    mainImageUrl: string | null;
  }[];
  history: (TagMetadataHistory & { editor: { id: string; name: string | null; image: string | null; }})[];
  hasReported?: boolean;
}

interface TagDetailModalProps {
  tagId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
        let errorMessage = 'Failed to fetch tag details';
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
      setError(err instanceof Error ? err.message : 'Failed to load tag details');
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
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-start pr-8">
            <DialogTitle>Tag Details</DialogTitle>
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
          {loading && <p>Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {details && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">{details.name}</h2>

              {/* Description Section */}
              <section>
                <h3 className="text-lg font-semibold border-b mb-2">Description</h3>
                <p className="text-base whitespace-pre-wrap">{details.description || 'No description available.'}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => setIsEditorOpen(true)}>Edit Description</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowHistory(!showHistory)}>
                    {showHistory ? 'Hide' : 'View'} History
                  </Button>
                </div>
                {showHistory && <div className="mt-4"><TagDescriptionHistory history={details.history} /></div>}
              </section>

              {/* Tag Hierarchy Section */}
              {(details.parentTags.length > 0 || details.childTags.length > 0) && (
                <section>
                  <h3 className="text-lg font-semibold border-b mb-2">Hierarchy</h3>
                  {details.parentTags.length > 0 && (
                    <div>
                      <h4 className="font-semibold">Parent Tags:</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {details.parentTags.map(tag => <Link key={tag.id} href={`/search?tags=${tag.name}`} className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md text-sm hover:bg-gray-300">{tag.name}</Link>)}
                      </div>
                    </div>
                  )}
                  {details.childTags.length > 0 && (
                    <div className="mt-2">
                      <h4 className="font-semibold">Child Tags:</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {details.childTags.map(tag => <Link key={tag.id} href={`/search?tags=${tag.name}`} className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md text-sm hover:bg-gray-300">{tag.name}</Link>)}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Products Section */}
              {details.products.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold border-b mb-2">Products with this tag</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {details.products.map(product => (
                      <Link href={`/products/${product.id}`} key={product.id} className="block group">
                        <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                          <Image src={product.mainImageUrl || '/pslogo.svg'} alt={product.title} width={200} height={200} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
            <Button type="button" variant="outline">Close</Button>
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
