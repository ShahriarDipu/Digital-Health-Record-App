"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  FileText,
  FlaskConical,
  Loader2,
  LogIn,
  Search,
  Stethoscope,
  Users,
} from "lucide-react";
import { AdminSortSelect } from "@/components/AdminSortSelect";
import { formatAdminDate } from "@/components/AdminUserDetail";
import {
  ADMIN_SORT_COLUMNS,
  DEFAULT_ADMIN_FILTERS,
  applyAdminColumnFilters,
  compareAdminUsers,
  nextSortAfterFilterChange,
  type AdminColumnFilters,
  type AdminSortDir,
  type AdminSortKey,
  type AdminSortSelectValue,
} from "@/lib/adminSort";
import { getT } from "@/lib/translations";
import { useAppStore } from "@/store/useAppStore";

type Stats = {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  loginsToday: number;
  scansToday: number;
  visitsToday: number;
  totalVisits: number;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  lastLoginAt: string | null;
  loginCount: number;
  visitCount: number;
  labScans: number;
  rxScans: number;
  unsavedScans: number;
  savedScans: number;
  status: "new" | "returning";
};

const DEFAULT_SORT_KEY: AdminSortKey = "lastLoginAt";
const DEFAULT_SORT_DIR: AdminSortDir = "desc";

