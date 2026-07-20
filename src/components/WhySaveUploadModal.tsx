"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";
import {
  saveIntentReasonsForSource,
  type SaveIntentReason,
  type SaveIntentSource,
} from "@/lib/saveIntent";
import {
  planWhySaveScan,
  visitForExistingTarget,
  type WhySaveScanTarget,
} from "@/lib/whySaveScan";
import {
  Check,
  ChevronLeft,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";

type Step = "ask" | "createVisit" | "pickFile";

interface WhySaveUploadModalProps {
  open: boolean;
  source: SaveIntentSource;
  onClose: () => void;
  /** Skip health record — proceed to file picker / analyze */
  onSkip: () => void;
  /**
   * Ready to open file picker. Visit is NOT created here for new records —
   * parent creates only after a successful scan.
   */
  onProceedToScan: (target: WhySaveScanTarget) => void;
}

async function postSaveIntentFeedback(payload: {
  reasons: SaveIntentReason[];
  choseHealthRecord: boolean;
  source: SaveIntentSource;
}) {
  try {
    await fetch("/api/feedback/save-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // non-blocking
  }
}

export default function WhySaveUploadModal({
  open,
  source,
  onClose,
  onSkip,
  onProceedToScan,
}: WhySaveUploadModalProps) {
  const { language, visits } = useAppStore();
  const t = getT(language);
  const tw = t.whySave;
  const tv = t.visits;
  const isBn = language === "bn";

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("ask");
  const [selected, setSelected] = useState<SaveIntentReason[]>([]);
  const [scanTarget, setScanTarget] = useState<WhySaveScanTarget | null>(null);
  const [showDoctorSuggestions, setShowDoctorSuggestions] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [doctorName, setDoctorName] = useState("");
  const [visitDate, setVisitDate] = useState(today);
  const doctorInputRef = useRef<HTMLInputElement>(null);

  const knownDoctorNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const visit of visits) {
      const trimmed = visit.doctorName.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!names.has(key)) names.set(key, trimmed);
    }
    return Array.from(names.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [visits]);

  const doctorSuggestions = useMemo(() => {
    const q = doctorName.trim().toLowerCase();
    if (!q) return knownDoctorNames.slice(0, 6);
    return knownDoctorNames
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [doctorName, knownDoctorNames]);

  const plannedTarget = useMemo(
    () =>
      doctorName.trim()
        ? planWhySaveScan(visits, doctorName, visitDate)
        : null,
    [visits, doctorName, visitDate]
  );

  const matchedExistingVisit =
    plannedTarget?.mode === "existing"
      ? visitForExistingTarget(visits, plannedTarget)
      : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep("ask");
    setSelected([]);
    setScanTarget(null);
    setShowDoctorSuggestions(false);
    setDoctorName("");
    setVisitDate(today);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted || !open) return null;

  const toggleReason = (reason: SaveIntentReason) => {
    setSelected((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const hasSelection = selected.length > 0;

  /** Must stay sync so the browser allows file picker from the same user gesture. */
  const handleSkip = () => {
    if (!hasSelection) return;
    void postSaveIntentFeedback({
      reasons: selected,
      choseHealthRecord: false,
      source,
    });
    onSkip();
  };

  const handleCreateHealthRecord = () => {
    if (!hasSelection) return;
    void postSaveIntentFeedback({
      reasons: selected,
      choseHealthRecord: true,
      source,
    });
    setStep("createVisit");
  };

  const handlePickDoctorSuggestion = (name: string) => {
    setDoctorName(name);
    setShowDoctorSuggestions(false);
    doctorInputRef.current?.focus();
  };

  const goToPickFile = (target: WhySaveScanTarget) => {
    setScanTarget(target);
    setStep("pickFile");
  };

  /** Does not create a visit yet — only after the user actually scans a file. */
  const handleCreateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim()) return;
    setShowDoctorSuggestions(false);
    goToPickFile(planWhySaveScan(visits, doctorName, visitDate));
  };

  /** Fresh click — required for OS file/camera picker user-gesture. */
  const handleStartScan = () => {
    if (!scanTarget) return;
    onProceedToScan(scanTarget);
  };

  const pickFileTitle =
    scanTarget?.mode === "existing"
      ? tw.pickFileTitleExisting
      : scanTarget?.mode === "followup"
        ? tw.pickFileTitleFollowup
        : tw.pickFileTitle;

  const pickFileHint =
    scanTarget?.mode === "existing"
      ? tw.pickFileHintExisting
      : scanTarget?.mode === "followup"
        ? tw.pickFileHintFollowup
        : tw.pickFileHint;

  const submitBtnLabel =
    plannedTarget?.mode === "existing"
      ? tw.scanExistingBtn
      : plannedTarget?.mode === "followup"
        ? tw.scanFollowupBtn
        : tw.createAndScanBtn;

  const reasonLabels: Record<SaveIntentReason, string> = {
    compare: tw.reasonCompare,
    show_doctor: tw.reasonShowDoctor,
    never_search: tw.reasonNeverSearch,
    other: tw.reasonOther,
  };

  const askTitle =
    source === "prescription" ? tw.titlePrescription : tw.title;
  const visibleReasons = saveIntentReasonsForSource(source);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[min(92dvh,720px)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 flex-shrink-0" />

        {step === "pickFile" ? (
          <div className="p-5 sm:p-6 text-center">
            <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7 text-teal-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1.5">
              {pickFileTitle}
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              {pickFileHint}
            </p>
            <button
              type="button"
              onClick={handleStartScan}
              className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {tw.pickFileBtn}
            </button>
          </div>
        ) : (
          <div className="relative overflow-hidden flex-1 min-h-0">
            <div
              className="flex transition-transform duration-300 ease-out h-full"
              style={{
                transform: step === "ask" ? "translateX(0%)" : "translateX(-100%)",
              }}
            >
              {/* Step: Ask */}
              <div className="w-full flex-shrink-0 flex flex-col min-h-0 overflow-y-auto">
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-snug">
                        {askTitle}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                        {tw.subtitle}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 flex-shrink-0"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-2.5 mb-6">
                    {visibleReasons.map((reason) => {
                      const active = selected.includes(reason);
                      return (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => toggleReason(reason)}
                          className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${
                            active
                              ? "border-teal-500 bg-teal-50"
                              : "border-gray-200 bg-white hover:border-teal-300"
                          }`}
                        >
                          <span
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                              active
                                ? "bg-teal-600 border-teal-600 text-white"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {active && <Check className="w-3.5 h-3.5" />}
                          </span>
                          <span className="text-sm text-gray-800 leading-snug">
                            {reasonLabels[reason]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {!hasSelection && (
                    <p className="text-xs text-amber-600 mb-3">{tw.selectRequired}</p>
                  )}

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={handleCreateHealthRecord}
                      disabled={!hasSelection}
                      className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Stethoscope className="w-4 h-4" />
                      {tw.createHealthRecord}
                    </button>
                    <button
                      type="button"
                      onClick={handleSkip}
                      disabled={!hasSelection}
                      className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {tw.skipBenefits}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step: Create / reuse visit */}
              <div className="w-full flex-shrink-0 flex flex-col min-h-0 overflow-y-auto">
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-5 text-white">
                  <button
                    type="button"
                    onClick={() => setStep("ask")}
                    className="inline-flex items-center gap-1 text-teal-100 text-sm mb-3 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {isBn ? "পিছনে" : "Back"}
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{tv.createTitle}</h3>
                      <p className="text-teal-200 text-sm leading-snug">
                        {tw.createVisitSubtitle}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreateVisit} className="p-5 space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {tv.doctorName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={doctorInputRef}
                      type="text"
                      value={doctorName}
                      onChange={(e) => {
                        setDoctorName(e.target.value);
                        setShowDoctorSuggestions(true);
                      }}
                      onFocus={() => setShowDoctorSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowDoctorSuggestions(false), 150);
                      }}
                      placeholder={tv.doctorNamePlaceholder}
                      autoComplete="off"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      required
                    />
                    {showDoctorSuggestions && doctorSuggestions.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                        <p className="px-3 py-1.5 text-[11px] font-medium text-gray-400 bg-gray-50 border-b border-gray-100">
                          {tw.doctorMatchHint}
                        </p>
                        {doctorSuggestions.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handlePickDoctorSuggestion(name)}
                            className="w-full text-left px-3 py-2.5 text-sm text-gray-800 hover:bg-teal-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
                          >
                            <Stethoscope className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                            <span className="truncate">{name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {plannedTarget?.mode === "existing" &&
                      matchedExistingVisit &&
                      !showDoctorSuggestions && (
                      <p className="mt-1.5 text-xs text-teal-700">
                        {tw.matchSameDate}
                        {`: ${matchedExistingVisit.doctorName} (${matchedExistingVisit.visitDate})`}
                      </p>
                    )}
                    {plannedTarget?.mode === "followup" && !showDoctorSuggestions && (
                      <p className="mt-1.5 text-xs text-amber-700">
                        {tw.matchFollowup}
                        {`: ${plannedTarget.doctorName} → ${plannedTarget.visitDate}`}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {tv.visitDate} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => {
                        setVisitDate(e.target.value);
                      }}
                      max={today}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      required
                    />
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">{tw.afterCreateHint}</p>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep("ask")}
                      className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:border-gray-300 transition-colors text-sm"
                    >
                      {tv.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={!doctorName.trim()}
                      className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      {submitBtnLabel}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
