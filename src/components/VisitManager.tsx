"use client";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { Visit, Prescription, LabReport } from "@/store/useAppStore";
import { SCHEDULE_MAP } from "@/lib/scheduleMap";
import { getT } from "@/lib/translations";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import AnalysisProcessingProgress from "@/components/AnalysisProcessingProgress";
import LabReportExplanation from "@/components/LabReportExplanation";
import BiomarkerResultCard from "@/components/BiomarkerResultCard";
import {
  getBiomarkerShortName,
  getChartableBiomarkers,
  getLabReportTypeName,
} from "@/lib/biomarkerNames";
import { createStepAnimator } from "@/lib/analysisProgress";
import {
  computeVisitSourceFingerprint,
  getAnalysisClearPatch,
  shouldClearAnalysis,
} from "@/lib/visitAnalysis";
import { dbToVisit } from "@/lib/visitDb";
import InfoModal from "@/components/InfoModal";
import {
  Stethoscope,
  Plus,
  ChevronRight,
  ChevronLeft,
  Pill,
  FlaskConical,
  FileText,
  Heart,
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Trash2,
  Calendar,
  Building2,
  MessageSquare,
  Clock,
  Info,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldAlert,
  Salad,
  Dumbbell,
  BedDouble,
  Bell,
} from "lucide-react";
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

// ─── DB Helpers ────────────────────────────────────────────────────────────────

function mergePrescriptions(prescriptions: Prescription[]): Prescription | undefined {
  if (prescriptions.length === 0) return undefined;
  return {
    ...prescriptions[0],
    medicines: prescriptions.flatMap((p) => p.medicines),
  };
}

