"use client";

import { Info, X } from "lucide-react";

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  buttonLabel: string;
  variant?: "info" | "warning";
}

export default function InfoModal({
  open,
  onClose,
  title,
  description,
  buttonLabel,
  variant = "info",
}: InfoModalProps) {
  if (!open) return null;

  const iconBg = variant === "warning" ? "bg-amber-100" : "bg-blue-100";
  const iconColor = variant === "warning" ? "text-amber-600" : "text-blue-600";
  const topBar =
    variant === "warning"
      ? "bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400"
      : "bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
        <div className={`h-1.5 ${topBar}`} />
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex flex-col items-center text-center">
            <div className={`w-14 h-14 ${iconBg} rounded-full flex items-center justify-center mb-4`}>
              <Info className={`w-7 h-7 ${iconColor}`} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 pr-6">{title}</h3>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">{description}</p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
