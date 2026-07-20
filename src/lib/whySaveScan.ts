import { dbToVisit } from "@/lib/visitDb";
import type { Visit } from "@/store/useAppStore";

export type WhySaveScanTarget =
  | { mode: "existing"; visitId: string }
  | {
      mode: "followup";
      doctorName: string;
      visitDate: string;
      parentVisitId: string;
      clinicName?: string;
    }
  | { mode: "create"; doctorName: string; visitDate: string };

function doctorKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Root (initial) visit for a doctor — used as parent for auto follow-ups. */
export function findDoctorRootVisit(
  visits: Visit[],
  doctorName: string
): Visit | null {
  const key = doctorKey(doctorName);
  const doctorVisits = visits.filter(
    (v) => doctorKey(v.doctorName) === key
  );
  if (doctorVisits.length === 0) return null;

  const roots = doctorVisits.filter((v) => !v.parentVisitId);
  if (roots.length > 0) {
    return [...roots].sort((a, b) => a.visitDate.localeCompare(b.visitDate))[0];
  }

  return [...doctorVisits].sort((a, b) =>
    a.visitDate.localeCompare(b.visitDate)
  )[0];
}

/**
 * - Same doctor + same date → add to that visit
 * - Same doctor + new date → auto follow-up under that doctor's root
 * - New doctor → create initial visit
 */
export function planWhySaveScan(
  visits: Visit[],
  doctorName: string,
  visitDate: string
): WhySaveScanTarget {
  const name = doctorName.trim();
  const key = doctorKey(name);
  const doctorVisits = visits.filter((v) => doctorKey(v.doctorName) === key);

  if (doctorVisits.length === 0) {
    return { mode: "create", doctorName: name, visitDate };
  }

  const sameDate = doctorVisits.find((v) => v.visitDate === visitDate);
  if (sameDate) {
    return { mode: "existing", visitId: sameDate.id };
  }

  const root = findDoctorRootVisit(visits, name)!;
  return {
    mode: "followup",
    doctorName: root.doctorName,
    visitDate,
    parentVisitId: root.id,
    clinicName: root.clinicName,
  };
}

export function visitForExistingTarget(
  visits: Visit[],
  target: Extract<WhySaveScanTarget, { mode: "existing" }>
): Visit | undefined {
  return visits.find((v) => v.id === target.visitId);
}

/** Create visit (initial or follow-up) after a successful scan. Existing → return id. */
export async function resolveVisitIdFromScanTarget(
  target: WhySaveScanTarget,
  addVisit: (visit: Visit) => void
): Promise<string> {
  if (target.mode === "existing") return target.visitId;

  const body =
    target.mode === "followup"
      ? {
          doctorName: target.doctorName,
          visitDate: target.visitDate,
          clinicName: target.clinicName,
          visitType: "followup" as const,
          parentVisitId: target.parentVisitId,
        }
      : {
          doctorName: target.doctorName,
          visitDate: target.visitDate,
        };

  const res = await fetch("/api/visits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("VISIT_CREATE_FAILED");
  }

  const visit = dbToVisit(await res.json());
  addVisit(visit);
  return visit.id;
}

/** PATCH visit after scan; throws if the server rejects the update. */
export async function patchVisitAfterScan(
  visitId: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`/api/visits/${visitId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error("VISIT_ATTACH_FAILED");
  }
}
