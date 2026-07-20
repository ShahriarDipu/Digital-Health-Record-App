import type { Visit, Prescription, LabReport } from "@/store/useAppStore";

/** Stable fingerprint of prescription + lab data used for analysis */
export function computeVisitSourceFingerprint(
  visit: Pick<Visit, "prescriptions" | "labReports">
): string {
  const normalizePrescription = (p: Prescription) => ({
    medicines: [...p.medicines]
      .map((m) => ({
        name: m.name.trim().toLowerCase(),
        dose: m.dose.trim().toLowerCase(),
        schedule: m.schedule.trim(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });

  const normalizeLab = (r: LabReport) => ({
    type: (r.typeEn || r.type).trim().toLowerCase(),
    date: r.date,
    biomarkers: [...r.biomarkers]
      .map((b) => ({
        name: (b.nameEn || b.name).trim().toLowerCase(),
        value: b.value,
        unit: b.unit.trim().toLowerCase(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });

  const payload = {
    prescriptions: [...visit.prescriptions]
      .map(normalizePrescription)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    labReports: [...visit.labReports]
      .map(normalizeLab)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  };

  return hashString(JSON.stringify(payload));
}

function hashString(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

/** Clear AI analysis but keep fingerprint of what was analyzed (for duplicate detection) */
export function getAnalysisClearPatch(visit: Visit): Partial<Visit> {
  const preservedFingerprint =
    visit.healthReport?.sourceFingerprint ??
    visit.lastAnalysisFingerprint ??
    computeVisitSourceFingerprint(visit);

  return {
    healthReport: undefined,
    lifestyleDirections: undefined,
    lastAnalysisFingerprint: preservedFingerprint,
  };
}

export function shouldClearAnalysis(
  visit: Visit,
  next: Pick<Visit, "prescriptions" | "labReports">
): boolean {
  if (!visit.healthReport) return false;
  const currentFp = computeVisitSourceFingerprint(visit);
  const nextFp = computeVisitSourceFingerprint(next);
  return currentFp !== nextFp;
}

export function getLatestPersonalizedVisit(visits: Visit[]): Visit | undefined {
  return visits
    .filter((v) => v.lifestyleDirections)
    .sort(
      (a, b) =>
        new Date(b.lifestyleDirections!.generatedAt).getTime() -
        new Date(a.lifestyleDirections!.generatedAt).getTime()
    )[0];
}
