"use client";

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Eye, Edit } from 'lucide-react';

/**
 * Definition of an external link associated with a tag.
 */
interface ExternalLink {
  /** Unique ID for frontend state management (removed before API submission) */
  id: string;
  /** Display name of the link */
  name: string;
  /** Valid URL string */
  url: string;
}

/**
 * Definition of a distinguishing feature for a tag.
 */
interface DistinguishingFeature {
  /** Unique ID for frontend state management (removed before API submission) */
  id: string;
  /** The descriptive text of the feature */
  value: string;
}

/**
 * Interface representing the tag data structure used in the editor.
 */
interface Tag {
  id: string;
  name: string;
  displayName?: string | null;
  description: string | null;
  wikiContent?: string | null;
  externalLinks?: ExternalLink[] | null;
  distinguishingFeatures?: string[] | null;
}

/**
 * Props for the TagDescriptionEditor component.
 */
interface TagDescriptionEditorProps {
  /** The tag object to edit. If null, the editor will not render content. */
  tag: Tag | null;
  /** Boolean indicating if the dialog is open */
  open: boolean;
  /** Callback to handle dialog open/close state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback triggered after a successful update */
  onSuccess: () => void;
}

/**
 * A modal dialog component for editing tag details.
 * 
 * Provides a tabbed interface for editing:
 * - Basic Information (Description)
 * - Wiki Content (Markdown with preview)
 * - External Links & Distinguishing Features
 * 
 * Handles validation, API submission via PUT request, and state management.
 */
