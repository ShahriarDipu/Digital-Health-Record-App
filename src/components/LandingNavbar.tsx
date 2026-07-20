"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  Activity,
  Languages,
  LogOut,
  MessageCircle,
  LayoutDashboard,
  Menu,
  X,
  FileText,
  FlaskConical,
  Bell,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";
import { openWhatsAppSupport } from "@/lib/whatsappSupport";
import { DASHBOARD_TAB_HREFS } from "@/lib/dashboardRoutes";
import { useAuthGate } from "@/context/AuthGateContext";

const PUBLIC_LINKS = [
  { id: "home", href: "/" },
  { id: "blog", href: "/blog" },
  { id: "about", href: "/about" },
] as const;

const DASHBOARD_QUICK_LINKS = [
  { href: DASHBOARD_TAB_HREFS.home, icon: LayoutDashboard, labelKey: "dashboard" as const },
  { href: DASHBOARD_TAB_HREFS["lab-report"], icon: FlaskConical, labelKey: "labReports" as const },
  { href: DASHBOARD_TAB_HREFS.prescription, icon: FileText, labelKey: "prescription" as const },
  { href: DASHBOARD_TAB_HREFS.reminders, icon: Bell, labelKey: "reminders" as const },
];

function UserAvatar({ name, image, letter, pulse }: { name: string; image?: string | null; letter: string; pulse?: boolean }) {
  const ringClass = pulse
    ? "ring-2 ring-white profile-avatar-pulse"
    : "ring-2 ring-white/30";

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={name} className={`w-9 h-9 rounded-full object-cover ${ringClass}`} />
    );
  }
  return (
    <div className={`w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-sm font-bold ${ringClass}`}>
      {letter}
    </div>
  );
}

export default function LandingNavbar() {
  const router = useRouter();
  const { language, setLanguage } = useAppStore();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const t = getT(language);
  const tl = t.landing;
  const { openAuthGate } = useAuthGate();
  const isHome = pathname === "/";

  const displayName = session?.user?.name || (language === "bn" ? "ব্যবহারকারী" : "User");
  const firstLetter = displayName.trim().charAt(0) || "?";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    if (!session) return;
    DASHBOARD_QUICK_LINKS.forEach((link) => router.prefetch(link.href));
  }, [session, router]);

  const closeMenus = () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
  };

  const handleSupport = () => {
    openWhatsAppSupport(language);
    closeMenus();
  };

  const renderUserMenu = (mobile?: boolean) => (
    <div
      className={`${
        mobile
          ? "relative w-full mt-2"
          : "absolute right-0 top-full mt-2 w-56"
      } bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50`}
    >
      <div className="px-4 py-2 border-b border-gray-100">
        <p className="text-sm font-bold text-gray-800 truncate">{displayName}</p>
        <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
      </div>

      <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-teal-500">
        {tl.navMyApp}
      </p>

      {DASHBOARD_QUICK_LINKS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMenus}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
          >
            <Icon className="w-4 h-4 text-teal-600 flex-shrink-0" />
            {t.nav[item.labelKey]}
          </Link>
        );
      })}

      <div className="border-t border-gray-100 my-1" />

      <button
        onClick={handleSupport}
        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        {t.nav.support}
      </button>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        {t.nav.logout}
      </button>
    </div>
  );

  return (
    <>
      <header className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <button
              onClick={() => {
                setUserMenuOpen(false);
                setMobileOpen(!mobileOpen);
              }}
              className="md:hidden p-2 rounded-lg bg-white/15 hover:bg-white/25 transition-colors flex-shrink-0"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold leading-tight truncate">{t.appName}</h1>
                <p className="text-[10px] text-teal-200 leading-tight hidden sm:block">{t.appSubtitle}</p>
              </div>
            </Link>
          </div>

          {/* Desktop public nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {PUBLIC_LINKS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? "bg-white/20 text-white shadow-inner"
                    : "text-teal-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tl.nav[item.id]}
              </Link>
            ))}
          </nav>

          {/* Right: lang + profile or login */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 rounded-lg px-2.5 py-1.5 transition-colors text-white text-xs font-medium"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "EN" : "বাং"}</span>
            </button>

            {session ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setUserMenuOpen(!userMenuOpen);
                  }}
                  className="rounded-full hover:ring-2 hover:ring-white/40 transition-all"
                  aria-label={t.nav.dashboard}
                >
                  <UserAvatar
                    name={displayName}
                    image={session.user?.image}
                    letter={firstLetter}
                    pulse={!userMenuOpen}
                  />
                </button>
                {userMenuOpen && renderUserMenu()}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                {isHome ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openAuthGate("login")}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-teal-100 hover:bg-white/10 transition-colors"
                    >
                      {tl.login}
                    </button>
                    <button
                      type="button"
                      onClick={() => openAuthGate("register")}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-teal-700 hover:bg-teal-50 transition-colors"
                    >
                      {tl.getStarted}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-teal-100 hover:bg-white/10 transition-colors"
                    >
                      {tl.login}
                    </Link>
                    <Link
                      href="/register"
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-teal-700 hover:bg-teal-50 transition-colors"
                    >
                      {tl.getStarted}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Public-only mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden bg-teal-800 border-t border-teal-600 px-4 pb-4 pt-2">
            <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-teal-400">
              {tl.navWebsite}
            </p>
            {PUBLIC_LINKS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium mb-1 ${
                  isActive(item.href) ? "bg-white/20 text-white" : "text-teal-200 hover:bg-white/10"
                }`}
              >
                {tl.nav[item.id]}
              </Link>
            ))}

            {!session && (
              <div className="flex gap-2 mt-3 px-2">
                {isHome ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        openAuthGate("login");
                      }}
                      className="flex-1 text-center py-2.5 rounded-lg bg-white/10 text-sm font-medium"
                    >
                      {tl.login}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        openAuthGate("register");
                      }}
                      className="flex-1 text-center py-2.5 rounded-lg bg-white text-teal-700 text-sm font-semibold"
                    >
                      {tl.getStarted}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 text-center py-2.5 rounded-lg bg-white/10 text-sm font-medium"
                    >
                      {tl.login}
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 text-center py-2.5 rounded-lg bg-white text-teal-700 text-sm font-semibold"
                    >
                      {tl.getStarted}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {userMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />}
    </>
  );
}
