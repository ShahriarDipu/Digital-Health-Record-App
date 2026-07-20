"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import UserGuard from "./UserGuard";
import LandingNavbar from "./LandingNavbar";
import ReminderModal from "./ReminderModal";
import ReminderNotificationSync from "./ReminderNotificationSync";
import AuthGateModal from "./AuthGateModal";
import HomeAuthGateAutoOpen from "./HomeAuthGateAutoOpen";
import { AuthGateProvider } from "@/context/AuthGateContext";
import { isMarketingPage } from "@/lib/routes";

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdminPage = pathname.startsWith("/admin");
  const showMarketingNav = isMarketingPage(pathname);
  const isHome = pathname === "/";

  return (
    <div className={!isAuthPage && !isDashboard && !isAdminPage ? "min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50" : ""}>
      {showMarketingNav && <LandingNavbar />}
      {children}
      <HomeAuthGateAutoOpen />
      {isHome && <AuthGateModal />}
      {!isAuthPage && <ReminderNotificationSync />}
      {!isAuthPage && <ReminderModal />}
    </div>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthGateProvider>
        <UserGuard />
        <AppShell>{children}</AppShell>
      </AuthGateProvider>
    </SessionProvider>
  );
}