export function TagDescriptionEditor({ tag, open, onOpenChange, onSuccess }: TagDescriptionEditorProps) {
  const [description, setDescription] = useState('');
  const [wikiContent, setWikiContent] = useState('');
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [distinguishingFeatures, setDistinguishingFeatures] = useState<DistinguishingFeature[]>([]);
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [showWikiPreview, setShowWikiPreview] = useState(false);

  useEffect(() => {
    if (tag) {
      setDescription(tag.description || '');
      setWikiContent(tag.wikiContent || '');
      setExternalLinks(
        (tag.externalLinks || []).map((link) => ({
          ...link,
          id: Math.random().toString(36).substring(7),
        }))
      );
      setDistinguishingFeatures(
        (tag.distinguishingFeatures || []).map((feature) => ({
          id: Math.random().toString(36).substring(7),
          value: feature,
        }))
      );
    }
    if (open) {
      setComment('');
      setActiveTab('basic');
      setShowWikiPreview(false);
      setError(null);
    }
  }, [tag, open]);

  const handleAddLink = () => {
    setExternalLinks([...externalLinks, { id: Math.random().toString(36).substring(7), name: '', url: '' }]);
  };

  const handleRemoveLink = (index: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: 'name' | 'url', value: string) => {
    const updated = [...externalLinks];
    updated[index] = { ...updated[index], [field]: value };
    setExternalLinks(updated);
  };

  const handleAddFeature = () => {
    setDistinguishingFeatures([...distinguishingFeatures, { id: Math.random().toString(36).substring(7), value: '' }]);
  };

  const handleRemoveFeature = (id: string) => {
    setDistinguishingFeatures(distinguishingFeatures.filter((feature) => feature.id !== id));
  };

  const handleFeatureChange = (id: string, value: string) => {
    setDistinguishingFeatures(
      distinguishingFeatures.map((feature) =>
        feature.id === id ? { ...feature, value } : feature
      )
    );
  };

  /**
   * Validates that a URL uses only http:// or https:// protocol.
   * @param url - The URL string to validate
   * @returns true if the URL is valid and uses http/https, false otherwise
   */
  const isValidUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag) return;

    setIsSaving(true);
    setError(null);

    // Filter out empty links and trim values
    const trimmedLinks = externalLinks
      .map(link => ({ ...link, name: link.name.trim(), url: link.url.trim() }))
      .filter((link) => link.name && link.url);

    // Validate that all URLs use http:// or https://
    for (let i = 0; i < trimmedLinks.length; i++) {
      if (!isValidUrl(trimmedLinks[i].url)) {
        setError(`無効なURLです: ${trimmedLinks[i].url}。http://またはhttps://で始まるURLを使用してください。`);
        setIsSaving(false);
        return;
      }
    }

    const validLinks = trimmedLinks.map(({ id, ...rest }) => rest);
    const validFeatures = distinguishingFeatures
      .map((feature) => feature.value.trim())
      .filter((value) => value);

    try {
      const response = await fetch(`/api/tags/${tag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          wikiContent: wikiContent || null,
          externalLinks: validLinks.length > 0 ? validLinks : [],
          distinguishingFeatures: validFeatures.length > 0 ? validFeatures : [],
          comment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (!tag) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>タグ編集: {tag.displayName || tag.name}</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="wiki">Wiki</TabsTrigger>
              <TabsTrigger value="links">リンク・要素</TabsTrigger>
            </TabsList>
            
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="タグの説明を入力..."
                  rows={5}
                />
              </div>
            </TabsContent>
            
            {/* Wiki Tab */}
            <TabsContent value="wiki" className="space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="wikiContent">Wikiコンテンツ (Markdown)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWikiPreview(!showWikiPreview)}
                >
                  {showWikiPreview ? <Edit className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showWikiPreview ? '編集' : 'プレビュー'}
                </Button>
              </div>
              
              {showWikiPreview ? (
                <div className="prose prose-sm dark:prose-invert max-w-none border rounded-md p-4 min-h-[200px]">
                  {wikiContent ? (
                    <ReactMarkdown
                      components={{
                        // Override link rendering to only allow http/https protocols
                        a: ({ href, children }) => {
                          if (!href) return <span className="text-muted-foreground">{children}</span>;
                          try {
                            const url = new URL(href);
                            if (url.protocol === 'http:' || url.protocol === 'https:') {
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  {children}
                                </a>
                              );
                            }
                          } catch {
                            // Invalid URL
                          }
                          return <span className="text-muted-foreground">{children}</span>;
                        },
                      }}
                    >
                      {DOMPurify.sanitize(wikiContent)}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground">コンテンツがありません</p>
                  )}
                </div>
              ) : (
                <Textarea
                  id="wikiContent"
                  value={wikiContent}
                  onChange={(e) => setWikiContent(e.target.value)}
                  placeholder="## 特徴&#10;- 項目1&#10;- 項目2&#10;&#10;詳細な説明をMarkdown形式で記述..."
                  rows={10}
                  className="font-mono text-sm"
                />
              )}
            </TabsContent>
            
            {/* Links & Features Tab */}
            <TabsContent value="links" className="space-y-6">
              {/* External Links */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>外部リンク</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddLink}>
                    <Plus className="h-4 w-4 mr-1" />
                    追加
                  </Button>
                </div>
                {externalLinks.map((link, index) => (
                  <div key={link.id} className="flex gap-2 items-start">
                    <Input
                      placeholder="リンク名"
                      value={link.name}
                      onChange={(e) => handleLinkChange(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="URL"
                      value={link.url}
                      onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveLink(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {externalLinks.length === 0 && (
                  <p className="text-sm text-muted-foreground">外部リンクがありません</p>
                )}
              </div>
              
              {/* Distinguishing Features */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>識別要素</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddFeature}>
                    <Plus className="h-4 w-4 mr-1" />
                    追加
                  </Button>
                </div>
                {distinguishingFeatures.map((feature) => (
                  <div key={feature.id} className="flex gap-2 items-center">
                    <Input
                      placeholder="識別要素を入力..."
                      value={feature.value}
                      onChange={(e) => handleFeatureChange(feature.id, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFeature(feature.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {distinguishingFeatures.length === 0 && (
                  <p className="text-sm text-muted-foreground">識別要素がありません</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Comment field (always visible) */}
          <div className="grid w-full gap-1.5 mt-4">
            <Label htmlFor="comment">編集コメント (任意)</Label>
            <Input
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="変更の理由を入力してください"
            />
          </div>
          
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                キャンセル
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
