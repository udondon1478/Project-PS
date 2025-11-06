"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Tag } from "@prisma/client";

interface TagProposalModalProps {
  sourceTag: Tag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TagProposalModal({
  sourceTag,
  open,
  onOpenChange,
  onSuccess,
}: TagProposalModalProps) {
  const [proposalType, setProposalType] = useState("ALIAS");
  const [targetTagName, setTargetTagName] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // First, get the target tag id from its name
      const res = await fetch(`/api/tags/search?name=${targetTagName}`);
      if (!res.ok) {
        throw new Error("Failed to find the target tag.");
      }
      const targetTags: Tag[] = await res.json();
      if (targetTags.length === 0) {
        throw new Error(`Tag "${targetTagName}" not found.`);
      }
      const targetTag = targetTags[0];


      const response = await fetch("/api/tags/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: proposalType,
          sourceTagId: sourceTag.id,
          targetTagId: targetTag.id,
          comment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit proposal");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Propose a Tag Relationship</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Source Tag</Label>
            <Input value={sourceTag.name} disabled />
          </div>
          <div>
            <Label htmlFor="proposal-type">Relationship Type</Label>
            <Select value={proposalType} onValueChange={setProposalType}>
              <SelectTrigger id="proposal-type">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALIAS">Alias</SelectItem>
                <SelectItem value="IMPLICATION">Implication</SelectItem>
                <SelectItem value="HIERARCHY_PARENT">Parent</SelectItem>
                <SelectItem value="HIERARCHY_CHILD">Child</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="target-tag">Target Tag</Label>
            <Input
              id="target-tag"
              value={targetTagName}
              onChange={(e) => setTargetTagName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit Proposal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