function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-t border-slate-100 animate-pulse">
          <td className="px-3 py-3">
            <div className="h-4 w-32 bg-slate-100 rounded mb-1.5" />
            <div className="h-3 w-40 bg-slate-50 rounded" />
          </td>
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-3 py-3">
              <div className="h-4 w-8 bg-slate-100 rounded ml-auto" />
            </td>
          ))}
          <td />
        </tr>
      ))}
    </>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { language, setLanguage } = useAppStore();
  const isBn = language === "bn";
  const t = getT(language).adminDash;

  const [usersLoading, setUsersLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<AdminColumnFilters>(DEFAULT_ADMIN_FILTERS);
  const [sortKey, setSortKey] = useState<AdminSortKey>(DEFAULT_SORT_KEY);
  const [sortDir, setSortDir] = useState<AdminSortDir>(DEFAULT_SORT_DIR);

  useEffect(() => {
    setError("");

    fetch("/api/admin/users")
      .then(async (res) => {
        if (res.status === 403 || res.status === 401) {
          setForbidden(true);
          return;
        }
        if (!res.ok) throw new Error("users");
        setUsers(await res.json());
      })
      .catch(() => setError(t.loadUsersFail))
      .finally(() => setUsersLoading(false));

    fetch("/api/admin/stats")
      .then(async (res) => {
        if (res.status === 403 || res.status === 401) {
          setForbidden(true);
          return;
        }
        if (!res.ok) throw new Error("stats");
        setStats(await res.json());
      })
      .catch(() => setError(t.loadStatsFail))
      .finally(() => setStatsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const handleFilterChange = (key: AdminSortKey, value: AdminSortSelectValue) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    const nextSort = nextSortAfterFilterChange(key, value, nextFilters, sortKey);
    setSortKey(nextSort.sortKey);
    setSortDir(nextSort.sortDir);
  };

  const displayedUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = applyAdminColumnFilters(users, filters);

    if (query) {
      list = list.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    return [...list].sort((a, b) =>
      compareAdminUsers(a, b, sortKey, sortDir, {
        sortLoginsByCount: filters.lastLoginAt !== "norm",
      })
    );
  }, [users, search, filters, sortKey, sortDir]);

  const optionLabels = {
    norm: t.norm,
    high: t.high,
    low: t.low,
  };

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-slate-50">
        <AlertCircle className="w-12 h-12 text-amber-500" />
        <p className="text-gray-700 text-center">{t.accessOnly}</p>
        <Link href="/dashboard" className="text-teal-700 font-medium hover:underline">
          {t.backDashboard}
        </Link>
      </div>
    );
  }

  const statCardDefs = [
    { label: t.totalUsers, key: "totalUsers" as const, icon: Users },
    { label: t.newToday, key: "newUsersToday" as const, icon: Users },
    { label: t.newWeek, key: "newUsersWeek" as const, icon: Users },
    { label: t.loginsToday, key: "loginsToday" as const, icon: LogIn },
    { label: t.scansToday, key: "scansToday" as const, icon: FlaskConical },
    { label: t.visitsToday, key: "visitsToday" as const, icon: Stethoscope },
    { label: t.totalVisits, key: "totalVisits" as const, icon: FileText },
  ];

  const openUser = (id: string) => router.push(`/admin/users/${id}`);

  const columnLabel = (col: (typeof ADMIN_SORT_COLUMNS)[number], short?: boolean) =>
    short
      ? isBn
        ? col.shortBn
        : col.shortEn
      : isBn
        ? col.labelBn
        : col.labelEn;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 flex-shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                {t.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 truncate hidden sm:block">
                {t.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => setLanguage(isBn ? "en" : "bn")}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isBn ? "EN" : "বাং"}
            </button>
            <Link
              href="/blog/admin"
              className="text-xs sm:text-sm font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
            >
              {t.blogAdmin}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3">
          {statCardDefs.map((card) => (
            <div
              key={card.key}
              className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm"
            >
              <div className="flex items-center gap-1.5 text-slate-500 mb-0.5 sm:mb-1">
                <card.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[10px] sm:text-xs truncate">{card.label}</span>
              </div>
              {statsLoading ? (
                <div className="h-7 sm:h-8 w-12 bg-slate-100 rounded animate-pulse" />
              ) : (
                <p className="text-xl sm:text-2xl font-semibold text-slate-900">
                  {stats?.[card.key] ?? 0}
                </p>
              )}
            </div>
          ))}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-3 sm:px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <h2 className="font-medium text-slate-900 text-sm sm:text-base">{t.users}</h2>
              <span className="text-xs text-slate-400 ml-auto sm:ml-2 flex items-center gap-1.5">
                {usersLoading && <Loader2 className="w-3 h-3 animate-spin text-teal-600" />}
                {usersLoading
                  ? t.loading
                  : `${displayedUsers.length} ${t.shown}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 sm:ml-auto">{t.filterHint}</p>
          </div>

          {/* Mobile: search + filters */}
          <div className="md:hidden px-3 py-3 border-b border-slate-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchName}
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 focus:bg-white"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {ADMIN_SORT_COLUMNS.map((col) => (
                <div key={col.key} className="flex-shrink-0">
                  <AdminSortSelect
                    columnKey={col.key}
                    label={columnLabel(col, true)}
                    value={filters[col.key]}
                    onChange={handleFilterChange}
                    optionLabels={optionLabels}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-3 align-bottom min-w-[220px]">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-500">{t.name}</p>
                      <div className="relative max-w-[200px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder={t.searchShort}
                          className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  </th>
                  {ADMIN_SORT_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={`px-3 py-3 align-bottom ${
                        col.key === "lastLoginAt" ? "text-left" : "text-right"
                      }`}
                    >
                      <div
                        className={
                          col.key === "lastLoginAt" ? "" : "inline-flex justify-end w-full"
                        }
                      >
                        <AdminSortSelect
                          columnKey={col.key}
                          label={columnLabel(col)}
                          value={filters[col.key]}
                          onChange={handleFilterChange}
                          optionLabels={optionLabels}
                        />
                      </div>
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {usersLoading && <SkeletonRows count={6} />}
                {!usersLoading && displayedUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      {t.noMatch}
                    </td>
                  </tr>
                )}
                {!usersLoading &&
                  displayedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t border-slate-100 hover:bg-teal-50/50 cursor-pointer transition-colors"
                      onClick={() => openUser(user.id)}
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[180px]">
                          {user.email}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-xs">
                        <span>{formatAdminDate(user.lastLoginAt)}</span>
                        <span className="ml-1.5 text-teal-700 font-semibold">
                          {user.loginCount}
                          {isBn ? ` ${t.loginsTimes}` : t.loginsTimes}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-cyan-700">
                        {user.labScans}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-violet-700">
                        {user.rxScans}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-amber-700">
                        {user.unsavedScans}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-teal-700">
                        {user.savedScans}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700">
                        {user.visitCount}
                      </td>
                      <td className="px-2 py-3 text-slate-400">
                        <ChevronRight className="w-4 h-4" />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-slate-100">
            {usersLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-3 py-4 animate-pulse">
                  <div className="h-4 w-40 bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-52 bg-slate-50 rounded mb-3" />
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <div key={j} className="h-10 bg-slate-50 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            {!usersLoading && displayedUsers.length === 0 && (
              <p className="px-4 py-10 text-center text-slate-500 text-sm">{t.noMatch}</p>
            )}
            {!usersLoading &&
              displayedUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => openUser(user.id)}
                  className="w-full text-left px-3 py-3.5 hover:bg-teal-50/50 active:bg-teal-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {formatAdminDate(user.lastLoginAt)}
                        <span className="ml-1.5 text-teal-700 font-semibold">
                          {user.loginCount}
                          {isBn ? ` ${t.loginsTimes}` : t.loginsTimes}
                        </span>
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 mt-2.5">
                    {[
                      { label: "Lab", value: user.labScans, color: "text-cyan-700" },
                      { label: "Rx", value: user.rxScans, color: "text-violet-700" },
                      {
                        label: isBn ? "আনসেভ" : "Unsv",
                        value: user.unsavedScans,
                        color: "text-amber-700",
                      },
                      {
                        label: isBn ? "সেভ" : "Save",
                        value: user.savedScans,
                        color: "text-teal-700",
                      },
                      {
                        label: isBn ? "ভিজিট" : "Visit",
                        value: user.visitCount,
                        color: "text-slate-700",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg bg-slate-50 border border-slate-100 px-1.5 py-1 text-center"
                      >
                        <p className="text-[9px] text-slate-400 uppercase">{item.label}</p>
                        <p className={`text-xs font-semibold ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
