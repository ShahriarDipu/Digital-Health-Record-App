"use client";

import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";
import { Activity, ChevronLeft, Shield } from "lucide-react";

export default function AboutPage() {
  const { language } = useAppStore();
  const t = getT(language);
  const tl = t.landing;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-teal-600 text-sm font-medium mb-8 hover:text-teal-700">
        <ChevronLeft className="w-4 h-4" />
        {tl.backHome}
      </Link>
      <div className="bg-white rounded-2xl p-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{tl.aboutTitle}</h1>
            <p className="text-gray-500 text-sm">{t.appSubtitle}</p>
          </div>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed mb-4">{tl.aboutP1}</p>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">{tl.aboutP2}</p>
        <div className="flex items-start gap-3 bg-teal-50 rounded-xl p-4">
          <Shield className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <p className="text-teal-800 text-sm">{tl.trustDesc}</p>
        </div>
      </div>
    </div>
  );
}
