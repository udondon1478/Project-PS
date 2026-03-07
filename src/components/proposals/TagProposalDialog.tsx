"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryProposalForm } from "./CategoryProposalForm";
import { TranslationProposalForm } from "./TranslationProposalForm";
import { ImplicationProposalForm } from "./ImplicationProposalForm";
import type { TagSearchProposalFormData } from "./TagSearchProposalForm";
import {
  PROPOSAL_TYPE_CATEGORY,
  PROPOSAL_TYPE_TRANSLATION,
  PROPOSAL_TYPE_IMPLICATION,
  type ProposalType,
} from "@/lib/constants";
import { toast } from "sonner";

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    if (Array.isArray(obj.formErrors) && obj.formErrors.length > 0) {
      return obj.formErrors.join(', ');
    }
    if (obj.fieldErrors && typeof obj.fieldErrors === 'object') {
      const messages = Object.values(obj.fieldErrors as Record<string, string[]>)
        .flat()
        .filter(Boolean);
      if (messages.length > 0) return messages.join(', ');
    }
  }
  return '提案の送信に失敗しました。';
}

interface TagProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tagId: string;
  tagName: string;
}

export function TagProposalDialog({
  open,
  onOpenChange,
  tagId,
  tagName,
}: TagProposalDialogProps) {
  const [activeTab, setActiveTab] = useState<ProposalType>(PROPOSAL_TYPE_CATEGORY);
  type FormData = { categoryId: string; reason?: string } | TagSearchProposalFormData;
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setActiveTab(PROPOSAL_TYPE_CATEGORY);
      setFormData(null);
      setIsSubmitting(false);
    }
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  const handleDataChange = useCallback((data: FormData | null) => {
    setFormData(data);
  }, []);

  const handleSubmit = async () => {
    if (!formData) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tags/${tagId}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTab, ...formData }),
      });

      if (!response.ok) {
        const data = await response.json();
        const message = extractErrorMessage(data.error);
        throw new Error(message);
      }

      toast.success("提案を送信しました。ご協力ありがとうございます。");
      handleOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "提案の送信に失敗しました。";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>タグ提案: {tagName}</DialogTitle>
          <DialogDescription>
            このタグに対する提案を送信してください。管理者が確認後に反映されます。
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as ProposalType);
            setFormData(null);
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value={PROPOSAL_TYPE_CATEGORY}>カテゴリ</TabsTrigger>
            <TabsTrigger value={PROPOSAL_TYPE_TRANSLATION}>翻訳</TabsTrigger>
            <TabsTrigger value={PROPOSAL_TYPE_IMPLICATION}>含意</TabsTrigger>
          </TabsList>
          <TabsContent value={PROPOSAL_TYPE_CATEGORY} className="mt-4">
            <CategoryProposalForm onDataChange={handleDataChange} />
          </TabsContent>
          <TabsContent value={PROPOSAL_TYPE_TRANSLATION} className="mt-4">
            <TranslationProposalForm onDataChange={handleDataChange} />
          </TabsContent>
          <TabsContent value={PROPOSAL_TYPE_IMPLICATION} className="mt-4">
            <ImplicationProposalForm onDataChange={handleDataChange} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData}
          >
            {isSubmitting ? "送信中..." : "送信"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
