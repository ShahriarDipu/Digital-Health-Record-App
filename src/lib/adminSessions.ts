export type ActivityRow = {
  id: string;
  action: string;
  source: string | null;
  savedToVisit: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  synthetic?: boolean;
};

export type LoginSession = {
  id: string;
  loginAt: string;
  label: string;
  activities: ActivityRow[];
  labScans: number;
  rxScans: number;
  savedCount: number;
  unsavedCount: number;
  visitsCreated: number;
};

export type UserScanStats = {
  labScans: number;
  rxScans: number;
  unsavedScans: number;
  savedScans: number;
  hasActivityLogs: boolean;
};

const SCAN_ACTIONS = new Set(["lab_scan", "rx_scan"]);
const SAVE_ACTIONS = new Set(["lab_saved", "rx_saved"]);

export function statsFromLogs(
  logs: { action: string; savedToVisit: boolean }[]
): UserScanStats {
  let labScans = 0;
  let rxScans = 0;
  let unsavedScans = 0;
  let savedScans = 0;

  for (const log of logs) {
    if (log.action === "lab_scan") labScans += 1;
    if (log.action === "rx_scan") rxScans += 1;
    if (SCAN_ACTIONS.has(log.action) && !log.savedToVisit) unsavedScans += 1;
    if (SCAN_ACTIONS.has(log.action) && log.savedToVisit) savedScans += 1;
    if (SAVE_ACTIONS.has(log.action)) savedScans += 1;
  }

  return {
    labScans,
    rxScans,
    unsavedScans,
    savedScans,
    hasActivityLogs: logs.some((l) => SCAN_ACTIONS.has(l.action) || SAVE_ACTIONS.has(l.action)),
  };
}

export function buildLoginSessions(
  logs: ActivityRow[],
  options?: { joinedAt?: string }
): LoginSession[] {
  const chronological = [...logs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const sessions: LoginSession[] = [];
  let current: LoginSession | null = null;

  const pushCurrent = () => {
    if (current) sessions.push(current);
    current = null;
  };

  const ensureSession = (at: string, label: string, id: string) => {
    if (!current) {
      current = {
        id,
        loginAt: at,
        label,
        activities: [],
        labScans: 0,
        rxScans: 0,
        savedCount: 0,
        unsavedCount: 0,
        visitsCreated: 0,
      };
    }
    return current;
  };

  const addActivity = (session: LoginSession, row: ActivityRow) => {
    session.activities.push(row);
    if (row.action === "lab_scan") session.labScans += 1;
    if (row.action === "rx_scan") session.rxScans += 1;
    if (SCAN_ACTIONS.has(row.action) && !row.savedToVisit) session.unsavedCount += 1;
    if (SCAN_ACTIONS.has(row.action) && row.savedToVisit) session.savedCount += 1;
    if (SAVE_ACTIONS.has(row.action)) session.savedCount += 1;
    if (row.action === "visit_create") session.visitsCreated += 1;
  };

  for (const row of chronological) {
    if (row.action === "login") {
      pushCurrent();
      current = {
        id: row.id,
        loginAt: row.createdAt,
        label: "Login session",
        activities: [],
        labScans: 0,
        rxScans: 0,
        savedCount: 0,
        unsavedCount: 0,
        visitsCreated: 0,
      };
      continue;
    }

    if (!current) {
      const session = ensureSession(
        row.createdAt,
        "Earlier activity (login not tracked)",
        "orphan-session"
      );
      addActivity(session, row);
      continue;
    }

    addActivity(current, row);
  }

  pushCurrent();

  if (sessions.length === 0 && options?.joinedAt) {
    return [];
  }

  return sessions.sort(
    (a, b) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime()
  );
}

import { formatSaveIntentReasons } from "@/lib/saveIntent";
import type { Language } from "@/lib/translations";

export function activitySummary(
  row: ActivityRow,
  language: Language = "en"
): string {
  const meta = row.metadata;
  if (row.action === "save_intent") {
    const reasons = formatSaveIntentReasons(
      Array.isArray(meta?.reasons) ? (meta!.reasons as string[]) : [],
      language
    );
    const choice =
      meta?.choseHealthRecord === true
        ? "Module feedback — create record"
        : "Module feedback only — skip record";
    const source =
      meta?.uploadSource === "lab_report"
        ? language === "bn"
          ? "ল্যাব"
          : "Lab"
        : meta?.uploadSource === "prescription"
          ? "Rx"
          : "";
    const parts = [choice, source && `(${source})`, reasons !== "—" && reasons].filter(
      Boolean
    );
    return (
      parts.join(" · ") ||
      (language === "bn" ? "Save intent ফিডব্যাক" : "Save intent feedback")
    );
  }
  if (meta?.summary && typeof meta.summary === "string") return meta.summary;
  if (meta?.doctorName && typeof meta.doctorName === "string") return meta.doctorName;
  return row.action;
}
