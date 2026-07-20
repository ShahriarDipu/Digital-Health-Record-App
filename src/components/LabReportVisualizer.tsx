"use client";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { LabReport, LabBiomarker } from "@/store/useAppStore";
import {
  Upload,
  FlaskConical,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileX,
} from "lucide-react";
import { getT } from "@/lib/translations";
import { createStepAnimator } from "@/lib/analysisProgress";
import { getBiomarkerDisplayName, getBiomarkerShortName, getLabReportTypeName } from "@/lib/biomarkerNames";
import AnalysisProcessingProgress from "@/components/AnalysisProcessingProgress";
import WhySaveUploadModal from "@/components/WhySaveUploadModal";
import LabReportExplanation from "@/components/LabReportExplanation";
import {
  patchVisitAfterScan,
  resolveVisitIdFromScanTarget,
  type WhySaveScanTarget,
} from "@/lib/whySaveScan";
import {
  getWhySaveSession,
  lockWhySaveSessionToVisit,
  scanTargetFromSession,
  setWhySaveSession,
} from "@/lib/whySaveSession";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

function BiomarkerGauge({ biomarker }: { biomarker: LabBiomarker }) {
  const { language } = useAppStore();
  const t = getT(language);
  const { value, normalMin, normalMax, status, unit } = biomarker;
  const displayName = getBiomarkerDisplayName(biomarker, language);
  const maxDisplay = normalMax * 1.8;
  const percentage = Math.min((value / maxDisplay) * 100, 100);
  const normalMinPct = (normalMin / maxDisplay) * 100;
  const normalMaxPct = (normalMax / maxDisplay) * 100;

  const statusConfig = {
    high: { color: "#ef4444", bg: "bg-red-50", badge: "bg-red-100 text-red-700", label: t.labReports.high, icon: TrendingUp },
    low: { color: "#f59e0b", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-700", label: t.labReports.low, icon: TrendingDown },
    normal: { color: "#22c55e", bg: "bg-green-50", badge: "bg-green-100 text-green-700", label: t.labReports.normal, icon: CheckCircle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const normalRangeLabel = language === "bn" ? "স্বাভাবিক:" : "Normal:";
  const highDiffLabel = language === "bn"
    ? `স্বাভাবিক সীমার চেয়ে ${(value - normalMax).toFixed(1)} ${unit} বেশি`
    : `${(value - normalMax).toFixed(1)} ${unit} above normal range`;
  const lowDiffLabel = language === "bn"
    ? `স্বাভাবিক সীমার চেয়ে ${(normalMin - value).toFixed(1)} ${unit} কম`
    : `${(normalMin - value).toFixed(1)} ${unit} below normal range`;
  const normalLabel = language === "bn" ? "স্বাভাবিক পরিসরে আছে" : "Within normal range";

  return (
    <div className={`${config.bg} rounded-2xl p-4 border border-opacity-30 ${
      status === "high" ? "border-red-200" : status === "low" ? "border-amber-200" : "border-green-200"
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-gray-800 text-sm">{displayName}</h4>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black" style={{ color: config.color }}>{value}</span>
            <span className="text-gray-500 text-xs">{unit}</span>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${config.badge}`}>
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      {/* Visual Bar Gauge */}
      <div className="relative">
        <div className="w-full bg-white rounded-full h-5 overflow-hidden shadow-inner relative">
          <div
            className="absolute top-0 h-full bg-green-200 opacity-60"
            style={{ left: `${normalMinPct}%`, width: `${normalMaxPct - normalMinPct}%` }}
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
          <span className="text-green-600 text-xs">{normalRangeLabel} {normalMin}–{normalMax}</span>
          <span>{maxDisplay.toFixed(0)}</span>
        </div>
      </div>

      <p className="text-xs mt-2" style={{ color: config.color }}>
        {status === "high" ? highDiffLabel : status === "low" ? lowDiffLabel : normalLabel}
      </p>
    </div>
  );
}

function getReportStats(report: LabReport) {
  if (report.biomarkers.length > 0) {
    return {
      high: report.biomarkers.filter((b) => b.status === "high").length,
      low: report.biomarkers.filter((b) => b.status === "low").length,
      normal: report.biomarkers.filter((b) => b.status === "normal").length,
    };
  }
  const findings = report.findings ?? [];
  return {
    high: findings.filter((f) => f.status === "concern").length,
    low: 0,
    normal: findings.filter((f) => f.status === "normal").length,
  };
}

function ReportCard({ report, isSelected, onClick }: { report: LabReport; isSelected: boolean; onClick: () => void }) {
  const { language } = useAppStore();
  const { high: highCount, low: lowCount, normal: normalCount } = getReportStats(report);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        isSelected
          ? "border-teal-500 bg-teal-50 shadow-md"
          : "border-gray-200 bg-white hover:border-teal-300"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-bold text-gray-800 text-sm">{getLabReportTypeName(report, language)}</h4>
          <p className="text-gray-500 text-xs">{report.date}</p>
        </div>
        <CheckCircle className={`w-5 h-5 ${isSelected ? "text-teal-500" : "text-gray-300"}`} />
      </div>
      <ReportCardStats highCount={highCount} lowCount={lowCount} normalCount={normalCount} />
    </button>
  );
}

function ReportCardStats({ highCount, lowCount, normalCount }: { highCount: number; lowCount: number; normalCount: number }) {
  const { language } = useAppStore();
  const t = getT(language);
  return (
    <div className="flex gap-2 flex-wrap">
      {highCount > 0 && (
        <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{highCount} {t.labReports.high}</span>
      )}
      {lowCount > 0 && (
        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{lowCount} {t.labReports.low}</span>
      )}
      {normalCount > 0 && (
        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{normalCount} {t.labReports.normal}</span>
      )}
    </div>
  );
}

export default function LabReportVisualizer() {
  const {
    labReports,
    addLabReport,
    setCurrentLabReport,
    language,
    visits,
    addVisit,
    updateVisit,
  } = useAppStore();
  const t = getT(language);
  const tl = t.labReports;
  const isBn = language === "bn";
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "processing" | "done">("idle");
  const [processingStepIndex, setProcessingStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [showWhySave, setShowWhySave] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingScanTargetRef = useRef<WhySaveScanTarget | null>(null);
  const pendingFileRef = useRef<File | null>(null);
  const suppressWhySaveUntilRef = useRef(0);

  useEffect(() => {
    if (labReports.length === 0) {
      setSelectedReport(null);
      return;
    }
    setSelectedReport((prev) =>
      prev && labReports.some((r) => r.id === prev.id)
        ? prev
        : labReports[labReports.length - 1]
    );
  }, [labReports]);

  const analyzeFile = async (
    file: File,
    scanTarget?: WhySaveScanTarget | null
  ) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError(language === "bn" ? "JPG, PNG, WEBP বা PDF আপলোড করুন" : "Please upload JPG, PNG, WEBP, or PDF");
      pendingScanTargetRef.current = null;
      pendingFileRef.current = null;
      return;
    }

    setError("");
    setUploadState("processing");
    setProcessingStepIndex(0);
    setProgress(0);

    const totalSteps = tl.processingSteps.length;
    const stopAnimator = createStepAnimator(totalSteps, (stepIdx, pct) => {
      setProcessingStepIndex(stepIdx);
      setProgress(pct);
    });

    try {
      const willSaveToVisit = Boolean(scanTarget);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", language);
      formData.append("source", "main_tab");
      if (willSaveToVisit) formData.append("savedToVisit", "true");

      const res = await fetch("/api/lab-report/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      stopAnimator();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      const report: LabReport = data.report;
      setProcessingStepIndex(totalSteps - 1);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 400));

      addLabReport(report);
      setCurrentLabReport(report);
      setSelectedReport(report);
      setUploadState("done");

      // Visit / follow-up created only after a successful scan
      if (scanTarget) {
        try {
          const visitId = await resolveVisitIdFromScanTarget(scanTarget, addVisit);
          // Pin session as soon as visit exists (even if PATCH retries later)
          lockWhySaveSessionToVisit("lab_report", visitId);
          const visit =
            useAppStore.getState().visits.find((v) => v.id === visitId) ??
            visits.find((v) => v.id === visitId);
          const nextReports = [...(visit?.labReports ?? []), report];
          updateVisit(visitId, { labReports: nextReports });
          await patchVisitAfterScan(visitId, {
            labReports: nextReports,
            activitySource: "main_tab",
          });
        } catch {
          setError(
            language === "bn"
              ? "স্ক্যান হয়েছে, কিন্তু ভিজিটে সেভ হয়নি। আবার চেষ্টা করুন।"
              : "Scanned, but could not save to visit. Please try again."
          );
        }
      }
    } catch (err) {
      stopAnimator();
      setUploadState("idle");
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      pendingScanTargetRef.current = null;
      pendingFileRef.current = null;
    }
  };

  /** Reuse session choice → skip modal; reload clears memory → modal again. */
  const startUpload = () => {
    if (Date.now() < suppressWhySaveUntilRef.current) return;
    const session = getWhySaveSession("lab_report");
    if (session) {
      pendingScanTargetRef.current = scanTargetFromSession(session);
      fileRef.current?.click();
      return;
    }
    setShowWhySave(true);
  };

  /** Keep sync with the button click so the OS file/camera picker is allowed. */
  const proceedAfterWhySave = (target?: WhySaveScanTarget) => {
    suppressWhySaveUntilRef.current = Date.now() + 1500;
    setWhySaveSession(
      "lab_report",
      target ? { kind: "visit", target } : { kind: "skip" }
    );
    pendingScanTargetRef.current = target ?? null;
    setShowWhySave(false);
    const pending = pendingFileRef.current;
    if (pending) {
      pendingFileRef.current = null;
      void analyzeFile(pending, target);
      return;
    }
    fileRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void analyzeFile(file, pendingScanTargetRef.current);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const session = getWhySaveSession("lab_report");
    if (session) {
      void analyzeFile(file, scanTargetFromSession(session));
      return;
    }
    pendingFileRef.current = file;
    startUpload();
  };

  const highCount = labReports.reduce((sum, r) => sum + getReportStats(r).high, 0);
  const normalCount = labReports.reduce((sum, r) => sum + getReportStats(r).normal, 0);

  const overviewData = selectedReport
    ? selectedReport.biomarkers.map((b) => ({
        name: getBiomarkerShortName(b, language),
        value: b.value,
        min: b.normalMin,
        max: b.normalMax,
        fill: b.status === "high" ? "#ef4444" : b.status === "low" ? "#f59e0b" : "#22c55e",
      }))
    : [];

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-cyan-500 rounded-2xl p-6 text-white shadow-lg shadow-teal-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{tl.title}</h2>
            <p className="text-teal-100 text-sm">{tl.subtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
            <p className="text-white font-black text-2xl">{labReports.length}</p>
            <p className="text-teal-100 text-xs mt-0.5">{language === "bn" ? "মোট রিপোর্ট" : "Total Reports"}</p>
          </div>
          <div className="bg-red-400/30 backdrop-blur-sm rounded-xl p-3 text-center border border-red-300/30">
            <p className="text-white font-black text-2xl">{highCount}</p>
            <p className="text-red-100 text-xs mt-0.5">{language === "bn" ? "হাই ইন্ডিকেটর" : "High Values"}</p>
          </div>
          <div className="bg-emerald-400/30 backdrop-blur-sm rounded-xl p-3 text-center border border-emerald-300/30">
            <p className="text-white font-black text-2xl">{normalCount}</p>
            <p className="text-emerald-100 text-xs mt-0.5">{language === "bn" ? "স্বাভাবিক" : "Normal"}</p>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Upload Zone */}
      {uploadState !== "processing" && (
        <div
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
            isDragging
              ? "border-teal-500 bg-teal-50"
              : "border-teal-200 bg-white hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={startUpload}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-200">
              <Upload className="w-6 h-6 text-teal-500" />
            </div>
            <div className="text-left">
              <p className="text-gray-700 font-semibold text-sm">{tl.uploadTitle}</p>
              <p className="text-gray-400 text-xs mt-0.5">{tl.uploadDesc}</p>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 active:scale-95 transition-all shadow-sm shadow-teal-200"
              onClick={(e) => { e.stopPropagation(); startUpload(); }}
            >
              <Upload className="w-4 h-4" />
              {tl.uploadBtn}
            </button>
          </div>
        </div>
      )}

      {uploadState === "processing" && (
        <AnalysisProcessingProgress
          title={tl.processingTitle}
          progressLabel={tl.progress}
          almostDoneLabel={tl.almostDone}
          steps={tl.processingSteps}
          processingStepIndex={processingStepIndex}
          progress={progress}
          isBn={isBn}
          theme="teal"
        />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Report Selector */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">{tl.allReports}</h3>
        {labReports.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <FileX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">{tl.emptyReports}</p>
            <p className="text-gray-400 text-sm mt-1">{tl.emptyReportsDesc}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {labReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                isSelected={selectedReport?.id === report.id}
                onClick={() => setSelectedReport(report)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedReport && (
        <>
      {/* Plain-language explanation — shown first */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-1">{getLabReportTypeName(selectedReport, language)}</h3>
        <p className="text-gray-500 text-xs mb-4">{tl.reportDate} {selectedReport.date}</p>
        <LabReportExplanation report={selectedReport} language={language} />
      </div>

      {/* Numeric charts — only for blood tests with biomarkers */}
      {selectedReport.biomarkers.length > 0 && (
        <>
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">{tl.numericResults}</h3>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overviewData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                formatter={(value) => [value, language === "bn" ? "মান" : "Value"]}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {overviewData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex gap-4 justify-center mt-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-red-600"><span className="w-3 h-3 bg-red-400 rounded-full" />{tl.high}</div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600"><span className="w-3 h-3 bg-amber-400 rounded-full" />{tl.low}</div>
          <div className="flex items-center gap-1.5 text-xs text-green-600"><span className="w-3 h-3 bg-green-400 rounded-full" />{tl.normal}</div>
        </div>
      </div>

      {/* Individual Biomarker Gauges */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">{tl.biomarkers}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {selectedReport.biomarkers.map((biomarker, idx) => (
            <BiomarkerGauge key={idx} biomarker={biomarker} />
          ))}
        </div>
      </div>

      {/* Alert Banner for High Values */}
      {selectedReport.biomarkers.some((b) => b.status === "high") && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 text-sm mb-1">
              {language === "bn" ? "⚠️ মনোযোগ প্রয়োজন" : "⚠️ Attention Required"}
            </p>
            <p className="text-red-600 text-sm">
              {language === "bn" ? "আপনার " : "Your "}
              {selectedReport.biomarkers
                .filter((b) => b.status === "high")
                .map((b) => getBiomarkerDisplayName(b, language))
                .join(", ")}{" "}
              {language === "bn"
                ? "স্বাভাবিকের চেয়ে বেশি। অনুগ্রহ করে ডক্টরের সাথে পরামর্শ করুন।"
                : "is above normal range. Please consult a doctor."}
            </p>
          </div>
        </div>
      )}
        </>
      )}
        </>
      )}

      <WhySaveUploadModal
        open={showWhySave}
        source="lab_report"
        onClose={() => {
          suppressWhySaveUntilRef.current = Date.now() + 800;
          setShowWhySave(false);
          pendingFileRef.current = null;
          pendingScanTargetRef.current = null;
        }}
        onSkip={() => proceedAfterWhySave()}
        onProceedToScan={(target) => proceedAfterWhySave(target)}
      />
    </div>
  );
}
