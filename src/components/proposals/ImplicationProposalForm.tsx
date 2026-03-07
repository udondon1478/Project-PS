"use client";

import { TagSearchProposalForm, type TagSearchProposalFormData } from "./TagSearchProposalForm";

interface ImplicationProposalFormProps {
  onDataChange: (data: TagSearchProposalFormData | null) => void;
}

export function ImplicationProposalForm({ onDataChange }: ImplicationProposalFormProps) {
  return (
    <TagSearchProposalForm
      onDataChange={onDataChange}
      idPrefix="impl"
      newTagPlaceholder="含意タグ名を入力..."
    />
  );
}
