"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BatchTagResult {
  success?: boolean;
  dryRun?: boolean;
  changes?: Array<{
    productId: string;
    added: string[];
    removed: string[];
  }>;
  error?: string;
}

export default function BatchTagsPage() {
  const [productIds, setProductIds] = useState("");
  const [action, setAction] = useState("add");
  const [tagsToAdd, setTagsToAdd] = useState("");
  const [tagsToRemove, setTagsToRemove] = useState("");
  const [result, setResult] = useState<BatchTagResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (dryRun: boolean) => {
    if (!productIds.trim()) {
      setResult({ error: "Please enter Product IDs" });
      return;
    }

    // Confirmation dialog for execute (not dry run)
    if (!dryRun) {
      const confirmed = window.confirm(
        "Are you sure you want to execute this batch operation? This will modify the tags for all selected products."
      );
      if (!confirmed) {
        return;
      }
    }

    setLoading(true);
    setResult(null);
    try {
      const ids = productIds.split("\n").map(s => s.trim()).filter(Boolean);
      const addList = tagsToAdd.split(",").map(s => s.trim()).filter(Boolean);
      const removeList = tagsToRemove.split(",").map(s => s.trim()).filter(Boolean);

      const res = await fetch("/api/admin/batch-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          productIds: ids,
          tagsToAdd: addList,
          tagsToRemove: removeList,
          dryRun
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setResult({ error: errorData.error || `Request failed with status ${res.status}` });
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Mass Tag Edit (Admin)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productIds">Product IDs (one per line)</Label>
            <Textarea
              id="productIds"
              value={productIds}
              onChange={e => setProductIds(e.target.value)}
              rows={5}
              placeholder="id1&#10;id2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="action">Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger id="action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Tags</SelectItem>
                <SelectItem value="remove">Remove Tags</SelectItem>
                <SelectItem value="replace">Replace Tags</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(action === "add" || action === "replace") && (
            <div className="space-y-2">
              <Label htmlFor="tagsToAdd">Tags to Add (comma separated)</Label>
              <Input
                id="tagsToAdd"
                value={tagsToAdd}
                onChange={e => setTagsToAdd(e.target.value)}
                placeholder="tag1, tag2"
              />
            </div>
          )}

          {(action === "remove" || action === "replace") && (
            <div className="space-y-2">
              <Label htmlFor="tagsToRemove">Tags to Remove (comma separated)</Label>
              <Input
                id="tagsToRemove"
                value={tagsToRemove}
                onChange={e => setTagsToRemove(e.target.value)}
                placeholder="tag3, tag4"
              />
            </div>
          )}

          <div className="flex space-x-2 pt-4">
            <Button variant="outline" onClick={() => handleSubmit(true)} disabled={loading}>
              Dry Run
            </Button>
            <Button onClick={() => handleSubmit(false)} disabled={loading} variant="destructive">
              Execute
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-4 border rounded bg-gray-50 overflow-auto max-h-96">
              <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
