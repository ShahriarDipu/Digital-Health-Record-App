"use client";

import { CheckCircle, TrendingDown, TrendingUp } from "lucide-react";
import type { LabBiomarker, LabReport } from "@/store/useAppStore";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";
import {
  canShowBiomarkerChart,
  getBiomarkerDisplayName,
  hasValidNumericRange,
  sanitizeLabBiomarker,
} from "@/lib/biomarkerNames";

type ReportContext = Pick<LabReport, "reportType" | "type" | "typeBn" | "typeEn">;

function BiomarkerValueOnlyCard({ biomarker }: { biomarker: LabBiomarker }) {
  const { language } = useAppStore();
  const displayName = getBiomarkerDisplayName(biomarker, language);

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200">
      <h4 className="font-bold text-gray-800 text-sm">{displayName}</h4>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-2xl font-black text-emerald-600">{biomarker.value}</span>
        <span className="text-gray-500 text-xs">{biomarker.unit}</span>
      </div>
    </div>
  );
}

function BiomarkerGauge({ biomarker }: { biomarker: LabBiomarker }) {
  const { language } = useAppStore();
  const t = getT(language);

  if (!hasValidNumericRange(biomarker.normalMin, biomarker.normalMax)) {
    return <BiomarkerValueOnlyCard biomarker={biomarker} />;
  }

  const normalMin = biomarker.normalMin as number;
  const normalMax = biomarker.normalMax as number;
  const { value, status, unit } = biomarker;
  const displayName = getBiomarkerDisplayName(biomarker, language);
  const maxDisplay = Math.max(normalMax * 1.8, value * 1.2, 1);
  const percentage = Math.min((value / maxDisplay) * 100, 100);
  const normalMinPct = (normalMin / maxDisplay) * 100;
  const normalMaxPct = (normalMax / maxDisplay) * 100;

  const statusConfig = {
    high: {
      color: "#ef4444",
      bg: "bg-red-50",
      badge: "bg-red-100 text-red-700",
      label: t.labReports.high,
      icon: TrendingUp,
    },
    low: {
      color: "#f59e0b",
      bg: "bg-amber-50",
      badge: "bg-amber-100 text-amber-700",
      label: t.labReports.low,
      icon: TrendingDown,
    },
    normal: {
      color: "#22c55e",
      bg: "bg-green-50",
      badge: "bg-green-100 text-green-700",
      label: t.labReports.normal,
      icon: CheckCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const normalRangeLabel = language === "bn" ? "স্বাভাবিক:" : "Normal:";
  const highDiffLabel =
    language === "bn"
      ? `স্বাভাবিক সীমার চেয়ে ${(value - normalMax).toFixed(1)} ${unit} বেশি`
      : `${(value - normalMax).toFixed(1)} ${unit} above normal range`;
  const lowDiffLabel =
    language === "bn"
      ? `স্বাভাবিক সীমার চেয়ে ${(normalMin - value).toFixed(1)} ${unit} কম`
      : `${(normalMin - value).toFixed(1)} ${unit} below normal range`;
  const normalLabel =
    language === "bn" ? "স্বাভাবিক পরিসরে আছে" : "Within normal range";

  return (
    <div
      className={`${config.bg} rounded-2xl p-4 border border-opacity-30 ${
        status === "high"
          ? "border-red-200"
          : status === "low"
            ? "border-amber-200"
            : "border-green-200"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-gray-800 text-sm">{displayName}</h4>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black" style={{ color: config.color }}>
              {value}
            </span>
            <span className="text-gray-500 text-xs">{unit}</span>
          </div>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${config.badge}`}
        >
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      <div className="relative">
        <div className="w-full bg-white rounded-full h-5 overflow-hidden shadow-inner relative">
          <div
            className="absolute top-0 h-full bg-green-200 opacity-60"
            style={{
              left: `${normalMinPct}%`,
              width: `${Math.max(normalMaxPct - normalMinPct, 0)}%`,
            }}
          />
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000"
            style={{ width: `${percentage}%`, backgroundColor: config.color }}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-gray-800 opacity-70"
            style={{ left: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1 px-0.5">
          <span>{language === "bn" ? "০" : "0"}</span>
          <span className="text-green-600 text-xs">
            {normalRangeLabel} {normalMin}–{normalMax}
          </span>
          <span>{maxDisplay.toFixed(0)}</span>
        </div>
      </div>

      <p className="text-xs mt-2" style={{ color: config.color }}>
        {status === "high"
          ? highDiffLabel
          : status === "low"
            ? lowDiffLabel
            : normalLabel}
      </p>
    </div>
  );
}

/**
 * Printed reference range on the report → comparison chart.
 * No printed range → name + value + unit only.
 */
export default function BiomarkerResultCard({
  biomarker,
  report,
}: {
  biomarker: LabBiomarker;
  report?: ReportContext;
}) {
  const cleaned = sanitizeLabBiomarker(biomarker, report);

  if (!canShowBiomarkerChart(cleaned, report)) {
    return <BiomarkerValueOnlyCard biomarker={cleaned} />;
  }

  return <BiomarkerGauge biomarker={cleaned} />;
}
