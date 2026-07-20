"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Activity,
  FileText,
  FlaskConical,
  Bell,
  Heart,
  Shield,
  ChevronRight,
  Sparkles,
  UserPlus,
  LayoutDashboard,
  Stethoscope,
  Upload,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";
import LandingFooter from "@/components/LandingFooter";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import { useAuthGate } from "@/context/AuthGateContext";

const featureIcons = [FileText, FlaskConical, Heart, Bell];
const roadmapIcons = [UserPlus, LayoutDashboard, Stethoscope, Upload, Sparkles, Bell];

export default function LandingPage() {
  const { language } = useAppStore();
  const { data: session } = useSession();
  const { isOpen, openAuthGate } = useAuthGate();
  const t = getT(language);
  const tl = t.landing;

  const handleCta = (tab: "login" | "register" = "register") => {
    if (session) return;
    openAuthGate(tab);
  };

  const blurred = isOpen && !session;

  return (
    <div className={`pb-16 transition-[filter] duration-300 ${blurred ? "blur-[2px] pointer-events-none select-none" : ""}`}>
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-16">
        <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl shadow-teal-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              {tl.badge}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-4">{tl.heroTitle}</h2>
            <p className="text-teal-100 text-base sm:text-lg leading-relaxed mb-8">{tl.heroDesc}</p>
            <div className="flex flex-wrap gap-3">
              {session ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-white text-teal-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-teal-50 transition-all shadow-lg"
                >
                  {tl.goToDashboard}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCta("register")}
                  className="inline-flex items-center gap-2 bg-white text-teal-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-teal-50 transition-all shadow-lg"
                >
                  {tl.getStarted}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <Link
                href="/about"
                className="inline-flex items-center gap-2 bg-white/15 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/25 transition-all"
              >
                {tl.learnMore}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-1">{tl.roadmapTitle}</h3>
          <p className="text-gray-500 text-sm">{tl.roadmapSubtitle}</p>
        </div>
        <div className="relative">
          <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-teal-200 via-teal-400 to-teal-200" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-8">
            {tl.roadmapSteps.map((step, i) => {
              const Icon = roadmapIcons[i];
              return (
                <div key={i} className="relative flex flex-col items-center text-center px-1">
                  <div className="relative z-10 w-14 h-14 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200/50 mb-3">
                    <Icon className="w-6 h-6 text-white" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-white border-2 border-teal-500 rounded-full flex items-center justify-center text-xs font-black text-teal-700">
                      {i + 1}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">{step.title}</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="text-center mt-8">
          {session ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-teal-700 transition-all shadow-md"
            >
              {tl.goToDashboard}
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => handleCta("register")}
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-teal-700 transition-all shadow-md"
            >
              {tl.getStarted}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">{tl.featuresTitle}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tl.features.map((feature, i) => {
            const Icon = featureIcons[i];
            return (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-teal-600" />
                </div>
                <h4 className="font-bold text-gray-800 text-sm mb-1">{feature.title}</h4>
                <p className="text-gray-500 text-xs leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-7 h-7 text-teal-600" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-bold text-gray-800 mb-1">{tl.trustTitle}</h3>
            <p className="text-gray-500 text-sm">{tl.trustDesc}</p>
          </div>
          {session ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors flex-shrink-0"
            >
              <Activity className="w-4 h-4" />
              {tl.goToDashboard}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => handleCta("register")}
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors flex-shrink-0"
            >
              <Activity className="w-4 h-4" />
              {tl.getStarted}
            </button>
          )}
        </div>
      </section>

      <PwaInstallBanner language={language} variant="landing" />

      <LandingFooter />
    </div>
  );
}
