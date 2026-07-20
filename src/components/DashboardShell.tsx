"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Home,
  FileText,
  FlaskConical,
  Heart,
  Bell,
  Stethoscope,
  Languages,
  LogOut,
  MessageCircle,
  Menu,
  X,
  ExternalLink,
  Shield,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";
import { openWhatsAppSupport } from "@/lib/whatsappSupport";
import {
  DASHBOARD_TAB_HREFS,
  pathnameToDashboardTab,
  type DashboardTabId,
} from "@/lib/dashboardRoutes";
import DashboardTabPanels from "@/components/DashboardTabPanels";
import { useVisitsLoader } from "@/hooks/useVisitsLoader";

const SIDEBAR_ITEMS: {
  id: DashboardTabId;
  href: string;
  labelKey: "home" | "visits" | "prescription" | "labReports" | "lifestyle" | "reminders";
  icon: typeof Home;
  exact?: boolean;
  mobileShow: boolean;
}[] = [
  { id: "home", href: DASHBOARD_TAB_HREFS.home, labelKey: "home", icon: Home, exact: true, mobileShow: true },
  { id: "visits", href: DASHBOARD_TAB_HREFS.visits, labelKey: "visits", icon: Stethoscope, mobileShow: true },
  { id: "prescription", href: DASHBOARD_TAB_HREFS.prescription, labelKey: "prescription", icon: FileText, mobileShow: true },
  { id: "lab-report", href: DASHBOARD_TAB_HREFS["lab-report"], labelKey: "labReports", icon: FlaskConical, mobileShow: true },
  { id: "lifestyle", href: DASHBOARD_TAB_HREFS.lifestyle, labelKey: "lifestyle", icon: Heart, mobileShow: false },
  { id: "reminders", href: DASHBOARD_TAB_HREFS.reminders, labelKey: "reminders", icon: Bell, mobileShow: true },
];

