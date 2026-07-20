"use client";

import {
  Activity,
  CheckCircle2,
  FlaskConical,
  LogIn,
  MessageSquareText,
  Phone,
  Pill,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { activitySummary, type ActivityRow, type LoginSession } from "@/lib/adminSessions";
import {
  formatSaveIntentReasons,
  type SaveIntentFeedbackEntry,
} from "@/lib/saveIntent";
import { getT, type Language } from "@/lib/translations";
import { useAppStore } from "@/store/useAppStore";

export function formatAdminDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAdminDateShort(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionIcon(action: string) {
  if (action === "lab_scan" || action === "lab_saved") return FlaskConical;
  if (action === "rx_scan" || action === "rx_saved") return Pill;
  if (action === "visit_create") return Stethoscope;
  if (action === "login") return LogIn;
  if (action === "save_intent") return MessageSquareText;
  return Activity;
}

function actionLabel(action: string, language: Language): string {
  const labels = getT(language).adminUser.actions as Record<string, string>;
  return labels[action] ?? action;
}

function ActivityBadge({
  row,
  language,
}: {
  row: ActivityRow;
  language: Language;
}) {
  const t = getT(language).adminUser;

  if (row.action === "save_intent") {
    if (row.savedToVisit) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-teal-100 text-teal-800">
          <CheckCircle2 className="w-3 h-3" />
          {t.healthRecord}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-700">
        <XCircle className="w-3 h-3" />
        {t.skipped}
      </span>
    );
  }

  const isScan = row.action === "lab_scan" || row.action === "rx_scan";
  if (!isScan) return null;

  if (row.savedToVisit) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-teal-100 text-teal-800">
        <CheckCircle2 className="w-3 h-3" />
        {t.saved}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-amber-100 text-amber-800">
      <XCircle className="w-3 h-3" />
      {t.notSaved}
    </span>
  );
}

export function SessionActivityRow({ row }: { row: ActivityRow }) {
  const { language } = useAppStore();
  const Icon = actionIcon(row.action);
  const label = actionLabel(row.action, language);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2.5 px-3 rounded-xl bg-slate-50/80 border border-slate-100">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-slate-800 text-xs sm:text-sm">{label}</span>
            <ActivityBadge row={row} language={language} />
            {row.source && (
              <span className="text-[10px] sm:text-xs text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {row.source.replace("_", " ")}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5 break-words">
            {activitySummary(row, language)}
          </p>
        </div>
      </div>
      <span className="text-[10px] sm:text-xs text-slate-500 sm:whitespace-nowrap pl-10 sm:pl-0">
        {formatAdminDateShort(row.createdAt)}
      </span>
    </div>
  );
}

export type UserDetailData = {
  user: {
    id: string;
    name: string;
    email: string;
    whatsappNumber: string | null;
    joinedAt: string;
    lastLoginAt: string | null;
    lastActiveAt: string | null;
    visitCount: number;
    labScans: number;
    rxScans: number;
    unsavedScans: number;
    savedScans: number;
    reportsInVisits: number;
    saveIntentFeedback: SaveIntentFeedbackEntry[];
  };
  loginSessions: LoginSession[];
};

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white/70 border border-teal-100/80 px-2.5 py-2 sm:px-3 sm:py-2.5">
      <p className="text-[10px] sm:text-xs text-slate-500">{label}</p>
      <p className={`text-sm sm:text-base font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function sessionTitle(label: string, t: ReturnType<typeof getT>["adminUser"]): string {
  if (label === "Login session") return t.loginSession;
  if (label.startsWith("Earlier activity")) return t.earlierActivity;
  return label;
}

export function AdminUserDetailView({ detail }: { detail: UserDetailData }) {
  const { language } = useAppStore();
  const t = getT(language).adminUser;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 p-4 sm:p-5">
        <p className="text-base sm:text-lg font-semibold text-slate-900 break-words">
          {detail.user.name}
        </p>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5 break-all">{detail.user.email}</p>
        {detail.user.whatsappNumber && (
          <a
            href={`https://wa.me/${detail.user.whatsappNumber.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-teal-700 mt-2 inline-flex items-center gap-1.5 hover:underline"
          >
            <Phone className="w-4 h-4 flex-shrink-0" />
            {detail.user.whatsappNumber}
          </a>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mt-4">
          <StatPill
            label={t.lastLogin}
            value={formatAdminDateShort(detail.user.lastLoginAt)}
            color="text-slate-800"
          />
          <StatPill label={t.labScans} value={detail.user.labScans} color="text-cyan-700" />
          <StatPill label={t.rxScans} value={detail.user.rxScans} color="text-violet-700" />
          <StatPill label={t.unsaved} value={detail.user.unsavedScans} color="text-amber-700" />
          <StatPill label={t.saved} value={detail.user.savedScans} color="text-teal-700" />
          <StatPill label={t.visits} value={detail.user.visitCount} color="text-slate-800" />
          <StatPill
            label={t.joined}
            value={formatAdminDateShort(detail.user.joinedAt)}
            color="text-slate-800"
          />
          <StatPill
            label={t.saveIntentReplies}
            value={detail.user.saveIntentFeedback.length}
            color="text-indigo-700"
          />
        </div>
      </div>

      {detail.user.saveIntentFeedback.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-800 mb-3">{t.whySaveFeedback}</h2>
          <div className="space-y-2">
            {[...detail.user.saveIntentFeedback]
              .reverse()
              .slice(0, 10)
              .map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:px-4"
                >
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-xs font-medium text-slate-800">
                      {entry.source === "lab_report" ? t.labReport : t.prescription}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        entry.choseHealthRecord
                          ? "bg-teal-100 text-teal-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {entry.choseHealthRecord ? t.createHealthRecord : t.skipBenefits}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-auto">
                      {formatAdminDateShort(entry.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {formatSaveIntentReasons(entry.reasons, language)}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-slate-800 mb-3">{t.activityBySession}</h2>
        {detail.loginSessions.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8 px-4 rounded-xl bg-white border border-slate-200">
            {t.noSessions}
          </p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {detail.loginSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm"
              >
                <div className="bg-slate-50 px-3 sm:px-4 py-3 border-b border-slate-200">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                      <LogIn className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                        {sessionTitle(session.label, t)}
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                        {formatAdminDate(session.loginAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {session.labScans > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] sm:text-xs font-medium">
                        {t.lab}: {session.labScans}
                      </span>
                    )}
                    {session.rxScans > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] sm:text-xs font-medium">
                        {t.rx}: {session.rxScans}
                      </span>
                    )}
                    {session.unsavedCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-medium">
                        {t.unsaved}: {session.unsavedCount}
                      </span>
                    )}
                    {session.savedCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] sm:text-xs font-medium">
                        {t.saved}: {session.savedCount}
                      </span>
                    )}
                    {session.visitsCreated > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] sm:text-xs font-medium">
                        {t.visits}: {session.visitsCreated}
                      </span>
                    )}
                    {session.activities.length === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] sm:text-xs">
                        {t.noActivity}
                      </span>
                    )}
                  </div>
                </div>

                {session.activities.length > 0 && (
                  <div className="p-2 sm:p-3 space-y-2">
                    {session.activities
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )
                      .map((row) => (
                        <SessionActivityRow key={row.id} row={row} />
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
