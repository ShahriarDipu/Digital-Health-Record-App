"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { AdminUserDetailView, type UserDetailData } from "@/components/AdminUserDetail";
import { getT } from "@/lib/translations";
import { useAppStore } from "@/store/useAppStore";

function DetailSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-pulse">
      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 h-40" />
      <div className="rounded-2xl bg-white border border-slate-200 h-28" />
      <div className="rounded-2xl bg-white border border-slate-200 h-28" />
    </div>
  );
}

export default function AdminUserPage() {
  const params = useParams();
  const userId = params.id as string;
  const { language, setLanguage } = useAppStore();
  const isBn = language === "bn";
  const t = getT(language).adminUser;

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [detail, setDetail] = useState<UserDetailData | null>(null);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    fetch(`/api/admin/users/${userId}`)
      .then(async (res) => {
        if (res.status === 403 || res.status === 401) {
          setForbidden(true);
          return;
        }
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) return;
        setDetail(await res.json());
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-slate-50">
        <AlertCircle className="w-12 h-12 text-amber-500" />
        <p className="text-gray-700 text-center text-sm">{t.accessOnly}</p>
        <Link href="/dashboard" className="text-teal-700 font-medium hover:underline text-sm">
          {t.backDashboard}
        </Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-slate-50">
        <p className="text-gray-700 text-sm">{t.notFound}</p>
        <Link href="/admin" className="text-teal-700 font-medium hover:underline text-sm">
          {t.backAdmin}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 flex-shrink-0"
            aria-label="Back to users"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-semibold text-slate-900">{t.title}</h1>
            {loading ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Loader2 className="w-3 h-3 animate-spin text-teal-600" />
                <span className="text-xs text-slate-400">{t.loading}</span>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 truncate">{detail?.user.name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setLanguage(isBn ? "en" : "bn")}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex-shrink-0"
          >
            {isBn ? "EN" : "বাং"}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {loading || !detail ? <DetailSkeleton /> : <AdminUserDetailView detail={detail} />}
      </main>
    </div>
  );
}
