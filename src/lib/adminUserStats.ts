import { prisma } from "@/lib/prisma";
import { countReportsInVisits } from "@/lib/activityLog";

export type UserActivityStats = {
  labScans: number;
  rxScans: number;
  unsavedScans: number;
  savedScans: number;
  hasActivityLogs: boolean;
};

const SCAN_ACTIONS = ["lab_scan", "rx_scan"] as const;
const SAVE_ACTIONS = ["lab_saved", "rx_saved"] as const;

export function statsFromLogRows(
  logs: { action: string; savedToVisit: boolean }[]
): UserActivityStats {
  let labScans = 0;
  let rxScans = 0;
  let unsavedScans = 0;
  let savedScans = 0;
  let hasActivityLogs = false;

  for (const log of logs) {
    if (log.action === "lab_scan") {
      hasActivityLogs = true;
      labScans += 1;
      if (log.savedToVisit) savedScans += 1;
      else unsavedScans += 1;
    }
    if (log.action === "rx_scan") {
      hasActivityLogs = true;
      rxScans += 1;
      if (log.savedToVisit) savedScans += 1;
      else unsavedScans += 1;
    }
    if (SAVE_ACTIONS.includes(log.action as (typeof SAVE_ACTIONS)[number])) {
      hasActivityLogs = true;
      savedScans += 1;
    }
  }

  return { labScans, rxScans, unsavedScans, savedScans, hasActivityLogs };
}

/** Batch-fetch per-user scan stats — no visit JSON. */
export async function batchUserActivityStats(
  userIds: string[]
): Promise<Map<string, UserActivityStats>> {
  const map = new Map<string, UserActivityStats>();
  if (!userIds.length) return map;

  const logs = await prisma.activityLog.findMany({
    where: {
      userId: { in: userIds },
      action: { in: [...SCAN_ACTIONS, ...SAVE_ACTIONS] },
    },
    select: { userId: true, action: true, savedToVisit: true },
  });

  const grouped = new Map<string, { action: string; savedToVisit: boolean }[]>();
  for (const log of logs) {
    const list = grouped.get(log.userId) ?? [];
    list.push({ action: log.action, savedToVisit: log.savedToVisit });
    grouped.set(log.userId, list);
  }

  for (const userId of userIds) {
    map.set(userId, statsFromLogRows(grouped.get(userId) ?? []));
  }

  return map;
}

/** Fallback saved count from visit JSON — only for users without activity logs. */
export async function batchVisitReportCounts(
  userIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!userIds.length) return map;

  const visits = await prisma.visit.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, labReports: true, prescription: true },
  });

  const byUser = new Map<string, { labReports: unknown; prescription: unknown }[]>();
  for (const visit of visits) {
    const list = byUser.get(visit.userId) ?? [];
    list.push({ labReports: visit.labReports, prescription: visit.prescription });
    byUser.set(visit.userId, list);
  }

  for (const userId of userIds) {
    const userVisits = byUser.get(userId) ?? [];
    map.set(userId, countReportsInVisits(userVisits).total);
  }

  return map;
}

/** Latest login per user from activity_logs (single query). */
export async function batchLastLoginFromLogs(
  userIds: string[]
): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  if (!userIds.length) return map;

  const rows = await prisma.activityLog.findMany({
    where: { userId: { in: userIds }, action: "login" },
    orderBy: { createdAt: "desc" },
    distinct: ["userId"],
    select: { userId: true, createdAt: true },
  });

  for (const row of rows) {
    map.set(row.userId, row.createdAt);
  }

  return map;
}

/** How many times each user logged in (repeat-login signal). */
export async function batchLoginCounts(
  userIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of userIds) map.set(id, 0);
  if (!userIds.length) return map;

  const grouped = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, action: "login" },
    _count: { _all: true },
  });

  for (const row of grouped) {
    map.set(row.userId, row._count._all);
  }

  return map;
}
