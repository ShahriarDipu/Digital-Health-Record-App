"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import { estimateSecondsRemaining, formatSecondsRemaining } from "@/lib/analysisProgress";

type Theme = "teal" | "blue" | "violet";

const themeStyles: Record<
  Theme,
  { iconBg: string; iconColor: string; activeBg: string; progressFrom: string; progressTo: string }
> = {
  teal: {
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    activeBg: "bg-teal-50",
    progressFrom: "from-teal-500",
    progressTo: "to-cyan-500",
  },
  blue: {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    activeBg: "bg-blue-50",
    progressFrom: "from-blue-500",
    progressTo: "to-cyan-500",
  },
  violet: {
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    activeBg: "bg-violet-50",
    progressFrom: "from-violet-500",
    progressTo: "to-purple-500",
  },
};

interface AnalysisProcessingProgressProps {
  title: string;
  progressLabel: string;
  almostDoneLabel: string;
  steps: string[];
  processingStepIndex: number;
  progress: number;
  isBn: boolean;
  theme?: Theme;
  compact?: boolean;
}

export default function AnalysisProcessingProgress({
  title,
  progressLabel,
  almostDoneLabel,
  steps,
  processingStepIndex,
  progress,
  isBn,
  theme = "teal",
  compact = false,
}: AnalysisProcessingProgressProps) {
  const styles = themeStyles[theme];
  const secondsLeft = estimateSecondsRemaining(processingStepIndex, steps.length);
  const timeLabel =
    secondsLeft !== null ? formatSecondsRemaining(secondsLeft, isBn) : almostDoneLabel;

  if (compact) {
    return (
      <div className="space-y-3 text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className={`w-5 h-5 ${styles.iconColor} animate-spin flex-shrink-0`} />
            <p className={`font-medium text-sm ${styles.iconColor}`}>{title}</p>
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">{timeLabel}</span>
        </div>
        <p className="text-gray-600 text-xs">{steps[processingStepIndex]}</p>
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500">{progressLabel}</span>
            <span className={`${styles.iconColor} font-bold`}>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`bg-gradient-to-r ${styles.progressFrom} ${styles.progressTo} h-2 rounded-full transition-all duration-700`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                idx < processingStepIndex
                  ? "bg-green-50"
                  : idx === processingStepIndex
                  ? `${styles.activeBg} animate-pulse`
                  : "bg-gray-50 opacity-50"
              }`}
            >
              {idx < processingStepIndex ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : idx === processingStepIndex ? (
                <Loader2 className={`w-3.5 h-3.5 ${styles.iconColor} animate-spin flex-shrink-0`} />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
              )}
              <span className={idx <= processingStepIndex ? "text-gray-800 font-medium" : "text-gray-400"}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 ${styles.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Loader2 className={`w-5 h-5 ${styles.iconColor} animate-spin`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-800">{title}</h3>
            <p className="text-gray-500 text-sm truncate">{steps[processingStepIndex]}</p>
          </div>
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full flex-shrink-0">
          {timeLabel}
        </span>
      </div>

      <div className="mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">{progressLabel}</span>
          <span className={`${styles.iconColor} font-bold`}>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`bg-gradient-to-r ${styles.progressFrom} ${styles.progressTo} h-3 rounded-full transition-all duration-700`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              idx < processingStepIndex
                ? "bg-green-50"
                : idx === processingStepIndex
                ? `${styles.activeBg} animate-pulse`
                : "bg-gray-50 opacity-50"
            }`}
          >
            {idx < processingStepIndex ? (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : idx === processingStepIndex ? (
              <Loader2 className={`w-4 h-4 ${styles.iconColor} animate-spin flex-shrink-0`} />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
            )}
            <span className={`text-sm ${idx <= processingStepIndex ? "text-gray-800 font-medium" : "text-gray-400"}`}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
