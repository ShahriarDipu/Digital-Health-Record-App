"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthGate } from "@/context/AuthGateContext";

/** Auto-open auth modal whenever a logged-out user lands on the homepage. */
export default function HomeAuthGateAutoOpen() {
  const pathname = usePathname();
  const { status } = useSession();
  const { openAuthGate } = useAuthGate();

  useEffect(() => {
    if (pathname !== "/") return;
    if (status !== "unauthenticated") return;

    const timer = window.setTimeout(() => openAuthGate("login"), 400);
    return () => window.clearTimeout(timer);
  }, [pathname, status, openAuthGate]);

  return null;
}
