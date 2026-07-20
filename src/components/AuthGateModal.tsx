"use client";

import { useRouter } from "next/navigation";
import { Activity, Languages, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";
import { useAuthGate } from "@/context/AuthGateContext";
import AuthLoginForm from "@/components/auth/AuthLoginForm";
import AuthRegisterForm from "@/components/auth/AuthRegisterForm";

export default function AuthGateModal() {
  const router = useRouter();
  const { language, setLanguage } = useAppStore();
  const t = getT(language);
  const tg = t.authGate;
  const { isOpen, activeTab, closeAuthGate, setActiveTab } = useAuthGate();

  if (!isOpen) return null;

  const handleSuccess = () => {
    closeAuthGate();
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[3px]"
        onClick={() => closeAuthGate({ dismiss: true })}
        aria-hidden
      />

      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-gradient-to-br from-teal-50 via-white to-cyan-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-gate-title"
      >
        <div className="absolute top-2.5 left-3 right-3 z-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
            className="flex items-center gap-1 bg-white/90 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-colors shadow-sm"
          >
            <Languages className="w-3.5 h-3.5" />
            {language === "bn" ? "EN" : "বাং"}
          </button>
          <button
            type="button"
            onClick={() => closeAuthGate({ dismiss: true })}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors"
            aria-label={tg.dismiss}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-11 pb-2 text-center border-b border-teal-100/80 bg-white/60 shrink-0">
          <div className="w-10 h-10 mx-auto bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-md mb-2">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h2 id="auth-gate-title" className="text-sm sm:text-base font-black text-gray-800 leading-snug">
            {tg.title}
          </h2>
          <p className="text-xs text-teal-700/90 font-medium mt-0.5 leading-snug">{tg.subtitle}</p>
        </div>

        <div className="px-5 pt-3 pb-2 shrink-0">
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === "login" ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tg.tabLogin}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === "register"
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tg.tabRegister}
            </button>
          </div>
        </div>

        <div
          className={`px-5 pb-4 flex-1 min-h-0 ${
            activeTab === "register" ? "overflow-y-auto overscroll-contain" : "overflow-hidden"
          }`}
        >
          {activeTab === "login" ? (
            <AuthLoginForm
              variant="modal"
              onSuccess={handleSuccess}
              onSwitchToRegister={() => setActiveTab("register")}
            />
          ) : (
            <AuthRegisterForm
              variant="modal"
              onSuccess={handleSuccess}
              onSwitchToLogin={() => setActiveTab("login")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
