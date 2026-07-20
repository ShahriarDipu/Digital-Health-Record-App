"use client";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import { Bell, Clock, X, CheckCircle, Sparkles, Loader2 } from "lucide-react";
import { getT } from "@/lib/translations";

export default function ReminderModal() {
  const { reminderModal, closeReminderModal, addReminder, language } = useAppStore();
  const tr = getT(language).reminders;
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!reminderModal.open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineName: reminderModal.medicineName,
          times: reminderModal.suggestedTimes,
          active: true,
          doctorName: reminderModal.doctorName,
          visitId: reminderModal.visitId,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        addReminder({
          id: saved.id,
          medicineName: saved.medicineName,
          times: saved.times as string[],
          active: saved.active,
          createdAt: new Date(saved.createdAt).toLocaleDateString("bn-BD"),
          doctorName: saved.doctorName ?? undefined,
          visitId: saved.visitId ?? undefined,
        });
      }
    } catch {
      // Fallback: add locally
      addReminder({
        id: `rem-${Date.now()}`,
        medicineName: reminderModal.medicineName,
        times: reminderModal.suggestedTimes,
        active: true,
        createdAt: new Date().toLocaleDateString("bn-BD"),
        doctorName: reminderModal.doctorName,
        visitId: reminderModal.visitId,
      });
    } finally {
      setLoading(false);
    }
    setConfirmed(true);
  };

  const handleViewReminders = () => {
    router.push("/reminders");
    closeReminderModal();
    setConfirmed(false);
  };

  const handleClose = () => {
    closeReminderModal();
    setConfirmed(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm mx-4 mb-0 sm:mb-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Gradient Top Bar */}
        <div className="h-1.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400" />

        {confirmed ? (
          /* Success State */
          <div className="p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-green-200 ring-offset-2 animate-bounce-once">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">{tr.successTitle}</h3>
            <p className="text-gray-600 text-sm mb-2">
              <span className="font-bold text-teal-600">{reminderModal.medicineName}</span>{" "}
              {tr.successMsg}
            </p>
            <div className="flex justify-center gap-2 flex-wrap mb-6">
              {reminderModal.suggestedTimes.map((time) => (
                <span key={time} className="flex items-center gap-1.5 bg-teal-50 text-teal-700 text-sm font-medium px-3 py-1.5 rounded-full border border-teal-200">
                  <Clock className="w-3.5 h-3.5" />
                  {time}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleViewReminders}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold shadow-lg hover:shadow-xl transition-all"
              >
                {tr.successView}
              </button>
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-2xl text-gray-500 text-sm"
              >
                {tr.successClose}
              </button>
            </div>
          </div>
        ) : (
          /* Prompt State */
          <div className="p-6">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Bell className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-black text-gray-800 text-center mb-2">
              {tr.modalTitle}
            </h3>

            {/* Message */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-5 text-center">
              <p className="text-gray-700 text-sm leading-relaxed">
                {tr.modalMsgPre}{" "}
                <span className="font-black text-teal-700">{reminderModal.medicineName}</span>
                {" "}{tr.modalMsgFor}{" "}
                {reminderModal.suggestedTimes.map((t, i) => (
                  <span key={t}>
                    <span className="font-bold text-teal-600">{t}</span>
                    {i < reminderModal.suggestedTimes.length - 1 ? ` ${tr.modalMsgAnd} ` : ""}
                  </span>
                ))}
                {" "}{tr.modalMsgPost}
              </p>
            </div>

            {/* Time Pills */}
            <div className="flex justify-center gap-2 flex-wrap mb-5">
              {reminderModal.suggestedTimes.map((time) => (
                <span key={time} className="flex items-center gap-1.5 bg-white border-2 border-teal-300 text-teal-700 text-sm font-bold px-4 py-2 rounded-full shadow-sm">
                  <Clock className="w-4 h-4" />
                  {time}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-black text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-80 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{tr.modalConfirmLoading}</span>
                  </>
                ) : (
                  tr.modalConfirm
                )}
              </button>
              <button
                onClick={handleClose}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {tr.modalCancel}
              </button>
            </div>

            <p className="text-center text-gray-400 text-xs mt-3">
              {tr.modalFooter}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
