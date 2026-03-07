"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROPOSAL_REASON_MAX_LENGTH } from "@/lib/constants";

interface TagCategory {
  id: string;
  name: string;
  color: string;
}

interface CategoryProposalFormProps {
  onDataChange: (data: { categoryId: string; reason?: string } | null) => void;
}

export function CategoryProposalForm({ onDataChange }: CategoryProposalFormProps) {
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categoryId) {
      onDataChange({
        categoryId,
        reason: reason.trim() || undefined,
      });
    } else {
      onDataChange(null);
    }
  }, [categoryId, reason, onDataChange]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="category-select">カテゴリ</Label>
        <Select value={categoryId} onValueChange={setCategoryId} disabled={loading}>
          <SelectTrigger id="category-select">
            <SelectValue placeholder={loading ? "読み込み中..." : "カテゴリを選択"} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category-reason">理由（任意）</Label>
        <Textarea
          id="category-reason"
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