export default function DashboardShell() {
  const router = useRouter();
  const pathname = usePathname();
  const { reminders, language, setLanguage } = useAppStore();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const activeTab = pathnameToDashboardTab(pathname);
  const [mountedTabs, setMountedTabs] = useState<Set<DashboardTabId>>(
    () => new Set([pathnameToDashboardTab(pathname)])
  );

  useVisitsLoader();

  const t = getT(language);
  const tl = t.landing;
  const activeReminders = reminders.filter((r) => r.active).length;
  const showAdminLink = Boolean(session?.user?.isAdmin);

  const displayName = session?.user?.name || (language === "bn" ? "ব্যবহারকারী" : "User");
  const firstLetter = displayName.trim().charAt(0) || "?";
  const welcomeText = language === "bn"
    ? `${t.dashboard.greeting.replace("👋", "").trim()}, ${displayName.split(" ")[0]} 👋`
    : `Welcome back, ${displayName.split(" ")[0]} 👋`;

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const goToTab = useCallback(
    (href: string) => {
      if (pathname !== href) router.push(href);
    },
    [pathname, router]
  );

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const handleSupport = () => {
    openWhatsAppSupport(language);
    setUserMenuOpen(false);
  };

  const renderNavItem = (item: (typeof SIDEBAR_ITEMS)[number], onNavigate?: () => void) => {
    const Icon = item.icon;
    const active = isActive(item.href, item.exact);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          goToTab(item.href);
          onNavigate?.();
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
          active
            ? "bg-white/20 text-white shadow-inner"
            : "text-teal-100 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-left">{t.nav[item.labelKey]}</span>
        {item.id === "reminders" && activeReminders > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
            {activeReminders}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen lg:h-screen lg:overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 h-full bg-gradient-to-b from-teal-800 to-teal-900 text-white">
        <div className="p-5 border-b border-teal-700/50">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold leading-tight">{t.appName}</p>
              <p className="text-xs text-teal-300">{t.appSubtitle}</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => renderNavItem(item))}
        </nav>
        <div className="p-3 border-t border-teal-700/50 space-y-1">
          {showAdminLink && (
            <Link
              href="/admin"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-teal-100 hover:bg-white/10 transition-colors"
            >
              <Shield className="w-5 h-5" />
              Admin
            </Link>
          )}
          <button
            onClick={handleSupport}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-teal-100 hover:bg-white/10 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            {t.nav.support}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-300 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t.nav.logout}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 lg:overflow-hidden">
        <header className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 text-white z-40 shadow-md lg:hidden flex-shrink-0">
          <div className="px-4 h-14 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg bg-white/15" aria-label="Menu">
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm truncate">{t.appName}</span>
            </Link>
            <button
              onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
              className="p-2 rounded-lg bg-white/15 text-xs font-medium"
            >
              {language === "bn" ? "EN" : "বাং"}
            </button>
          </div>
        </header>

        <header className="hidden lg:flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-teal-100 flex-shrink-0">
          <p className="text-gray-600 text-sm font-medium">{welcomeText}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
              className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 rounded-lg px-3 py-1.5 text-teal-700 text-sm font-medium transition-colors"
            >
              <Languages className="w-4 h-4" />
              {language === "bn" ? "EN" : "বাং"}
            </button>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 bg-teal-50 hover:bg-teal-100 rounded-lg px-3 py-1.5 transition-colors"
              >
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt={displayName} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 bg-teal-200 rounded-full flex items-center justify-center text-sm font-bold text-teal-800">
                    {firstLetter}
                  </div>
                )}
                <span className="text-sm font-medium text-teal-800">{displayName.split(" ")[0]}</span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  {showAdminLink && (
                    <Link
                      href="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-teal-700 hover:bg-teal-50"
                    >
                      <Shield className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                  <button onClick={handleSupport} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50">
                    <MessageCircle className="w-4 h-4" />
                    {t.nav.support}
                  </button>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    {t.nav.logout}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="lg:hidden px-4 pt-4 flex-shrink-0">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl px-5 py-4 text-white text-sm font-semibold shadow-md">
            {welcomeText}
          </div>
        </div>

        <main className="flex-1 min-h-0 max-w-4xl w-full mx-auto px-4 py-6 pb-24 lg:pb-6 lg:overflow-y-auto">
          <DashboardTabPanels activeTab={activeTab} mountedTabs={mountedTabs} />
        </main>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom">
          <div className="bg-white border-t border-gray-200 shadow-2xl">
            <div className="flex">
              {SIDEBAR_ITEMS.filter((item) => item.mobileShow).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goToTab(item.href)}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all relative ${
                      active ? "text-teal-600" : "text-gray-400"
                    }`}
                  >
                    {active && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-600 rounded-full" />
                    )}
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium leading-none">
                      {t.nav[item.labelKey].split(" ")[0]}
                    </span>
                    {item.id === "reminders" && activeReminders > 0 && (
                      <span className="absolute top-1.5 right-[calc(50%-14px)] bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                        {activeReminders}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-teal-800 to-teal-900 text-white z-50 lg:hidden flex flex-col">
            <div className="p-4 border-b border-teal-700/50">
              <div className="flex items-center justify-between gap-2 mb-3">
                <Link
                  href="/"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 min-w-0"
                >
                  <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold leading-tight truncate">{t.appName}</p>
                    <p className="text-xs text-teal-300">{t.appSubtitle}</p>
                  </div>
                </Link>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg bg-white/10 flex-shrink-0" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Link
                href="/"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-teal-100 text-xs font-medium hover:bg-white/15"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {tl.backHome}
              </Link>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {SIDEBAR_ITEMS.map((item) => renderNavItem(item, () => setSidebarOpen(false)))}
            </nav>
            <div className="p-3 border-t border-teal-700/50 space-y-1">
              {showAdminLink && (
                <Link
                  href="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-teal-100 hover:bg-white/10"
                >
                  <Shield className="w-5 h-5" />
                  Admin
                </Link>
              )}
              <button onClick={() => { handleSupport(); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-teal-100 hover:bg-white/10">
                <MessageCircle className="w-5 h-5" />
                {t.nav.support}
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-300 hover:bg-white/10"
              >
                <LogOut className="w-5 h-5" />
                {t.nav.logout}
              </button>
            </div>
          </aside>
        </>
      )}

      {userMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />}
    </div>
  );
}
