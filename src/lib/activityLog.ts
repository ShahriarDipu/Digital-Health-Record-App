import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type ActivityAction =
  | "login"
  | "lab_scan"
  | "rx_scan"
  | "lab_saved"
  | "rx_saved"
  | "visit_create"
  | "save_intent";

export type ActivitySource = "main_tab" | "visit_tab" | "save_modal" | null;

type LogActivityInput = {
  userId: string;
  action: ActivityAction;
  source?: ActivitySource;
  savedToVisit?: boolean;
  metadata?: Prisma.InputJsonValue;
};

/** Fire-and-forget activity log — never throws to callers. */
export function logActivity(input: LogActivityInput): void {
  void prisma.activityLog
    .create({
      data: {
        userId: input.userId,
        action: input.action,
        source: input.source ?? null,
        savedToVisit: input.savedToVisit ?? false,
        metadata: input.metadata ?? undefined,
      },
    })
    .catch((err) => console.error("activity log failed:", err));
}

export function touchUserActive(userId: string): void {
  void prisma.user
    .update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    })
    .catch((err) => console.error("lastActiveAt update failed:", err));
}

export function labScanMetadata(report: {
  type?: string;
  typeEn?: string;
  typeBn?: string;
  biomarkers?: unknown[];
}): Record<string, string | number> {
  const label = report.typeEn || report.typeBn || report.type || "Lab report";
  return {
    summary: String(label).slice(0, 120),
    biomarkerCount: Array.isArray(report.biomarkers) ? report.biomarkers.length : 0,
  };
}

export function rxScanMetadata(prescription: {
  doctorName?: string;
  medicines?: unknown[];
}): Record<string, string | number> {
  return {
    summary: (prescription.doctorName || "Prescription").slice(0, 120),
    medicineCount: Array.isArray(prescription.medicines) ? prescription.medicines.length : 0,
  };
}

export function countReportsInVisits(
  visits: { labReports: unknown; prescription: unknown }[]
): { labReports: number; prescriptions: number; total: number } {
  let labReports = 0;
  let prescriptions = 0;

  for (const visit of visits) {
    if (Array.isArray(visit.labReports)) {
      labReports += visit.labReports.length;
    }
    const prescription = visit.prescription;
    if (Array.isArray(prescription)) {
      prescriptions += prescription.length;
    } else if (prescription && typeof prescription === "object") {
      prescriptions += 1;
    }
  }

  return { labReports, prescriptions, total: labReports + prescriptions };
}
