import type { SaveIntentSource } from "@/lib/saveIntent";
import type { WhySaveScanTarget } from "@/lib/whySaveScan";

/**
 * In-memory only — survives SPA remounts in the same tab, clears on full page reload.
 * After the Why-Save modal once, later scans reuse this choice until reload.
 */
export type WhySaveSessionChoice =
  | { kind: "skip" }
  | { kind: "visit"; target: WhySaveScanTarget };

const sessions = new Map<SaveIntentSource, WhySaveSessionChoice>();

export function getWhySaveSession(
  source: SaveIntentSource
): WhySaveSessionChoice | null {
  return sessions.get(source) ?? null;
}

export function setWhySaveSession(
  source: SaveIntentSource,
  choice: WhySaveSessionChoice
): void {
  sessions.set(source, choice);
}

/** After first successful create/follow-up, pin later scans to that visit id. */
export function lockWhySaveSessionToVisit(
  source: SaveIntentSource,
  visitId: string
): void {
  sessions.set(source, {
    kind: "visit",
    target: { mode: "existing", visitId },
  });
}

export function scanTargetFromSession(
  choice: WhySaveSessionChoice | null
): WhySaveScanTarget | null {
  if (!choice || choice.kind === "skip") return null;
  return choice.target;
}
