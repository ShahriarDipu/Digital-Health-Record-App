"use client";
import { useState, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { SCHEDULE_MAP } from "@/lib/scheduleMap";
import type { Prescription } from "@/store/useAppStore";
import {
  Upload,
  CheckCircle,
  Pill,
  Clock,
  Info,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { getT } from "@/lib/translations";
import WhySaveUploadModal from "@/components/WhySaveUploadModal";
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

const medicineColors = [
  "border-l-teal-500",
  "border-l-blue-500",
  "border-l-purple-500",
  "border-l-orange-500",
];

export default function PrescriptionDecoder() {
  const {
    openReminderModal,
    addPrescription,
    currentPrescription,
    setCurrentPrescription,
    language,
    visits,
    addVisit,
    updateVisit,
  } = useAppStore();
  const isBn = language === "bn";
  const t = getT(language);
  const tp = t.prescription;
  const [uploadState, setUploadState] = useState<"idle" | "processing" | "done">("idle");
  const [processingStepIndex, setProcessingStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [expandedMed, setExpandedMed] = useState<number | null>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [showWhySave, setShowWhySave] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingScanTargetRef = useRef<WhySaveScanTarget | null>(null);
  const pendingFileRef = useRef<File | null>(null);
  const suppressWhySaveUntilRef = useRef(0);

  const analyzeFile = async (
    file: File,
    scanTarget?: WhySaveScanTarget | null
  ) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError(language === "bn" ? "JPG, PNG বা PDF আপলোড করুন" : "Please upload JPG, PNG, or PDF");
      pendingScanTargetRef.current = null;
      pendingFileRef.current = null;
      return;
    }

    setError("");
    setUploadState("processing");
    setProcessingStepIndex(0);
    setProgress(0);

    // Animate steps while API call runs
    const totalSteps = tp.processingSteps.length;
    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      stepIdx++;
      if (stepIdx < totalSteps - 1) {
        setProcessingStepIndex(stepIdx);
        setProgress(Math.round((stepIdx / (totalSteps - 1)) * 85));
      }
    }, 1200);

    try {
      const willSaveToVisit = Boolean(scanTarget);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", language);
      formData.append("source", "main_tab");
      if (willSaveToVisit) formData.append("savedToVisit", "true");

      const res = await fetch("/api/prescription/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      clearInterval(stepInterval);

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      const prescription: Prescription = data.prescription;

      setProcessingStepIndex(totalSteps - 1);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 400));

      setCurrentPrescription(prescription);
      addPrescription(prescription);
      setUploadState("done");

      // Visit / follow-up created only after successful scan
      if (scanTarget) {
        try {
          const visitId = await resolveVisitIdFromScanTarget(
            scanTarget,
            addVisit
          );
          // Pin session as soon as visit exists (even if PATCH retries later)
          lockWhySaveSessionToVisit("prescription", visitId);
          const visit =
            useAppStore.getState().visits.find((v) => v.id === visitId) ??
            visits.find((v) => v.id === visitId);
          const nextRx = [...(visit?.prescriptions ?? []), prescription];
          updateVisit(visitId, { prescriptions: nextRx });
          await patchVisitAfterScan(visitId, {
            prescription: nextRx,
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
      clearInterval(stepInterval);
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
    const session = getWhySaveSession("prescription");
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
      "prescription",
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const session = getWhySaveSession("prescription");
    if (session) {
      void analyzeFile(file, scanTargetFromSession(session));
      return;
    }
    pendingFileRef.current = file;
    startUpload();
  };

  const handleReminderPrompt = (medicineName: string, schedule: string) => {
    const scheduleInfo = SCHEDULE_MAP[schedule];
    if (scheduleInfo) {
      openReminderModal(medicineName, scheduleInfo.times, prescription?.doctorName);
    }
  };

  const prescription = currentPrescription;

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{tp.title}</h2>
            <p className="text-teal-200 text-sm">{tp.subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {tp.tags.map((tag) => (
            <span key={tag} className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void analyzeFile(file, pendingScanTargetRef.current);
              e.target.value = "";
            }}
          />

      {/* Upload Zone — stay available after done so multi-page scans reuse session */}
      {uploadState !== "processing" && (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-teal-500 bg-teal-50 scale-105"
              : "border-gray-300 bg-white hover:border-teal-400 hover:bg-teal-50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={startUpload}
        >
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="text-gray-800 font-bold text-lg mb-2">{tp.uploadTitle}</h3>
          <p className="text-gray-500 text-sm mb-4">{tp.uploadDesc}</p>
          <button
            className="flex items-center justify-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-teal-700 transition-colors mx-auto"
            onClick={(e) => { e.stopPropagation(); startUpload(); }}
          >
            <Upload className="w-4 h-4" />
            {tp.uploadBtn}
          </button>
          <p className="text-xs text-gray-400 mt-3">{tp.fileTypes}</p>
        </div>
      )}

      {/* Processing State */}
      {uploadState === "processing" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{tp.processingTitle}</h3>
              <p className="text-gray-500 text-sm">{tp.processingSteps[processingStepIndex]}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">{tp.progress}</span>
              <span className="text-teal-600 font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-teal-500 to-cyan-500 h-3 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {tp.processingSteps.map((step, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  idx < processingStepIndex
                    ? "bg-green-50"
                    : idx === processingStepIndex
                    ? "bg-violet-50 animate-pulse"
                    : "bg-gray-50 opacity-50"
                }`}
              >
                {idx < processingStepIndex ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : idx === processingStepIndex ? (
                  <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    idx <= processingStepIndex ? "text-gray-800 font-medium" : "text-gray-400"
                  }`}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium text-sm">{tp.errorTitle}</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Decoded Prescription Results */}
      {uploadState === "done" && prescription && (
        <div className="space-y-4">
          {/* Doctor Info Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-700 font-bold text-sm">{tp.successLabel}</span>
                </div>
                <h3 className="font-bold text-gray-800 text-lg">{prescription.doctorName}</h3>
                <p className="text-gray-500 text-sm">{tp.dateLabel} {prescription.date}</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-teal-600">{prescription.medicines.length}</p>
                <p className="text-teal-600 text-xs">{tp.medicineCount}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{tp.patientLabel}</span> {prescription.patientName}
              </p>
            </div>
          </div>

          {/* Medicine Cards */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-600" />
              {tp.medicinesTitle}
            </h3>
            <div className="space-y-3">
              {prescription.medicines.map((med, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${medicineColors[idx % medicineColors.length]} overflow-hidden`}
                >
                  <button
                    className="w-full p-4 flex items-start justify-between gap-3"
                    onClick={() => setExpandedMed(expandedMed === idx ? null : idx)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Pill className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-gray-800">{med.name}</h4>
                        <p className="text-gray-500 text-xs">{med.dose} • {med.schedule}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-teal-50 text-teal-700 text-xs font-medium px-2.5 py-1 rounded-full">
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
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-blue-50 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Info className="w-4 h-4 text-blue-500" />
                            <span className="text-blue-700 text-xs font-bold">{tp.purposeLabel}</span>
                          </div>
                          <p className="text-gray-700 text-sm">
                            {isBn ? (med.purposeBn || med.purpose) : (med.purposeEn || med.purpose)}
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-4 h-4 text-green-500" />
                            <span className="text-green-700 text-xs font-bold">{tp.reasonLabel}</span>
                          </div>
                          <p className="text-gray-700 text-sm">
                            {tp.reasonPrefix}{" "}
                            {(isBn ? (med.purposeBn || med.purpose) : (med.purposeEn || med.purpose)).toLowerCase()}{" "}
                            {tp.reasonSuffix}
                          </p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="text-amber-700 text-xs font-bold">{tp.instructionLabel}</span>
                          </div>
                          <p className="text-gray-700 text-sm">
                            {isBn ? (med.instructionsBn || med.instructions) : (med.instructionsEn || med.instructions)}
                          </p>
                        </div>
                      </div>

                      {SCHEDULE_MAP[med.schedule] && (
                        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-gray-800 mb-1">
                                {tp.reminderQuestion}
                              </p>
                              <p className="text-xs text-gray-600">
                                {med.name} {tp.reminderFor}{" "}
                                {SCHEDULE_MAP[med.schedule].times.join(", ")} {tp.reminderAlertSuffix}
                              </p>
                            </div>
                            <button
                              onClick={() => handleReminderPrompt(med.name, med.schedule)}
                              className="flex-shrink-0 bg-teal-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-teal-700 transition-colors whitespace-nowrap"
                            >
                              {tp.setReminder}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => {
              setUploadState("idle");
              setCurrentPrescription(null);
              setExpandedMed(0);
              setError("");
            }}
            className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:border-teal-300 hover:text-teal-600 transition-colors text-sm"
          >
            {tp.uploadNew}
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-blue-700 text-sm">
          <span className="font-bold">{tp.infoTitle}</span> {tp.infoDesc}
        </p>
      </div>

      <WhySaveUploadModal
        open={showWhySave}
        source="prescription"
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