// Group visits into cases: root visit + its follow-ups
function groupVisitsIntoCases(visits: Visit[]): { root: Visit; followUps: Visit[] }[] {
  const roots = visits.filter((v) => !v.parentVisitId);
  const followUpMap: Record<string, Visit[]> = {};
  visits
    .filter((v) => v.parentVisitId)
    .forEach((v) => {
      if (!followUpMap[v.parentVisitId!]) followUpMap[v.parentVisitId!] = [];
      followUpMap[v.parentVisitId!].push(v);
    });

  // Also include "orphan" followups (parentVisitId doesn't match any root — treat as root)
  const rootIds = new Set(roots.map((r) => r.id));
  visits
    .filter((v) => v.parentVisitId && !rootIds.has(v.parentVisitId))
    .forEach((v) => roots.push({ ...v, visitType: "initial", parentVisitId: undefined }));

  return roots
    .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
    .map((root) => ({
      root,
      followUps: (followUpMap[root.id] || []).sort(
        (a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
      ),
    }));
}

async function patchVisitDB(id: string, data: Partial<Visit>) {
  const body: Record<string, unknown> = { ...data };
  if (data.prescriptions !== undefined) {
    body.prescription = data.prescriptions.length > 0 ? data.prescriptions : null;
    delete body.prescriptions;
  }
  if (data.healthReport === undefined && "healthReport" in data) {
    body.healthReport = null;
  }
  if (data.lifestyleDirections === undefined && "lifestyleDirections" in data) {
    body.lifestyleDirections = null;
  }
  await fetch(`/api/visits/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function saveVisitSourceUpdate(
  visit: Visit,
  sourcePatch: Partial<Pick<Visit, "prescriptions" | "labReports">>,
  updateVisit: (id: string, updates: Partial<Visit>) => void
) {
  const nextVisit = { ...visit, ...sourcePatch };
  const patch: Partial<Visit> = { ...sourcePatch };
  if (shouldClearAnalysis(visit, nextVisit)) {
    Object.assign(patch, getAnalysisClearPatch(visit));
  }
  updateVisit(visit.id, patch);
  await patchVisitDB(visit.id, patch);
}

// ─── Doctor Case Card (groups initial + follow-ups) ─────────────────────────

function DoctorCaseCard({
  root,
  followUps,
  onClick,
}: {
  root: Visit;
  followUps: Visit[];
  onClick: (visit: Visit) => void;
}) {
  const { language } = useAppStore();
  const isBn = language === "bn";
  const totalVisits = 1 + followUps.length;
  const latest = followUps.length > 0 ? followUps[followUps.length - 1] : root;
  const hasHealthReport = !!latest.healthReport;
  const allVisits = [root, ...followUps];
  const lastTrend = followUps.find((v) => v.progressReport)?.progressReport?.overallTrend;

  const riskColors: Record<string, string> = {
    low: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    high: "bg-red-100 text-red-700 border-red-200",
  };

  const trendConfig = {
    improving: { color: "text-green-600", bg: "bg-green-50", icon: TrendingUp, label: isBn ? "উন্নতি" : "Improving" },
    stable: { color: "text-amber-600", bg: "bg-amber-50", icon: Clock, label: isBn ? "স্থিতিশীল" : "Stable" },
    worsening: { color: "text-red-600", bg: "bg-red-50", icon: TrendingDown, label: isBn ? "অবনতি" : "Worsening" },
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-teal-200 transition-all overflow-hidden">
      {/* Case header */}
      <button
        onClick={() => onClick(root)}
        className="w-full text-left p-5 group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{root.doctorName}</h3>
              {root.clinicName && (
                <p className="text-gray-500 text-xs">{root.clinicName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {lastTrend && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${trendConfig[lastTrend].bg} ${trendConfig[lastTrend].color}`}>
                {(() => { const TrendIcon = trendConfig[lastTrend].icon; return <TrendIcon className="w-3 h-3" />; })()}
                {trendConfig[lastTrend].label}
              </span>
            )}
            {hasHealthReport && latest.healthReport && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${riskColors[latest.healthReport.riskLevel]}`}>
                {latest.healthReport.riskLevel === "low" ? (isBn ? "ঝুঁকি কম" : "Low Risk") :
                 latest.healthReport.riskLevel === "medium" ? (isBn ? "মাঝারি" : "Medium") :
                 (isBn ? "উচ্চ ঝুঁকি" : "High Risk")}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors" />
          </div>
        </div>

        {/* Visit count badge */}
        <div className="flex items-center gap-3 mb-3">
          <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-full border border-teal-200">
            {totalVisits} {isBn ? "টি ভিজিট" : totalVisits === 1 ? "visit" : "visits"}
          </span>
          {followUps.length > 0 && (
            <span className="bg-purple-50 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full border border-purple-200">
              {followUps.length} {isBn ? "টি ফলো-আপ" : "follow-up" + (followUps.length > 1 ? "s" : "")}
            </span>
          )}
          {hasHealthReport && (
            <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full border border-indigo-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI
            </span>
          )}
        </div>

        {/* Mini timeline dots */}
        <div className="flex items-center gap-1.5">
          {allVisits.map((v, i) => (
            <div key={v.id} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                i === 0 ? "bg-teal-500" :
                v.progressReport?.overallTrend === "improving" ? "bg-green-400" :
                v.progressReport?.overallTrend === "worsening" ? "bg-red-400" : "bg-amber-400"
              }`} />
              {i < allVisits.length - 1 && <div className="w-4 h-0.5 bg-gray-200 flex-shrink-0" />}
            </div>
          ))}
          <span className="text-gray-400 text-xs ml-1.5">{root.visitDate}</span>
          {followUps.length > 0 && (
            <span className="text-gray-400 text-xs">→ {followUps[followUps.length - 1].visitDate}</span>
          )}
        </div>
      </button>

      {/* Follow-up quick list (if multiple) */}
      {followUps.length > 0 && (
        <div className="border-t border-gray-100 px-5 pb-4 pt-3">
          <p className="text-xs font-bold text-gray-500 mb-2">
            {isBn ? "ফলো-আপ ভিজিটসমূহ:" : "Follow-up visits:"}
          </p>
          <div className="space-y-1.5">
            {followUps.map((fu, i) => (
              <button
                key={fu.id}
                onClick={(e) => { e.stopPropagation(); onClick(fu); }}
                className="w-full flex items-center justify-between text-left px-3 py-2 rounded-xl bg-gray-50 hover:bg-teal-50 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    fu.progressReport?.overallTrend === "improving" ? "bg-green-400" :
                    fu.progressReport?.overallTrend === "worsening" ? "bg-red-400" :
                    fu.progressReport ? "bg-amber-400" : "bg-gray-300"
                  }`} />
                  <span className="text-xs font-medium text-gray-700">
                    {isBn ? `ফলো-আপ ${i + 1}` : `Follow-up ${i + 1}`} — {fu.visitDate}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {fu.prescriptions.length > 0 && <Pill className="w-3 h-3 text-teal-400" />}
                  {fu.labReports.length > 0 && <FlaskConical className="w-3 h-3 text-blue-400" />}
                  {fu.progressReport && (
                    <span className={`text-xs font-bold ${
                      fu.progressReport.overallTrend === "improving" ? "text-green-600" :
                      fu.progressReport.overallTrend === "worsening" ? "text-red-600" : "text-amber-600"
                    }`}>
                      {fu.progressReport.scoreChange >= 0 ? "+" : ""}{fu.progressReport.scoreChange}
                    </span>
                  )}
                  <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-teal-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Visit Form ────────────────────────────────────────────────────────

interface CreateVisitData {
  doctorName: string;
  visitDate: string;
  clinicName?: string;
  chiefComplaint?: string;
}

function CreateVisitForm({
  onCreated,
  onCancel,
  creating,
}: {
  onCreated: (data: CreateVisitData) => void;
  onCancel: () => void;
  creating: boolean;
}) {
  const { language } = useAppStore();
  const t = getT(language);
  const tv = t.visits;

  const today = new Date().toISOString().split("T")[0];
  const [doctorName, setDoctorName] = useState("");
  const [visitDate, setVisitDate] = useState(today);
  const [clinicName, setClinicName] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim()) return;
    onCreated({
      doctorName: doctorName.trim(),
      visitDate,
      clinicName: clinicName.trim() || undefined,
      chiefComplaint: chiefComplaint.trim() || undefined,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{tv.createTitle}</h3>
            <p className="text-teal-200 text-sm">{tv.createSubtitle}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {tv.doctorName} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder={tv.doctorNamePlaceholder}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {tv.visitDate} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            max={today}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {tv.clinicName}
          </label>
          <input
            type="text"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            placeholder={tv.clinicNamePlaceholder}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {tv.chiefComplaint}
          </label>
          <input
            type="text"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder={tv.chiefComplaintPlaceholder}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={creating}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:border-gray-300 transition-colors text-sm disabled:opacity-50"
          >
            {tv.cancel}
          </button>
          <button
            type="submit"
            disabled={!doctorName.trim() || creating}
            className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {language === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving..."}
              </>
            ) : (
              tv.createBtn
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Follow-up Form ───────────────────────────────────────────────────────────

function FollowUpForm({
  rootVisit,
  onCreated,
  onCancel,
  creating,
}: {
  rootVisit: Visit;
  onCreated: (data: { visitDate: string; chiefComplaint?: string }) => void;
  onCancel: () => void;
  creating: boolean;
}) {
  const { language } = useAppStore();
  const isBn = language === "bn";
  const today = new Date().toISOString().split("T")[0];
  const [visitDate, setVisitDate] = useState(today);
  const [chiefComplaint, setChiefComplaint] = useState("");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">
              {isBn ? "ফলো-আপ ভিজিট" : "Follow-up Visit"}
            </h3>
            <p className="text-purple-200 text-sm">
              {rootVisit.doctorName}
              {rootVisit.clinicName && ` · ${rootVisit.clinicName}`}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreated({ visitDate, chiefComplaint: chiefComplaint.trim() || undefined });
        }}
        className="p-5 space-y-4"
      >
        <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
          <p className="text-xs text-purple-700 font-medium">
            {isBn
              ? `${rootVisit.doctorName}-এর সাথে প্রথম ভিজিট: ${rootVisit.visitDate}`
              : `First visit with ${rootVisit.doctorName}: ${rootVisit.visitDate}`}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {isBn ? "ফলো-আপের তারিখ" : "Follow-up Date"} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            max={today}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {isBn ? "ডাক্তার কী বললেন? (ঐচ্ছিক)" : "Doctor's notes (optional)"}
          </label>
          <input
            type="text"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder={isBn ? "যেমন: ওষুধ পরিবর্তন করলেন, নতুন test দিলেন..." : "e.g. Adjusted medicine, ordered new tests..."}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        <p className="text-gray-500 text-xs bg-gray-50 rounded-xl p-3">
          {isBn
            ? "ফলো-আপ তৈরির পর prescription ও lab report scan করতে পারবেন।"
            : "After creating the follow-up, you can scan the prescription & lab reports."}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={creating}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium text-sm disabled:opacity-50"
          >
            {isBn ? "বাতিল" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={creating}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{isBn ? "সংরক্ষণ হচ্ছে..." : "Saving..."}</>
            ) : (
              <>{isBn ? "ফলো-আপ তৈরি করুন" : "Create Follow-up"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Prescription Tab Inside Visit ───────────────────────────────────────────

const medColors = [
  "border-l-teal-500",
  "border-l-blue-500",
  "border-l-purple-500",
  "border-l-orange-500",
];

function PrescriptionTab({ visit }: { visit: Visit }) {
  const { updateVisit, language, openReminderModal } = useAppStore();
  const t = getT(language);
  const tp = t.prescription;
  const tv = t.visits;
  const isBn = language === "bn";
  const { reminders } = useAppStore();
  const [uploadState, setUploadState] = useState<"idle" | "processing">("idle");
  const [processingStep, setProcessingStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(
    visit.prescriptions.length > 0
      ? visit.prescriptions[visit.prescriptions.length - 1]
      : null
  );
  const [expandedMed, setExpandedMed] = useState<number | null>(0);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const visitReminderCount = reminders.filter((r) => r.visitId === visit.id).length;

  useEffect(() => {
    if (visit.prescriptions.length === 0) {
      setSelectedPrescription(null);
      return;
    }
    if (
      !selectedPrescription ||
      !visit.prescriptions.some((p) => p.id === selectedPrescription.id)
    ) {
      setSelectedPrescription(visit.prescriptions[visit.prescriptions.length - 1]);
    }
  }, [visit.prescriptions, selectedPrescription]);

  const analyzeFile = async (file: File) => {
    setError("");
    setUploadState("processing");
    setProcessingStep(0);
    setProgress(0);
    const totalSteps = tp.processingSteps.length;
    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < totalSteps - 1) {
        setProcessingStep(stepIdx);
        setProgress(Math.round((stepIdx / (totalSteps - 1)) * 85));
      }
    }, 1200);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", language);
      formData.append("source", "visit_tab");
      formData.append("savedToVisit", "true");
      const res = await fetch("/api/prescription/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      clearInterval(interval);
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      const prescription: Prescription = data.prescription;
      setProcessingStep(totalSteps - 1);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      const updated = [...visit.prescriptions, prescription];
      await saveVisitSourceUpdate(visit, { prescriptions: updated }, updateVisit);
      setSelectedPrescription(prescription);
      setExpandedMed(0);
      setUploadState("idle");
    } catch (err) {
      clearInterval(interval);
      setUploadState("idle");
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const deletePrescription = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const updated = visit.prescriptions.filter((p) => p.id !== deleteTarget.id);
      await saveVisitSourceUpdate(visit, { prescriptions: updated }, updateVisit);
      if (selectedPrescription?.id === deleteTarget.id) {
        setSelectedPrescription(updated.length > 0 ? updated[updated.length - 1] : null);
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const prescription = selectedPrescription;

  return (
    <div className="space-y-4">
      {/* Upload area — always visible */}
      <div
        className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
          uploadState === "processing"
            ? "border-teal-300 bg-teal-50"
            : "border-gray-300 hover:border-teal-400 cursor-pointer hover:bg-teal-50"
        }`}
        onClick={() => uploadState !== "processing" && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) analyzeFile(f);
            e.target.value = "";
          }}
        />
        {uploadState === "processing" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
              <p className="text-teal-700 font-medium text-sm">{tp.processingTitle}</p>
            </div>
            <p className="text-gray-500 text-xs">{tp.processingSteps[processingStep]}</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <FileText className="w-7 h-7 text-gray-400" />
            <div className="text-left">
              <p className="font-medium text-gray-700 text-sm">
                {visit.prescriptions.length > 0 ? tp.addPage : tv.scanPrescription}
              </p>
              <p className="text-gray-400 text-xs">
                {visit.prescriptions.length > 0 ? tp.addPageDesc : tv.scanPrescriptionDesc}
              </p>
            </div>
            <button className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700">
              <Upload className="w-4 h-4" /> {tp.uploadBtn}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Prescription page list */}
      {visit.prescriptions.length > 0 && (
        <div className="space-y-2">
          {visit.prescriptions.map((rx, pageIdx) => (
            <div
              key={rx.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedPrescription(rx);
                setExpandedMed(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedPrescription(rx);
                  setExpandedMed(0);
                }
              }}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                selectedPrescription?.id === rx.id
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 bg-white hover:border-teal-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-green-700 font-bold text-xs">{tp.successLabel}</span>
                    {visit.prescriptions.length > 1 && (
                      <span className="text-gray-400 text-xs">
                        {tp.pageLabel} {pageIdx + 1}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-gray-800 text-sm truncate">{rx.doctorName}</p>
                  <p className="text-gray-500 text-xs">
                    {tp.dateLabel} {rx.date} • {rx.medicines.length} {tp.medicineCount}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(rx);
                  }}
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label={tp.deletePage}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected prescription medicines */}
      {prescription && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-gray-800">{prescription.doctorName}</h3>
                <p className="text-gray-500 text-xs">
                  {tp.dateLabel} {prescription.date}
                </p>
              </div>
              <div className="bg-teal-50 rounded-xl p-2.5 text-center">
                <p className="text-xl font-bold text-teal-600">{prescription.medicines.length}</p>
                <p className="text-teal-600 text-xs">{tp.medicineCount}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-600">
                <span className="font-medium">{tp.patientLabel}</span> {prescription.patientName}
              </p>
            </div>
          </div>

          {prescription.medicines.map((med, idx) => (
            <div
              key={`${prescription.id}-${idx}`}
              className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${
                medColors[idx % medColors.length]
              } overflow-hidden`}
            >
              <button
                className="w-full p-4 flex items-start justify-between gap-3"
                onClick={() => setExpandedMed(expandedMed === idx ? null : idx)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Pill className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800 text-sm">{med.name}</p>
                    <p className="text-gray-500 text-xs">
                      {med.dose} • {med.schedule}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded-full">
                    {isBn ? (med.durationBn || med.duration) : (med.durationEn || med.duration)}
                  </span>
                  {expandedMed === idx ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>
              {expandedMed === idx && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-blue-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Info className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-blue-700 text-xs font-bold">{tp.purposeLabel}</span>
                      </div>
                      <p className="text-gray-700 text-sm">
                        {isBn ? (med.purposeBn || med.purpose) : (med.purposeEn || med.purpose)}
                      </p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-amber-700 text-xs font-bold">{tp.instructionLabel}</span>
                      </div>
                      <p className="text-gray-700 text-sm">
                        {isBn ? (med.instructionsBn || med.instructions) : (med.instructionsEn || med.instructions)}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-green-700 text-xs font-bold">{tp.reasonLabel}</span>
                      </div>
                      <p className="text-gray-700 text-sm">
                        {tp.reasonPrefix}{" "}
                        {(isBn ? (med.purposeBn || med.purpose) : (med.purposeEn || med.purpose)).toLowerCase()}{" "}
                        {tp.reasonSuffix}
                      </p>
                    </div>
                  </div>
                  {SCHEDULE_MAP[med.schedule] && (
                    <div className="bg-teal-50 rounded-xl p-3 border border-teal-200 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-800 mb-0.5">{tp.reminderQuestion}</p>
                        <p className="text-xs text-gray-500">
                          {med.name} {tp.reminderFor}{" "}
                          {SCHEDULE_MAP[med.schedule].times.join(", ")} {tp.reminderAlertSuffix}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          openReminderModal(
                            med.name,
                            SCHEDULE_MAP[med.schedule].times,
                            visit.doctorName,
                            visit.id
                          )
                        }
                        className="flex-shrink-0 bg-teal-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-teal-700"
                      >
                        {tp.setReminder}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {visitReminderCount > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Bell className="w-4 h-4 text-teal-500 flex-shrink-0" />
              <p className="text-teal-700 text-sm">
                {isBn
                  ? `${visitReminderCount}টি ওষুধের reminder সক্রিয় আছে`
                  : `${visitReminderCount} medicine reminder${visitReminderCount > 1 ? "s" : ""} active`}
              </p>
            </div>
          )}
        </div>
      )}

      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={deletePrescription}
        title={tp.deleteConfirm}
        subtitle={
          deleteTarget
            ? `${deleteTarget.doctorName} • ${deleteTarget.date}`
            : undefined
        }
        description={tp.deleteDesc}
        cancelLabel={tp.deleteCancel}
        confirmLabel={tp.deleteConfirmBtn}
        loading={deleting}
      />
    </div>
  );
}

// ─── Lab Reports Tab Inside Visit ────────────────────────────────────────────

function getLabReportStats(report: LabReport) {
  if (report.biomarkers.length > 0) {
    const comparable = getChartableBiomarkers(report);
    return {
      high: comparable.filter((b) => b.status === "high").length,
      low: comparable.filter((b) => b.status === "low").length,
      normal: comparable.filter((b) => b.status === "normal").length,
    };
  }
  const findings = report.findings ?? [];
  return {
    high: findings.filter((f) => f.status === "concern").length,
    low: 0,
    normal: findings.filter((f) => f.status === "normal").length,
  };
}

function LabReportsTab({ visit }: { visit: Visit }) {
  const { updateVisit, language } = useAppStore();
  const t = getT(language);
  const tl = t.labReports;
  const tv = t.visits;
  const isBn = language === "bn";
  const [uploadState, setUploadState] = useState<"idle" | "processing">("idle");
  const [processingStepIndex, setProcessingStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(
    visit.labReports.length > 0
      ? visit.labReports[visit.labReports.length - 1]
      : null
  );
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LabReport | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyzeFile = async (file: File) => {
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", language);
      formData.append("source", "visit_tab");
      formData.append("savedToVisit", "true");
      const res = await fetch("/api/lab-report/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      stopAnimator();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      const report: LabReport = data.report;
      setProcessingStepIndex(totalSteps - 1);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      const updated = [...visit.labReports, report];
      await saveVisitSourceUpdate(visit, { labReports: updated }, updateVisit);
      setSelectedReport(report);
      setUploadState("idle");
    } catch (err) {
      stopAnimator();
      setUploadState("idle");
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const deleteLabReport = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const updated = visit.labReports.filter((r) => r.id !== deleteTarget.id);
      await saveVisitSourceUpdate(visit, { labReports: updated }, updateVisit);
      if (selectedReport?.id === deleteTarget.id) {
        setSelectedReport(updated.length > 0 ? updated[updated.length - 1] : null);
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const overviewData = selectedReport
    ? getChartableBiomarkers(selectedReport).map((b) => ({
        name: getBiomarkerShortName(b, language),
        value: b.value,
        fill:
          b.status === "high"
            ? "#ef4444"
            : b.status === "low"
            ? "#f59e0b"
            : "#22c55e",
      }))
    : [];

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
          uploadState === "processing"
            ? "border-blue-300 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 cursor-pointer hover:bg-blue-50"
        }`}
        onClick={() =>
          uploadState !== "processing" && fileRef.current?.click()
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) analyzeFile(f);
            e.target.value = "";
          }}
        />
        {uploadState === "processing" ? (
          <AnalysisProcessingProgress
            title={tl.processingTitle}
            progressLabel={tl.progress}
            almostDoneLabel={tl.almostDone}
            steps={tl.processingSteps}
            processingStepIndex={processingStepIndex}
            progress={progress}
            isBn={isBn}
            theme="blue"
            compact
          />
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <FlaskConical className="w-7 h-7 text-gray-400" />
            <div className="text-left">
              <p className="font-medium text-gray-700 text-sm">
                {tv.addLabReport}
              </p>
              <p className="text-gray-400 text-xs">{tv.addLabReportDesc}</p>
            </div>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
              <Upload className="w-4 h-4" /> {tl.uploadBtn}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {visit.labReports.length > 0 && (
        <div className="space-y-2">
          {visit.labReports.map((report) => {
            const { high, low, normal } = getLabReportStats(report);
            return (
              <div
                key={report.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedReport(report)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedReport(report);
                }}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedReport?.id === report.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-sm">
                      {getLabReportTypeName(report, language)}
                    </p>
                    <p className="text-gray-500 text-xs">{report.date}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <CheckCircle
                      className={`w-4 h-4 ${
                        selectedReport?.id === report.id ? "text-blue-500" : "text-gray-300"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(report);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label={tl.deleteReport}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {high > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                      {high} {tl.high}
                    </span>
                  )}
                  {low > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                      {low} {tl.low}
                    </span>
                  )}
                  {normal > 0 && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                      {normal} {tl.normal}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedReport && (
        <>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="font-bold text-gray-800 mb-1">
              {getLabReportTypeName(selectedReport, language)}
            </p>
            <p className="text-gray-400 text-xs mb-4">
              {tl.reportDate} {selectedReport.date}
            </p>
            <LabReportExplanation report={selectedReport} language={language} />
          </div>

          {selectedReport.biomarkers.length > 0 && (
            <>
          {overviewData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="font-bold text-gray-800 mb-3">{tl.numericResults}</p>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overviewData}
                  margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "10px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {overviewData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedReport.biomarkers.map((b, idx) => (
              <BiomarkerResultCard key={idx} biomarker={b} report={selectedReport} />
            ))}
          </div>
            </>
          )}
        </>
      )}

      {visit.labReports.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
          <FlaskConical className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">{tl.emptyReports}</p>
        </div>
      )}

      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={deleteLabReport}
        title={tl.deleteConfirm}
        subtitle={
          deleteTarget ? `${deleteTarget.type} • ${deleteTarget.date}` : undefined
        }
        description={tl.deleteDesc}
        cancelLabel={tl.deleteCancel}
        confirmLabel={tl.deleteConfirmBtn}
        loading={deleting}
      />
    </div>
  );
}

// ─── Health Report Tab ────────────────────────────────────────────────────────

function HealthReportTab({ visit }: { visit: Visit }) {
  const { updateVisit, language } = useAppStore();
  const t = getT(language);
  const tv = t.visits;
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showSameDataModal, setShowSameDataModal] = useState(false);

  const canGenerate = visit.prescriptions.length > 0 && visit.labReports.length > 0;
  const mergedPrescription = mergePrescriptions(visit.prescriptions);
  const currentFingerprint = canGenerate ? computeVisitSourceFingerprint(visit) : null;
  const needsRefresh = canGenerate && !visit.healthReport;

  const generateReport = async () => {
    if (!mergedPrescription || !currentFingerprint) return;

    if (
      visit.lastAnalysisFingerprint &&
      currentFingerprint === visit.lastAnalysisFingerprint
    ) {
      setShowSameDataModal(true);
      return;
    }

    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/health-report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescription: mergedPrescription,
          labReports: visit.labReports,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const updates = {
        healthReport: {
          ...data.healthReport,
          sourceFingerprint: currentFingerprint,
        },
        lifestyleDirections: data.lifestyleDirections,
        lastAnalysisFingerprint: currentFingerprint,
      };
      updateVisit(visit.id, updates);
      await patchVisitDB(visit.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setGenerating(false);
    }
  };

  const riskConfig = {
    low: { color: "text-green-700", bg: "bg-green-100", label: tv.riskLow },
    medium: {
      color: "text-amber-700",
      bg: "bg-amber-100",
      label: tv.riskMedium,
    },
    high: { color: "text-red-700", bg: "bg-red-100", label: tv.riskHigh },
  };

  if (visit.healthReport) {
    const hr = visit.healthReport;
    const rc = riskConfig[hr.riskLevel];
    const isBn = language === "bn";
    const hrSummary = isBn ? (hr.summaryBn || hr.summary) : (hr.summaryEn || hr.summary);
    const hrConditions = isBn ? (hr.conditionsBn || hr.conditions) : (hr.conditionsEn || hr.conditions);
    const hrExplanation = isBn ? (hr.prescriptionExplanationBn || hr.prescriptionExplanation) : (hr.prescriptionExplanationEn || hr.prescriptionExplanation);
    const hrFollowUp = isBn ? (hr.followUpNoteBn || hr.followUpNote) : (hr.followUpNoteEn || hr.followUpNote);
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-purple-200 text-sm">{tv.healthScore}</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black">{hr.healthScore}</span>
                <span className="text-purple-300 text-lg mb-1">/100</span>
              </div>
            </div>
            <span
              className={`${rc.bg} ${rc.color} font-bold text-sm px-3 py-1.5 rounded-full`}
            >
              {tv.riskLevel}: {rc.label}
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div
              className="bg-white h-3 rounded-full transition-all"
              style={{ width: `${hr.healthScore}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            {language === "bn" ? "এআই বিশ্লেষণ" : "AI Analysis"}
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">{hrSummary}</p>
        </div>

        {hrConditions.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              {tv.conditions}
            </p>
            <div className="flex flex-wrap gap-2">
              {hrConditions.map((c, i) => (
                <span
                  key={i}
                  className="bg-red-50 text-red-700 text-sm px-3 py-1 rounded-full border border-red-100"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-500" />
            {isBn ? "ওষুধের ব্যাখ্যা" : "Why these medicines?"}
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            {hrExplanation}
          </p>
        </div>

        {hrFollowUp && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-700 text-sm">{tv.followUp}</p>
              <p className="text-blue-600 text-sm">{hrFollowUp}</p>
            </div>
          </div>
        )}

        <p className="text-center text-gray-400 text-xs">
          {tv.generatedByAI} •{" "}
          {new Date(hr.generatedAt).toLocaleDateString()}
        </p>
        <button
          onClick={generateReport}
          disabled={generating}
          className="w-full py-3 rounded-xl border-2 border-purple-200 text-purple-600 text-sm font-medium hover:bg-purple-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {tv.generating}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> {tv.refreshReport}
            </>
          )}
        </button>

        <InfoModal
          open={showSameDataModal}
          onClose={() => setShowSameDataModal(false)}
          title={tv.sameDataTitle}
          description={tv.sameDataDesc}
          buttonLabel={tv.sameDataOk}
          variant="warning"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {needsRefresh && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm mb-1">{tv.analysisOutdatedTitle}</p>
            <p className="text-amber-700 text-xs leading-relaxed">{tv.analysisOutdatedDesc}</p>
          </div>
        </div>
      )}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100 text-center">
        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h3 className="font-bold text-gray-800 text-lg mb-2">
          {tv.generateReport}
        </h3>
        <p className="text-gray-500 text-sm mb-5">{tv.generateReportDesc}</p>

        {!canGenerate && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex gap-2 text-left">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700 text-sm">{tv.needsBoth}</p>
          </div>
        )}

        <button
          onClick={generateReport}
          disabled={!canGenerate || generating}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all mx-auto shadow-sm"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {tv.generating}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> {needsRefresh ? tv.refreshReport : tv.generateReport}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <InfoModal
        open={showSameDataModal}
        onClose={() => setShowSameDataModal(false)}
        title={tv.sameDataTitle}
        description={tv.sameDataDesc}
        buttonLabel={tv.sameDataOk}
        variant="warning"
      />
    </div>
  );
}

// ─── Lifestyle Tab ────────────────────────────────────────────────────────────

// General tips shown when no AI health report exists yet
const GENERAL_TIPS_BN_VISIT = [
  { icon: "🥗", title: "মিষ্টি ও তেলযুক্ত খাবার কমান", desc: "শাকসবজি, ফল ও আঁশযুক্ত খাবার রাখুন।" },
  { icon: "🚶", title: "প্রতিদিন ৩০ মিনিট হাঁটুন", desc: "রক্তের সুগার ও প্রেশার নিয়ন্ত্রণে রাখুন।" },
  { icon: "💧", title: "দিনে ৮-১০ গ্লাস পানি পান করুন", desc: "কিডনি সুরক্ষা ও শরীর হাইড্রেটেড রাখুন।" },
  { icon: "😴", title: "রাতে ৭-৮ ঘণ্টা ঘুমান", desc: "হার্ট ও মানসিক স্বাস্থ্য ভালো রাখুন।" },
];
const GENERAL_TIPS_EN_VISIT = [
  { icon: "🥗", title: "Reduce Sweets & Oily Food", desc: "Include vegetables, fruits, and fiber in your diet." },
  { icon: "🚶", title: "Walk 30 Minutes Daily", desc: "Keep blood sugar and pressure under control." },
  { icon: "💧", title: "Drink 8-10 Glasses of Water", desc: "Protect kidneys and stay hydrated." },
  { icon: "😴", title: "Sleep 7-8 Hours at Night", desc: "Maintain heart health and mental wellbeing." },
];

function LifestyleTab({ visit }: { visit: Visit }) {
  const { language } = useAppStore();
  const t = getT(language);
  const tv = t.visits;
  const isBn = language === "bn";
  const canGenerate = visit.prescriptions.length > 0 && visit.labReports.length > 0;
  const needsRefresh = canGenerate && !visit.lifestyleDirections;

  if (!visit.lifestyleDirections) {
    const generalTips = isBn ? GENERAL_TIPS_BN_VISIT : GENERAL_TIPS_EN_VISIT;
    return (
      <div className="space-y-4">
        {needsRefresh && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 text-sm mb-1">{tv.lifestyleOutdatedTitle}</p>
              <p className="text-amber-700 text-xs leading-relaxed">{tv.lifestyleOutdatedDesc}</p>
            </div>
          </div>
        )}
        {/* Notice banner */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex gap-3">
          <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-700 text-sm mb-0.5">
              {isBn ? "সাধারণ স্বাস্থ্য পরামর্শ" : "General Health Tips"}
            </p>
            <p className="text-blue-600 text-xs leading-relaxed">
              {isBn
                ? "এখনো AI Health Report তৈরি হয়নি। নিচে সাধারণ পরামর্শ দেখাচ্ছি। Health Report ট্যাবে গিয়ে Prescription ও Lab Report দিয়ে ব্যক্তিগত পরামর্শ পান।"
                : "No AI Health Report yet. Showing general tips below. Go to Health Report tab to get personalized advice using your prescription & lab reports."}
            </p>
          </div>
        </div>

        {/* General tips */}
        <div className="space-y-3">
          {generalTips.map((tip, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{tip.icon}</span>
              <div>
                <p className="font-bold text-gray-800 text-sm">{tip.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA to generate */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">
              {isBn ? "ব্যক্তিগত পরামর্শ পেতে চান?" : "Want personalized advice?"}
            </p>
            <p className="text-gray-500 text-xs">
              {isBn
                ? "Health Report ট্যাবে যান → AI Generate করুন"
                : "Go to Health Report tab → Generate with AI"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const ld = visit.lifestyleDirections;
  const ldSleep = isBn ? (ld.sleepBn || ld.sleep) : (ld.sleepEn || ld.sleep);
  const sections = [
    {
      icon: Salad,
      title: tv.dietTitle,
      items: isBn ? (ld.dietBn || ld.diet) : (ld.dietEn || ld.diet),
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    {
      icon: Dumbbell,
      title: tv.exerciseTitle,
      items: isBn ? (ld.exerciseBn || ld.exercise) : (ld.exerciseEn || ld.exercise),
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      icon: Pill,
      title: tv.medicationTitle,
      items: isBn ? (ld.medicationBn || ld.medication) : (ld.medicationEn || ld.medication),
      color: "text-teal-600",
      bg: "bg-teal-50",
      border: "border-teal-100",
    },
    {
      icon: ShieldAlert,
      title: tv.warningsTitle,
      items: isBn ? (ld.warningsBn || ld.warnings) : (ld.warningsEn || ld.warnings),
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
        <div className="flex items-center gap-2 mb-2">
          <BedDouble className="w-4 h-4 text-indigo-600" />
          <p className="font-bold text-indigo-700 text-sm">{tv.sleepTitle}</p>
        </div>
        <p className="text-gray-700 text-sm">{ldSleep}</p>
      </div>

      {sections.map(({ icon: Icon, title, items, color, bg, border }) =>
        items.length > 0 ? (
          <div key={title} className={`${bg} rounded-2xl p-4 border ${border}`}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className={`font-bold text-sm ${color}`}>{title}</p>
            </div>
            <ul className="space-y-1.5">
              {items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${color.replace(
                      "text-",
                      "bg-"
                    )}`}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null
      )}
      <p className="text-center text-gray-400 text-xs">
        {tv.generatedByAI} •{" "}
        {new Date(ld.generatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}

// ─── Progress Report Tab ─────────────────────────────────────────────────────

function ProgressTab({ visit }: { visit: Visit }) {
  const { updateVisit, visits, language } = useAppStore();
  const isBn = language === "bn";
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const pr = visit.progressReport;

  // Find previous visit in the same case
  const rootId = visit.parentVisitId ?? visit.id;
  const allCaseVisits = visits
    .filter((v) => v.id === rootId || v.parentVisitId === rootId)
    .sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());
  const currentIndex = allCaseVisits.findIndex((v) => v.id === visit.id);
  const previousVisit = currentIndex > 0 ? allCaseVisits[currentIndex - 1] : null;

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/visits/${visit.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      updateVisit(visit.id, { progressReport: data });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(false);
    }
  };

  const trendConfig = {
    improving: {
      gradient: "from-green-500 to-emerald-500",
      shadow: "shadow-green-200",
      icon: TrendingUp,
      label: isBn ? "উন্নতি হচ্ছে" : "Improving",
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
    },
    stable: {
      gradient: "from-amber-500 to-orange-400",
      shadow: "shadow-amber-200",
      icon: Clock,
      label: isBn ? "স্থিতিশীল" : "Stable",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
    },
    worsening: {
      gradient: "from-red-500 to-rose-500",
      shadow: "shadow-red-200",
      icon: TrendingDown,
      label: isBn ? "অবনতি হচ্ছে" : "Worsening",
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
    },
  };

  if (!pr) {
    return (
      <div className="space-y-4">
        {!previousVisit ? (
          <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">
            <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600 mb-1">
              {isBn ? "প্রথম ভিজিট" : "Initial Visit"}
            </p>
            <p className="text-gray-400 text-sm">
              {isBn
                ? "এটি প্রথম ভিজিট। ফলো-আপ করার পর এখানে তুলনামূলক রিপোর্ট দেখা যাবে।"
                : "This is the initial visit. Progress comparison will appear after a follow-up."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
              <div className="flex gap-3">
                <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-purple-700 text-sm mb-1">
                    {isBn ? "AI প্রগ্রেস বিশ্লেষণ" : "AI Progress Analysis"}
                  </p>
                  <p className="text-purple-600 text-xs">
                    {isBn
                      ? `আগের ভিজিট (${previousVisit.visitDate}) এর সাথে তুলনা করে AI স্বাস্থ্যের অগ্রগতি বিশ্লেষণ করবে।`
                      : `AI will compare with the previous visit (${previousVisit.visitDate}) to analyze health progress.`}
                  </p>
                </div>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 rounded-xl p-3 border border-red-200 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-70 transition-all shadow-lg shadow-purple-200"
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 animate-spin" />{isBn ? "বিশ্লেষণ চলছে..." : "Analyzing..."}</>
              ) : (
                <><Sparkles className="w-5 h-5" />{isBn ? "AI দিয়ে প্রগ্রেস বিশ্লেষণ করুন" : "Analyze Progress with AI"}</>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  const cfg = trendConfig[pr.overallTrend];
  const TrendIcon = cfg.icon;
  const prSummary = isBn ? (pr.summaryBn || pr.summary) : (pr.summaryEn || pr.summary);
  const prImproved = isBn ? (pr.improvedBn || pr.improved) : (pr.improvedEn || pr.improved);
  const prWorsened = isBn ? (pr.worsenedBn || pr.worsened) : (pr.worsenedEn || pr.worsened);
  const prUnchanged = isBn ? (pr.unchangedBn || pr.unchanged) : (pr.unchangedEn || pr.unchanged);
  const prPrescriptionChanges = isBn ? (pr.prescriptionChangesBn || pr.prescriptionChanges) : (pr.prescriptionChangesEn || pr.prescriptionChanges);
  const prDoctorAdvice = isBn ? (pr.doctorAdviceBn || pr.doctorAdvice) : (pr.doctorAdviceEn || pr.doctorAdvice);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className={`bg-gradient-to-br ${cfg.gradient} rounded-2xl p-5 text-white shadow-lg ${cfg.shadow}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center">
              <TrendIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{cfg.label}</h3>
              <p className="text-white/80 text-xs">
                {isBn ? `আগের ভিজিট (${previousVisit?.visitDate}) এর তুলনায়` : `Compared to previous visit (${previousVisit?.visitDate})`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black">
              {pr.scoreChange >= 0 ? "+" : ""}{pr.scoreChange}
            </div>
            <p className="text-white/70 text-xs">{isBn ? "স্কোর পরিবর্তন" : "Score change"}</p>
          </div>
        </div>
        <div className="bg-white/15 rounded-xl p-3">
          <p className="text-sm leading-relaxed">{prSummary}</p>
        </div>
      </div>

      {/* Improved */}
      {prImproved.length > 0 && (
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="font-bold text-green-700 text-sm">{isBn ? "উন্নতি হয়েছে ✅" : "Improved ✅"}</p>
          </div>
          <ul className="space-y-1.5">
            {prImproved.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Worsened */}
      {prWorsened.length > 0 && (
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <p className="font-bold text-red-700 text-sm">{isBn ? "অবনতি হয়েছে ⚠️" : "Worsened ⚠️"}</p>
          </div>
          <ul className="space-y-1.5">
            {prWorsened.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unchanged */}
      {prUnchanged.length > 0 && (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <p className="font-bold text-gray-600 text-sm">{isBn ? "অপরিবর্তিত" : "Unchanged"}</p>
          </div>
          <ul className="space-y-1.5">
            {prUnchanged.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prescription changes */}
      {prPrescriptionChanges.length > 0 && (
        <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-teal-600" />
            <p className="font-bold text-teal-700 text-sm">{isBn ? "ওষুধের পরিবর্তন" : "Prescription Changes"}</p>
          </div>
          <ul className="space-y-1.5">
            {prPrescriptionChanges.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Doctor advice */}
      {prDoctorAdvice && (
        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-indigo-600" />
            <p className="font-bold text-indigo-700 text-sm">{isBn ? "পরামর্শ" : "Advice"}</p>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">{prDoctorAdvice}</p>
        </div>
      )}

      {/* Regenerate */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full py-3 rounded-2xl border-2 border-purple-200 text-purple-600 text-sm font-medium hover:bg-purple-50 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin" />{isBn ? "আপডেট হচ্ছে..." : "Updating..."}</>
        ) : (
          <><Sparkles className="w-4 h-4" />{isBn ? "পুনরায় বিশ্লেষণ করুন" : "Re-analyze"}</>
        )}
      </button>

      <p className="text-center text-gray-400 text-xs">
        {isBn ? "AI দ্বারা তৈরি •" : "Generated by AI •"} {new Date(pr.generatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}

// ─── Visit Detail ─────────────────────────────────────────────────────────────

type VisitTabId = "prescription" | "labReports" | "healthReport" | "lifestyle" | "progress";

function VisitDetail({
  visit,
  onBack,
  onAddFollowUp,
}: {
  visit: Visit;
  onBack: () => void;
  onAddFollowUp?: (rootVisit: Visit) => void;
}) {
  const { removeVisit, removeRemindersByVisit, visits, language } = useAppStore();
  const t = getT(language);
  const tv = t.visits;
  const isBn = language === "bn";
  const isFollowUp = visit.visitType === "followup";
  const [activeTab, setActiveTab] = useState<VisitTabId>("prescription");
  const [deleting, setDeleting] = useState(false);

  // Find root for "Add follow-up" button
  const rootVisit = isFollowUp
    ? visits.find((v) => v.id === visit.parentVisitId) ?? visit
    : visit;

  const tabConfig: {
    id: VisitTabId;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[] = [
    {
      id: "prescription",
      label: tv.prescription,
      icon: FileText,
      badge: visit.prescriptions.length > 0 ? "✓" : undefined,
    },
    {
      id: "labReports",
      label: tv.labReports,
      icon: FlaskConical,
      badge:
        visit.labReports.length > 0
          ? String(visit.labReports.length)
          : undefined,
    },
    {
      id: "healthReport",
      label: tv.healthReport,
      icon: Sparkles,
      badge: visit.healthReport ? "✓" : undefined,
    },
    {
      id: "lifestyle",
      label: tv.lifestyle,
      icon: Heart,
      badge: visit.lifestyleDirections ? "✓" : undefined,
    },
    ...(isFollowUp ? [{
      id: "progress" as VisitTabId,
      label: isBn ? "অগ্রগতি" : "Progress",
      icon: TrendingUp,
      badge: visit.progressReport ? (visit.progressReport.overallTrend === "improving" ? "↑" : visit.progressReport.overallTrend === "worsening" ? "↓" : "→") : undefined,
    }] : []),
  ];

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    setShowDeleteModal(false);
    try {
      // Delete associated reminders from DB first
      await fetch(`/api/reminders?visitId=${visit.id}`, { method: "DELETE" });
    } catch {/* ignore */}
    try {
      await fetch(`/api/visits/${visit.id}`, { method: "DELETE" });
    } catch {/* ignore */}
    removeRemindersByVisit(visit.id);
    removeVisit(visit.id);
    onBack();
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-teal-200 hover:text-white text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {tv.backToVisits}
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
            className="text-teal-300 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isFollowUp ? "bg-purple-400/30" : "bg-white/20"}`}>
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{visit.doctorName}</h2>
                {isFollowUp && (
                  <span className="bg-purple-400/40 text-purple-100 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-300/50">
                    {isBn ? "ফলো-আপ" : "Follow-up"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-teal-200 text-xs mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {visit.visitDate}
                </span>
                {visit.clinicName && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {visit.clinicName}
                  </span>
                )}
              </div>
            </div>
          </div>
          {!isFollowUp && onAddFollowUp && (
            <button
              onClick={() => onAddFollowUp(rootVisit)}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {isBn ? "ফলো-আপ" : "Follow-up"}
            </button>
          )}
        </div>
        {visit.chiefComplaint && (
          <div className="mt-3 bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-teal-300" />
            <p className="text-sm text-teal-100">{visit.chiefComplaint}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1 shadow-sm">
        {tabConfig.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-medium transition-all relative ${
              activeTab === id
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="leading-none text-[10px] sm:text-xs">
              {label.split(" ")[0]}
            </span>
            {badge && (
              <span
                className={`absolute -top-1 -right-1 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ${
                  activeTab === id
                    ? "bg-white text-teal-700"
                    : "bg-teal-500 text-white"
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "prescription" && <PrescriptionTab visit={visit} />}
      {activeTab === "labReports" && <LabReportsTab visit={visit} />}
      {activeTab === "healthReport" && <HealthReportTab visit={visit} />}
      {activeTab === "lifestyle" && <LifestyleTab visit={visit} />}
      {activeTab === "progress" && <ProgressTab visit={visit} />}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {tv.deleteConfirm}
              </h3>
              <p className="text-sm text-gray-500 mb-1 font-medium">
                {visit.doctorName}
              </p>
              <p className="text-xs text-gray-400 mb-5">
                {tv.deleteDesc}
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  {tv.deleteCancel}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {tv.deleteConfirmBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main VisitManager ────────────────────────────────────────────────────────

export default function VisitManager() {
  const {
    visits,
    addVisit,
    activeVisitId,
    setActiveVisitId,
    language,
  } = useAppStore();
  const t = getT(language);
  const tv = t.visits;
  const isBn = language === "bn";
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  // Only show spinner on first load (no cached visits yet)
  const [loadingVisits, setLoadingVisits] = useState(visits.length === 0);
  const [followUpRoot, setFollowUpRoot] = useState<Visit | null>(null);

  useEffect(() => {
    if (visits.length > 0) setLoadingVisits(false);
  }, [visits.length]);

  useEffect(() => {
    const id = setTimeout(() => setLoadingVisits(false), 6000);
    return () => clearTimeout(id);
  }, []);

  const handleCreateVisit = async (formData: CreateVisitData) => {
    setCreating(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to create visit");
      const dbVisit = await res.json();
      const visit = dbToVisit(dbVisit);
      addVisit(visit);
      setShowCreate(false);
      setActiveVisitId(visit.id);
    } catch {/* ignore */} finally {
      setCreating(false);
    }
  };

  const handleCreateFollowUp = async (data: { visitDate: string; chiefComplaint?: string }) => {
    if (!followUpRoot) return;
    setCreating(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorName: followUpRoot.doctorName,
          clinicName: followUpRoot.clinicName,
          visitDate: data.visitDate,
          chiefComplaint: data.chiefComplaint,
          visitType: "followup",
          parentVisitId: followUpRoot.id,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const dbVisit = await res.json();
      const visit = dbToVisit(dbVisit);
      addVisit(visit);
      setFollowUpRoot(null);
      setActiveVisitId(visit.id);
    } catch {/* ignore */} finally {
      setCreating(false);
    }
  };

  const activeVisit = visits.find((v) => v.id === activeVisitId) ?? null;
  const cases = groupVisitsIntoCases(visits);
  const totalFollowUps = visits.filter((v) => v.visitType === "followup").length;
  const improvingCount = visits.filter((v) => v.progressReport?.overallTrend === "improving").length;

  if (followUpRoot) {
    return (
      <div className="pb-24 lg:pb-8">
        <FollowUpForm
          rootVisit={followUpRoot}
          onCreated={handleCreateFollowUp}
          onCancel={() => setFollowUpRoot(null)}
          creating={creating}
        />
      </div>
    );
  }

  if (activeVisit) {
    return (
      <div className="pb-24 lg:pb-8">
        <VisitDetail
          visit={activeVisit}
          onBack={() => setActiveVisitId(null)}
          onAddFollowUp={(rootVisit) => {
            setActiveVisitId(null);
            setFollowUpRoot(rootVisit);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg shadow-teal-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{tv.title}</h2>
              <p className="text-teal-100 text-sm">{tv.subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-white text-teal-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-teal-50 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {tv.newVisit}
          </button>
        </div>

        {visits.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
              <p className="text-white font-black text-2xl">{cases.length}</p>
              <p className="text-teal-100 text-xs mt-0.5">{isBn ? "ডাক্তার কেস" : "Doctor Cases"}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
              <p className="text-white font-black text-2xl">{totalFollowUps}</p>
              <p className="text-teal-100 text-xs mt-0.5">{isBn ? "ফলো-আপ" : "Follow-ups"}</p>
            </div>
            <div className="bg-emerald-400/30 backdrop-blur-sm rounded-xl p-3 text-center border border-emerald-300/30">
              <p className="text-white font-black text-2xl">{improvingCount}</p>
              <p className="text-emerald-100 text-xs mt-0.5">{isBn ? "উন্নতি" : "Improving"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Form */}
      {showCreate && (
        <CreateVisitForm
          onCreated={handleCreateVisit}
          onCancel={() => setShowCreate(false)}
          creating={creating}
        />
      )}

      {/* Loading */}
      {loadingVisits && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      )}

      {/* Cases List */}
      {!loadingVisits && visits.length === 0 && !showCreate ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-8 h-8 text-teal-300" />
          </div>
          <h3 className="font-bold text-gray-700 mb-2">{tv.emptyTitle}</h3>
          <p className="text-gray-400 text-sm mb-5 max-w-xs mx-auto">{tv.emptyDesc}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-teal-700 transition-colors mx-auto"
          >
            <Plus className="w-4 h-4" />
            {tv.startVisit}
          </button>
        </div>
      ) : (
        !loadingVisits && (
          <div className="space-y-4">
            {cases.map(({ root, followUps }) => (
              <DoctorCaseCard
                key={root.id}
                root={root}
                followUps={followUps}
                onClick={(visit) => setActiveVisitId(visit.id)}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
