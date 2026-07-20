"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";

export default function LandingFooter() {
  const { language } = useAppStore();
  const t = getT(language);
  const tl = t.landing;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t border-teal-100 bg-white/60">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 text-teal-800 hover:text-teal-600 transition-colors">
            <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-teal-600" />
            </div>
            <span className="font-bold text-sm">{t.appName}</span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-teal-600 transition-colors">
              {tl.nav.home}
            </Link>
            <Link href="/blog" className="hover:text-teal-600 transition-colors">
              {tl.nav.blog}
            </Link>
            <Link href="/about" className="hover:text-teal-600 transition-colors">
              {tl.nav.about}
            </Link>
          </nav>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-1">
          <p className="text-xs text-gray-500">
            {tl.footerCopyright.replace("{year}", String(year))}
          </p>
          <p className="text-[11px] text-gray-400">{tl.footerDisclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
