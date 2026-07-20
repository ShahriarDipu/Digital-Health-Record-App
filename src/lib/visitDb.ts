import type { Prescription, Visit } from "@/store/useAppStore";

function normalizePrescriptions(raw: unknown): Prescription[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Prescription[];
  if (typeof raw === "object") return [raw as Prescription];
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbToVisit(d: any): Visit {
  return {
    id: d.id,
    doctorName: d.doctorName,
    visitDate: d.visitDate,
    clinicName: d.clinicName ?? undefined,
    chiefComplaint: d.chiefComplaint ?? undefined,
    prescriptions: normalizePrescriptions(d.prescription),
    labReports: Array.isArray(d.labReports) ? d.labReports : [],
    healthReport: d.healthReport ?? undefined,
    lifestyleDirections: d.lifestyleDirections ?? undefined,
    visitType: d.visitType === "followup" ? "followup" : "initial",
    parentVisitId: d.parentVisitId ?? undefined,
    progressReport: d.progressReport ?? undefined,
    lastAnalysisFingerprint: d.lastAnalysisFingerprint ?? undefined,
    createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date(d.createdAt).toISOString(),
  };
}
