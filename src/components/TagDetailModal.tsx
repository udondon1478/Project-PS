"use client";

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
import { TagDescriptionEditor } from './TagDescriptionEditor';
import { TagDescriptionHistory } from './TagDescriptionHistory';
import { Tag, TagMetadataHistory } from '@prisma/client';
import Link from 'next/link';
import Image from 'next/image';

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
}

interface TagDetailModalProps {
  tagId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagDetailModal({ tagId, open, onOpenChange }: TagDetailModalProps) {
  const [details, setDetails] = useState<TagDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tags/${id}/details`);
      if (!response.ok) {
        throw new Error('Failed to fetch tag details');
      }
      const data = await response.json();
      setDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && tagId) {
      fetchDetails(tagId);
    } else {
      // Reset state when modal is closed
      setDetails(null);
      setShowHistory(false);
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
          <DialogTitle>Tag Details</DialogTitle>
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
            <TagDescriptionEditor
                tag={details}
                open={isEditorOpen}
                onOpenChange={setIsEditorOpen}
                onSuccess={handleEditorSuccess}
            />
        )}
      </DialogContent>
    </Dialog>
  );
}
