"use client";
import { useAppStore } from "@/store/useAppStore";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Bell,
  Camera,
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  CheckCircle,
  Stethoscope,
  Plus,
} from "lucide-react";
import { getT } from "@/lib/translations";
import { getBiomarkerDisplayName } from "@/lib/biomarkerNames";
import PwaInstallBanner from "@/components/PwaInstallBanner";

const pipelineIcons = [Camera, Zap, TrendingUp, FileText, Bell];
const pipelineColors = [
  { color: "from-cyan-500 to-teal-500", textColor: "text-cyan-700" },
  { color: "from-violet-500 to-purple-500", textColor: "text-violet-700" },
  { color: "from-emerald-500 to-green-500", textColor: "text-emerald-700" },
  { color: "from-orange-500 to-amber-500", textColor: "text-orange-700" },
  { color: "from-rose-500 to-pink-500", textColor: "text-rose-700" },
];
const pipelineStepNumsBn = ["১", "২", "৩", "৪", "৫"];
const pipelineStepNumsEn = ["1", "2", "3", "4", "5"];

export default function Dashboard() {
  const { language, visits } = useAppStore();
  const { data: session } = useSession();
  const router = useRouter();
  const t = getT(language);
  const isBn = language === "bn";
  const displayName = session?.user?.name || (isBn ? "ব্যবহারকারী" : "User");

  // ─── Real stats from latest visit lab report ────────────────────────────────
  const allLabReports = visits.flatMap((v) => v.labReports);
  const latestLabReport = allLabReports.length > 0
    ? allLabReports.reduce((latest, r) =>
        new Date(r.date) > new Date(latest.date) ? r : latest
      )
    : null;

  // Show up to 4 biomarkers from the latest lab report
  const displayBiomarkers = latestLabReport?.biomarkers.slice(0, 4) ?? [];
  const hasRealStats = displayBiomarkers.length > 0;

  // Latest health report from any visit
  const latestVisitWithHealth = visits.find((v) => v.healthReport);
  const healthScore = latestVisitWithHealth?.healthReport?.healthScore;
  const riskLevel = latestVisitWithHealth?.healthReport?.riskLevel;

  const riskColors = {
    low: "text-green-300",
    medium: "text-amber-300",
    high: "text-red-300",
  };

  const riskLabels = {
    low: isBn ? "ঝুঁকি কম" : "Low Risk",
    medium: isBn ? "মাঝারি ঝুঁকি" : "Medium Risk",
    high: isBn ? "উচ্চ ঝুঁকি" : "High Risk",
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-8 w-24 h-24 bg-white rounded-full blur-2xl" />
        </div>
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-teal-200 text-sm mb-1">{t.dashboard.greeting}</p>
              <h2 className="text-2xl font-bold mb-1">{displayName}</h2>
              <p className="text-teal-100 text-sm">{t.dashboard.healthSummary}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
              {healthScore ? (
                <div className="text-center">
                  <p className="text-white font-black text-xl leading-none">{healthScore}</p>
                  <p className="text-teal-200 text-xs">{isBn ? "স্কোর" : "Score"}</p>
                </div>
              ) : (
                <Shield className="w-8 h-8 text-white" />
              )}
            </div>
          </div>

          {/* Real stats from lab report */}
          {hasRealStats ? (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {displayBiomarkers.map((b) => (
                <div key={b.name} className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-teal-200 text-xs mb-1 truncate">
                    {getBiomarkerDisplayName(b, language)}
                  </p>
                  <div className="flex items-end gap-1">
                    <span className="text-white font-bold text-lg leading-none">{b.value}</span>
                    <span className="text-teal-300 text-xs leading-none mb-0.5">{b.unit}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {b.status === "high" ? (
                      <TrendingUp className="w-3 h-3 text-red-300" />
                    ) : b.status === "low" ? (
                      <TrendingDown className="w-3 h-3 text-yellow-300" />
                    ) : (
                      <CheckCircle className="w-3 h-3 text-green-300" />
                    )}
                    <span className={`text-xs ${
                      b.status === "high" ? "text-red-300"
                      : b.status === "low" ? "text-yellow-300"
                      : "text-green-300"
                    }`}>
                      {b.status === "high" ? t.dashboard.high
                        : b.status === "low" ? t.dashboard.low
                        : (isBn ? "স্বাভাবিক" : "Normal")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : riskLevel ? (
            // Show health score if available but no lab report
            <div className="mt-4 bg-white/15 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-200 text-xs">{isBn ? "সর্বশেষ AI স্বাস্থ্য স্কোর" : "Latest AI Health Score"}</p>
                  <p className="text-white font-black text-3xl">{healthScore}<span className="text-teal-300 text-sm font-normal">/100</span></p>
                </div>
                <span className={`font-bold text-sm ${riskColors[riskLevel]}`}>
                  {riskLabels[riskLevel]}
                </span>
              </div>
            </div>
          ) : (
            // No data at all — invite to add a visit
            <div className="mt-4 bg-white/10 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">
                  {isBn ? "কোনো স্বাস্থ্য ডেটা নেই" : "No health data yet"}
                </p>
                <p className="text-teal-200 text-xs">
                  {isBn ? "Visit তৈরি করে prescription ও lab report scan করুন" : "Create a visit and scan your prescription & lab reports"}
                </p>
              </div>
              <button
                onClick={() => router.push("/visits")}
                className="flex-shrink-0 bg-white text-teal-700 text-xs font-bold px-3 py-2 rounded-xl hover:bg-teal-50 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {isBn ? "শুরু করুন" : "Start"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Pipeline Architecture — mobile timeline / tablet grid / desktop flow */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 lg:p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5 mb-4 sm:mb-5 lg:mb-6">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-800 text-sm sm:text-base">{t.dashboard.aiPipelineTitle}</h3>
            <p className="text-[11px] sm:text-xs text-gray-500 leading-snug">{t.dashboard.aiPipelineSubtitle}</p>
          </div>
        </div>

        {/* Android / phone — vertical timeline */}
        <div className="md:hidden">
          {t.dashboard.pipeline.map((step, index) => {
            const Icon = pipelineIcons[index];
            const style = pipelineColors[index];
            const stepNum = (language === "en" ? pipelineStepNumsEn : pipelineStepNumsBn)[index];
            const isLast = index === t.dashboard.pipeline.length - 1;
            return (
              <div key={index} className={`relative flex gap-3 ${isLast ? "" : "pb-4"}`}>
                {!isLast && (
                  <div
                    className={`absolute left-[19px] top-10 bottom-0 w-[2px] bg-gradient-to-b ${style.color} opacity-25`}
                  />
                )}
                <div className="relative flex-shrink-0 z-10">
                  <div
                    className={`w-10 h-10 bg-gradient-to-br ${style.color} rounded-xl flex items-center justify-center shadow-md ring-4 ring-white`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-600 flex items-center justify-center shadow-sm">
                    {stepNum}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5 pb-1">
                  <p className={`text-sm font-bold leading-tight ${style.textColor}`}>{step.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tablet — 2-column card grid */}
        <div className="hidden md:grid lg:hidden grid-cols-2 gap-3">
          {t.dashboard.pipeline.map((step, index) => {
            const Icon = pipelineIcons[index];
            const style = pipelineColors[index];
            const stepNum = (language === "en" ? pipelineStepNumsEn : pipelineStepNumsBn)[index];
            const isLastOdd = index === t.dashboard.pipeline.length - 1 && t.dashboard.pipeline.length % 2 !== 0;
            return (
              <div
                key={index}
                className={`relative rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm ${
                  isLastOdd ? "col-span-2 max-w-md mx-auto w-full" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-11 h-11 bg-gradient-to-br ${style.color} rounded-xl flex items-center justify-center shadow-md`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-600 flex items-center justify-center">
                      {stepNum}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${style.textColor}`}>{step.title}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop — horizontal flow with connector */}
        <div className="hidden lg:block relative pt-1">
          <div
            className="absolute top-[26px] left-[8%] right-[8%] h-[3px] rounded-full -z-0"
            style={{
              background:
                "linear-gradient(90deg, #99f6e4 0%, #c4b5fd 25%, #86efac 50%, #fdba74 75%, #fda4af 100%)",
            }}
          />
          <div className="relative z-10 grid grid-cols-5 gap-3">
            {t.dashboard.pipeline.map((step, index) => {
              const Icon = pipelineIcons[index];
              const style = pipelineColors[index];
              const stepNum = (language === "en" ? pipelineStepNumsEn : pipelineStepNumsBn)[index];
              return (
                <div key={index} className="flex flex-col items-center text-center px-1">
                  <div className="relative mb-3">
                    <div
                      className={`w-14 h-14 bg-gradient-to-br ${style.color} rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 bg-white border-2 border-gray-100 rounded-full text-[11px] font-bold text-gray-600 flex items-center justify-center shadow-sm">
                      {stepNum}
                    </span>
                  </div>
                  <p className={`text-sm font-bold leading-tight ${style.textColor}`}>{step.title}</p>
                  <p className="text-[11px] text-gray-500 mt-1.5 leading-snug max-w-[140px]">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <PwaInstallBanner language={language} />
    </div>
  );
}













