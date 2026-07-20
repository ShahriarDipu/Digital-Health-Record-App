export type AdminSortKey =
  | "lastLoginAt"
  | "labScans"
  | "rxScans"
  | "unsavedScans"
  | "savedScans"
  | "visitCount";

export type AdminSortDir = "asc" | "desc";

export type AdminSortSelectValue = "norm" | "high" | "low";

export type AdminColumnFilters = Record<AdminSortKey, AdminSortSelectValue>;

export const ADMIN_SORT_COLUMNS: {
  key: AdminSortKey;
  labelEn: string;
  labelBn: string;
  shortEn: string;
  shortBn: string;
}[] = [
  {
    key: "lastLoginAt",
    labelEn: "Logins",
    labelBn: "লগইন",
    shortEn: "Logins",
    shortBn: "লগইন",
  },
  {
    key: "labScans",
    labelEn: "Lab",
    labelBn: "ল্যাব",
    shortEn: "Lab",
    shortBn: "ল্যাব",
  },
  {
    key: "rxScans",
    labelEn: "Rx",
    labelBn: "প্রেসক্রিপশন",
    shortEn: "Rx",
    shortBn: "Rx",
  },
  {
    key: "unsavedScans",
    labelEn: "Unsaved",
    labelBn: "আনসেভড",
    shortEn: "Unsaved",
    shortBn: "আনসেভ",
  },
  {
    key: "savedScans",
    labelEn: "Saved",
    labelBn: "সেভড",
    shortEn: "Saved",
    shortBn: "সেভ",
  },
  {
    key: "visitCount",
    labelEn: "Visits",
    labelBn: "ভিজিট",
    shortEn: "Visits",
    shortBn: "ভিজিট",
  },
];

export const DEFAULT_ADMIN_FILTERS: AdminColumnFilters = {
  lastLoginAt: "norm",
  labScans: "norm",
  rxScans: "norm",
  unsavedScans: "norm",
  savedScans: "norm",
  visitCount: "norm",
};

export type AdminUserSortable = {
  lastLoginAt: string | null;
  loginCount: number;
  labScans: number;
  rxScans: number;
  unsavedScans: number;
  savedScans: number;
  visitCount: number;
};

/** Numeric metric used for filter + sort. Logins column uses login count (repeat logins). */
export function adminColumnMetric(
  user: AdminUserSortable,
  key: AdminSortKey
): number {
  switch (key) {
    case "lastLoginAt":
      return user.loginCount;
    case "labScans":
      return user.labScans;
    case "rxScans":
      return user.rxScans;
    case "unsavedScans":
      return user.unsavedScans;
    case "savedScans":
      return user.savedScans;
    case "visitCount":
      return user.visitCount;
    default:
      return 0;
  }
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/**
 * Multi-column filter (AND). High / Low use median of the full list.
 * High + median 0 → only users with value > 0 (when anyone has activity).
 */
export function applyAdminColumnFilters<T extends AdminUserSortable>(
  users: T[],
  filters: AdminColumnFilters
): T[] {
  const active = (Object.entries(filters) as [AdminSortKey, AdminSortSelectValue][])
    .filter(([, mode]) => mode !== "norm");

  if (active.length === 0) return users;

  const cutoffs = {} as Record<AdminSortKey, number>;
  for (const [key] of active) {
    cutoffs[key] = medianOf(users.map((u) => adminColumnMetric(u, key)));
  }

  return users.filter((user) =>
    active.every(([key, mode]) => {
      const value = adminColumnMetric(user, key);
      const cutoff = cutoffs[key];
      if (mode === "high") {
        if (cutoff === 0) return value > 0;
        return value >= cutoff;
      }
      // low
      return value <= cutoff;
    })
  );
}

export function compareAdminUsers(
  a: AdminUserSortable,
  b: AdminUserSortable,
  sortKey: AdminSortKey,
  sortDir: AdminSortDir,
  options?: { /** Logins column: High/Low → count; Norm → recent date */ sortLoginsByCount?: boolean }
): number {
  // Default / Norm on Logins: most recent lastLoginAt first
  if (sortKey === "lastLoginAt" && !options?.sortLoginsByCount) {
    const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : null;
    const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : null;
    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return sortDir === "desc" ? 1 : -1;
    if (bTime === null) return sortDir === "desc" ? -1 : 1;
    return sortDir === "desc" ? bTime - aTime : aTime - bTime;
  }

  const aVal = adminColumnMetric(a, sortKey);
  const bVal = adminColumnMetric(b, sortKey);
  if (aVal !== bVal) {
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  }
  // Tie-break: more recent lastLoginAt first
  const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
  const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
  return bTime - aTime;
}

export function nextSortAfterFilterChange(
  key: AdminSortKey,
  value: AdminSortSelectValue,
  filters: AdminColumnFilters,
  prevSortKey: AdminSortKey
): { sortKey: AdminSortKey; sortDir: AdminSortDir } {
  if (value === "high") return { sortKey: key, sortDir: "desc" };
  if (value === "low") return { sortKey: key, sortDir: "asc" };

  // Cleared this column — keep sorting on another active High/Low if any
  const other = (Object.entries(filters) as [AdminSortKey, AdminSortSelectValue][])
    .find(([k, mode]) => k !== key && mode !== "norm");

  if (other) {
    return {
      sortKey: other[0],
      sortDir: other[1] === "low" ? "asc" : "desc",
    };
  }

  return { sortKey: prevSortKey === key ? "lastLoginAt" : prevSortKey, sortDir: "desc" };
}
