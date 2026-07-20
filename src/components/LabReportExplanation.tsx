"use client";

import type { LabReport } from "@/store/useAppStore";
import type { Language } from "@/lib/translations";
import { getT } from "@/lib/translations";
import { CheckCircle, AlertTriangle, Info, Lightbulb, Stethoscope } from "lucide-react";

interface LabReportExplanationProps {
  report: LabReport;
  language: Language;
}

export default function LabReportExplanation({ report, language }: LabReportExplanationProps) {
  const tl = getT(language).labReports;
  const isBn = language === "bn";

  const summary = isBn ? report.summaryBn : report.summaryEn;
  const meaning = isBn ? report.meaningBn : report.meaningEn;
  const nextSteps = isBn ? report.nextStepsBn : report.nextStepsEn;
  const findings = report.findings ?? [];

  const normalFindings = findings.filter((f) => f.status === "normal");
  const concernFindings = findings.filter((f) => f.status === "concern");
  const infoFindings = findings.filter((f) => f.status === "info");

  if (!summary && findings.length === 0 && !meaning) return null;

  return (
    <div className="space-y-4">
      {summary && (
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-5">
          <h3 className="font-bold text-teal-900 text-sm mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-teal-600" />
            {tl.simpleSummary}
          </h3>
          <p className="text-gray-700 text-sm leading-relaxed">{summary}</p>
        </div>
      )}

      {normalFindings.length > 0 && (
        <FindingSection
          title={tl.normalFindings}
          icon={CheckCircle}
          iconClass="text-green-600"
          borderClass="border-green-200"
          bgClass="bg-green-50"
          findings={normalFindings}
          isBn={isBn}
        />
      )}

      {concernFindings.length > 0 && (
        <FindingSection
          title={tl.concernFindings}
          icon={AlertTriangle}
          iconClass="text-amber-600"
          borderClass="border-amber-200"
          bgClass="bg-amber-50"
          findings={concernFindings}
          isBn={isBn}
        />
      )}

      {infoFindings.length > 0 && (
        <FindingSection
          title={tl.infoFindings}
          icon={Info}
          iconClass="text-blue-600"
          borderClass="border-blue-200"
          bgClass="bg-blue-50"
          findings={infoFindings}
          isBn={isBn}
        />
      )}

      {meaning && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-2">{tl.whatItMeans}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{meaning}</p>
        </div>
      )}

      {nextSteps && nextSteps.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
          <h3 className="font-bold text-violet-900 text-sm mb-3 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-violet-600" />
            {tl.nextSteps}
          </h3>
          <ol className="space-y-2">
            {nextSteps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-violet-900">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-200 text-violet-800 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="leading-relaxed pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center px-2">{tl.disclaimer}</p>
    </div>
  );
}

function FindingSection({
  title,
  icon: Icon,
  iconClass,
  borderClass,
  bgClass,
  findings,
  isBn,
}: {
  title: string;
  icon: typeof CheckCircle;
  iconClass: string;
  borderClass: string;
  bgClass: string;
  findings: NonNullable<LabReport["findings"]>;
  isBn: boolean;
}) {
  return (
    <div className={`${bgClass} border ${borderClass} rounded-2xl p-5`}>
      <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${iconClass}`}>
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      <div className="space-y-3">
        {findings.map((f, i) => (
          <div key={i} className="bg-white/70 rounded-xl p-3">
            <p className="font-semibold text-gray-800 text-sm mb-1">
              {isBn ? f.titleBn : f.titleEn}
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              {isBn ? f.detailBn : f.detailEn}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
