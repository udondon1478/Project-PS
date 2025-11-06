"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Tag } from "@prisma/client";

interface Proposal {
  id: string;
  type: string;
  sourceTag: Tag;
  targetTag: Tag;
  proposer: {
    id: string;
    name: string | null;
    image: string | null;
  };
  comment: string | null;
  status: string;
}

export default function TagProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/tags/proposals?status=PENDING");
      if (!response.ok) {
        throw new Error("Failed to fetch proposals");
      }
      const data = await response.json();
      setProposals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleAction = async (proposalId: string, action: "approve" | "reject") => {
    try {
      const response = await fetch(`/api/admin/tags/proposals/${proposalId}/${action}`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Failed to ${action} proposal`);
      }
      // Refresh the list of proposals
      fetchProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tag Relationship Proposals</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source Tag</TableHead>
            <TableHead>Relationship</TableHead>
            <TableHead>Target Tag</TableHead>
            <TableHead>Proposer</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link href={`/search?tags=${p.sourceTag.name}`} className="hover:underline">
                  {p.sourceTag.name}
                </Link>
              </TableCell>
              <TableCell>{p.type}</TableCell>
              <TableCell>
                <Link href={`/search?tags=${p.targetTag.name}`} className="hover:underline">
                  {p.targetTag.name}
                </Link>
              </TableCell>
              <TableCell>{p.proposer.name}</TableCell>
              <TableCell>{p.comment}</TableCell>
              <TableCell>
                <Badge>{p.status}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAction(p.id, "approve")}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleAction(p.id, "reject")}
                  >
                    Reject
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
