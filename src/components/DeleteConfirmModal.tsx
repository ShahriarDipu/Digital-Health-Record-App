"use client";

import { Loader2, Trash2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  description?: string;
  cancelLabel: string;
  confirmLabel: string;
  loading?: boolean;
}

export default function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  subtitle,
  description,
  cancelLabel,
  confirmLabel,
  loading = false,
}: DeleteConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
        <div className="h-1.5 bg-gradient-to-r from-red-400 via-rose-400 to-orange-400" />
        <div className="p-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
            aria-label={cancelLabel}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-red-50">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 pr-6">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-600 mb-1 font-medium">{subtitle}</p>
            )}
            {description && (
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">{description}</p>
            )}
            {!description && <div className="mb-3" />}

            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
