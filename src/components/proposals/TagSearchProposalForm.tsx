"use client";

import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROPOSAL_REASON_MAX_LENGTH,
  PROPOSAL_SUPPORTED_LANGUAGES,
} from "@/lib/constants";

export interface TagSearchProposalFormData {
  existingTagId?: string;
  newTagName?: string;
  language?: string;
  reason?: string;
}

interface TagSearchProposalFormProps {
  onDataChange: (data: TagSearchProposalFormData | null) => void;
  idPrefix: string;
  newTagPlaceholder: string;
}

type InputMode = "existing" | "new";

export function TagSearchProposalForm({
  onDataChange,
  idPrefix,
  newTagPlaceholder,
}: TagSearchProposalFormProps) {
  const [mode, setMode] = useState<InputMode>("existing");
  const [existingTagId, setExistingTagId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [language, setLanguage] = useState("");
  const [reason, setReason] = useState("");

  const searchTags = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/tags/search?q=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.tags || data);
      }
    } catch {
      setSearchResults([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchTags(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchTags]);

  useEffect(() => {
    const reasonTrimmed = reason.trim() || undefined;

    if (mode === "existing" && existingTagId) {
      onDataChange({ existingTagId, reason: reasonTrimmed });
    } else if (mode === "new" && newTagName.trim() && language) {
      onDataChange({ newTagName: newTagName.trim(), language, reason: reasonTrimmed });
    } else {
      onDataChange(null);
    }
  }, [mode, existingTagId, newTagName, language, reason, onDataChange]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>入力方式</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as InputMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="existing">既存タグから選択</SelectItem>
            <SelectItem value="new">新しいタグ名を入力</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "existing" ? (
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-tag-search`}>タグ検索</Label>
          <Input
            id={`${idPrefix}-tag-search`}
            placeholder="タグ名を入力して検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="border rounded-md max-h-32 overflow-y-auto">
              {searchResults.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent ${
                    existingTagId === tag.id ? "bg-accent font-medium" : ""
                  }`}
                  onClick={() => setExistingTagId(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
          {existingTagId && (
            <p className="text-sm text-muted-foreground">
              選択中: {searchResults.find((t) => t.id === existingTagId)?.name || existingTagId}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-new-tag-name`}>新しいタグ名</Label>
            <Input
              id={`${idPrefix}-new-tag-name`}
              placeholder={newTagPlaceholder}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-language-select`}>言語</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id={`${idPrefix}-language-select`}>
                <SelectValue placeholder="言語を選択" />
              </SelectTrigger>
              <SelectContent>
                {PROPOSAL_SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang === "ja" ? "日本語" : "English"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-reason`}>理由（任意）</Label>
        <Textarea
          id={`${idPrefix}-reason`}
          placeholder="この提案の理由を入力してください..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={PROPOSAL_REASON_MAX_LENGTH}
          className="min-h-[80px]"
        />
        <div className="text-right text-xs text-muted-foreground">
          {reason.length} / {PROPOSAL_REASON_MAX_LENGTH}
        </div>
      </div>
    </div>
  );
}
