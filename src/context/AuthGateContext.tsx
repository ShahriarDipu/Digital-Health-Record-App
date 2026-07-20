"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type AuthGateTab = "login" | "register";

interface AuthGateContextValue {
  isOpen: boolean;
  activeTab: AuthGateTab;
  openAuthGate: (tab?: AuthGateTab) => void;
  closeAuthGate: (options?: { dismiss?: boolean }) => void;
  setActiveTab: (tab: AuthGateTab) => void;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AuthGateTab>("login");

  const openAuthGate = useCallback((tab: AuthGateTab = "login") => {
    setActiveTab(tab);
    setIsOpen(true);
  }, []);

  const closeAuthGate = useCallback((options?: { dismiss?: boolean }) => {
    setIsOpen(false);
    if (options?.dismiss) {
      import("@/lib/authGateStorage").then(({ dismissAuthGate }) => dismissAuthGate());
    }
  }, []);

  return (
    <AuthGateContext.Provider value={{ isOpen, activeTab, openAuthGate, closeAuthGate, setActiveTab }}>
      {children}
    </AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) {
    throw new Error("useAuthGate must be used within AuthGateProvider");
  }
  return ctx;
}
