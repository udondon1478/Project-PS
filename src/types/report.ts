import { ReportTargetType, ReportStatus } from "@/lib/constants";

export interface Report {
  id: string;
  reporterId: string | null;
  targetType: ReportTargetType;
  tagId: string | null;
  productTagId: string | null;
  productId: string | null;
  reason: string;
  status: ReportStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type ReportWithDetails = Report & {
  reporter: {
    name: string | null;
    email: string | null;
  };
  targetName?: string;
  targetContext?: string;
  targetUrl?: string;
};
