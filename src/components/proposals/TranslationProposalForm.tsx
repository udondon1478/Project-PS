"use client";

import { TagSearchProposalForm, type TagSearchProposalFormData } from "./TagSearchProposalForm";

interface TranslationProposalFormProps {
  onDataChange: (data: TagSearchProposalFormData | null) => void;
}

export function TranslationProposalForm({ onDataChange }: TranslationProposalFormProps) {
  return (
    <TagSearchProposalForm
      onDataChange={onDataChange}
      idPrefix="translation"
      newTagPlaceholder="翻訳タグ名を入力..."
    />
  );
}
