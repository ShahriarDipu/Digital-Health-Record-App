"use client";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { Reminder } from "@/store/useAppStore";
import {
  Bell,
  BellOff,
  Clock,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Pill,
  AlarmClock,
  Stethoscope,
  CheckCircle2,
  BellRing,
  Pencil,
} from "lucide-react";
import { getT } from "@/lib/translations";
import {
  defaultTimeParts,
  formatReminderTime,
  getMinutesFromMidnight,
  sortReminderTimes,
} from "@/lib/reminderTime";
import { requestNotificationPermission, showTestNotification } from "@/lib/reminderNotifications";
import TimeWheelPicker from "@/components/TimeWheelPicker";

const NOTIFY_OPTIONS = [0, 5, 10, 15];

export default function ReminderSystem() {
  const { reminders, addReminder, updateReminder, toggleReminder, removeReminder, language } =
    useAppStore();
  const t = getT(language);
  const tr = t.reminders;
  const isBn = language === "bn";

  const handleToggle = async (id: string, currentActive: boolean) => {
    toggleReminder(id);
    try {
      await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });
    } catch {
      /* silent */
    }
  };

  const handleRemove = async (id: string) => {
    removeReminder(id);
    try {
      await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    } catch {
      /* silent */
    }
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [pickerTime, setPickerTime] = useState("");
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [doneItems, setDoneItems] = useState<Set<string>>(new Set());
  const [editTarget, setEditTarget] = useState<{
    reminderId: string;
    oldTime: string;
    medicine: string;
  } | null>(null);
  const [editNewTime, setEditNewTime] = useState("");
  const [editNotifyBefore, setEditNotifyBefore] = useState(0);
  const [testNotifyMsg, setTestNotifyMsg] = useState<string | null>(null);

  const persistReminderUpdate = async (id: string, patch: Partial<Reminder>) => {
    updateReminder(id, patch);
    try {
      await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      /* silent */
    }
  };

  const handleRemoveTime = async (reminderId: string, time: string) => {
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) return;

    const newTimes = reminder.times.filter((t) => t !== time);
    const newMuted = (reminder.mutedTimes ?? []).filter((t) => t !== time);

    if (newTimes.length === 0) {
      await handleRemove(reminderId);
      return;
    }

    await persistReminderUpdate(reminderId, {
      times: sortReminderTimes(newTimes),
      mutedTimes: newMuted,
    });
    setDoneItems((prev) => {
      const next = new Set(prev);
      next.delete(`${reminderId}-${time}`);
      return next;
    });
  };

  const openEditModal = (item: {
    reminderId: string;
    time: string;
    medicine: string;
  }) => {
    const reminder = reminders.find((r) => r.id === item.reminderId);
    setEditTarget({
      reminderId: item.reminderId,
      oldTime: item.time,
      medicine: item.medicine,
    });
    setEditNewTime(item.time);
    setEditNotifyBefore(reminder?.notifyBeforeMinutes ?? 0);
  };

  const handleSaveEditedTime = async () => {
    if (!editTarget || !editNewTime) {
      setEditTarget(null);
      return;
    }

    const reminder = reminders.find((r) => r.id === editTarget.reminderId);
    if (!reminder) return;

    const timeChanged = editNewTime !== editTarget.oldTime;
    const newTimes = timeChanged
      ? sortReminderTimes(
          reminder.times.map((t) => (t === editTarget.oldTime ? editNewTime : t))
        )
      : reminder.times;

    const nextMuted = (reminder.mutedTimes ?? []).map((t) =>
      t === editTarget.oldTime ? editNewTime : t
    );

    await persistReminderUpdate(editTarget.reminderId, {
      times: newTimes,
      notifyBeforeMinutes: editNotifyBefore,
      mutedTimes: nextMuted,
    });

    if (timeChanged) {
      setDoneItems((prev) => {
        const next = new Set(prev);
        next.delete(`${editTarget.reminderId}-${editTarget.oldTime}`);
        return next;
      });
    }

    setEditTarget(null);
    setEditNewTime("");
  };

  const toggleSlotNotification = async (reminderId: string, time: string) => {
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) return;

    const muted = reminder.mutedTimes ?? [];
    const isMuted = muted.includes(time);

    if (isMuted) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }

    const nextMuted = isMuted
      ? muted.filter((t) => t !== time)
      : [...muted, time];

    await persistReminderUpdate(reminderId, { mutedTimes: nextMuted });
  };

  const markDone = (key: string) => {
    setDoneItems((prev) => new Set([...prev, key]));
  };

  const todaySchedule = reminders
    .filter((r) => r.active)
    .flatMap((r) =>
      r.times.map((time) => ({
        time,
        medicine: r.medicineName,
        doctorName: r.doctorName,
        reminderId: r.id,
        isMuted: (r.mutedTimes ?? []).includes(time),
        key: `${r.id}-${time}`,
      }))
    )
    .sort((a, b) => {
      const aMinutes = getMinutesFromMidnight(a.time) ?? 0;
      const bMinutes = getMinutesFromMidnight(b.time) ?? 0;
      return aMinutes - bMinutes;
    });

  const grouped: Record<string, typeof reminders> = {};
  const ungroupedKey = isBn ? "অন্যান্য" : "Other";

  reminders.forEach((r) => {
    const key = r.doctorName?.trim() || ungroupedKey;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  const activeCount = reminders.filter((r) => r.active).length;

  const initPickerTime = () => {
    const parts = defaultTimeParts();
    return formatReminderTime(parts.hour, parts.minute, parts.period, isBn);
  };

  const openAddForm = () => {
    setPickerTime(initPickerTime());
    setSelectedTimes([]);
    setShowAddForm(true);
  };

  const addPickerTimeToSelection = () => {
    if (!pickerTime || selectedTimes.includes(pickerTime)) return;
    setSelectedTimes((prev) => sortReminderTimes([...prev, pickerTime]));
  };

  const handleAddReminder = async () => {
    if (!newMedName.trim() || selectedTimes.length === 0) return;

    const granted = await requestNotificationPermission();

    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineName: newMedName.trim(),
          times: selectedTimes,
          active: true,
          notifyBeforeMinutes: 0,
          mutedTimes: granted ? [] : selectedTimes,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        addReminder({
          id: saved.id,
          medicineName: saved.medicineName,
          times: saved.times as string[],
          active: saved.active,
          createdAt: new Date(saved.createdAt).toLocaleDateString(isBn ? "bn-BD" : "en-US"),
          doctorName: saved.doctorName ?? undefined,
          visitId: saved.visitId ?? undefined,
          notifyBeforeMinutes: saved.notifyBeforeMinutes ?? 0,
          mutedTimes: Array.isArray(saved.mutedTimes) ? saved.mutedTimes : [],
        });
        setJustAdded(saved.id);
        setTimeout(() => setJustAdded(null), 3000);
      }
    } catch {
      const newReminder = {
        id: `rem-${Date.now()}`,
        medicineName: newMedName.trim(),
        times: selectedTimes,
        active: true,
        createdAt: new Date().toLocaleDateString(isBn ? "bn-BD" : "en-US"),
        notifyBeforeMinutes: 0,
        mutedTimes: granted ? [] : selectedTimes,
      };
      addReminder(newReminder);
      setJustAdded(newReminder.id);
      setTimeout(() => setJustAdded(null), 3000);
    }

    setNewMedName("");
    setSelectedTimes([]);
    setShowAddForm(false);
  };

  const handleTestNotification = async () => {
    const ok = await showTestNotification(isBn);
    setTestNotifyMsg(ok ? tr.testNotifyOk : tr.testNotifyFail);
    setTimeout(() => setTestNotifyMsg(null), 3000);
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div className="bg-gradient-to-br from-teal-600 to-cyan-500 rounded-2xl p-6 text-white shadow-lg shadow-teal-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{tr.title}</h2>
            <p className="text-teal-100 text-sm">{tr.subtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
            <p className="text-white font-black text-2xl">{reminders.length}</p>
            <p className="text-teal-100 text-xs mt-0.5">{tr.total}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
            <p className="text-white font-black text-2xl">{activeCount}</p>
            <p className="text-teal-100 text-xs mt-0.5">{tr.active}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
            <p className="text-white font-black text-2xl">0</p>
            <p className="text-teal-100 text-xs mt-0.5">{tr.missedToday}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleTestNotification()}
          className="mt-4 w-full py-2.5 rounded-xl bg-white/15 border border-white/25 text-white text-sm font-medium hover:bg-white/25 transition-colors"
        >
          {tr.testNotify}
        </button>
        {testNotifyMsg && (
          <p className="mt-2 text-center text-xs text-teal-100">{testNotifyMsg}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="font-bold text-gray-800">{tr.todaySchedule}</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full w-fit">
            {new Date().toLocaleDateString(isBn ? "bn-BD" : "en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        {todaySchedule.length === 0 ? (
          <div className="text-center py-6">
            <AlarmClock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">
              {isBn ? "কোনো সক্রিয় রিমাইন্ডার নেই" : "No active reminders yet"}
            </p>
            <p className="text-gray-300 text-xs mt-1">
              {isBn ? "নিচে থেকে নতুন রিমাইন্ডার যোগ করুন" : "Add a new reminder below"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySchedule.map((item) => {
              const isDone = doneItems.has(item.key);
              const scheduleActions = !isDone ? (
                <>
                  <button
                    onClick={() => openEditModal(item)}
                    className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors"
                    title={tr.editTime}
                  >
                    <Pencil className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleRemoveTime(item.reminderId, item.time)}
                    className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors"
                    title={tr.deleteTime}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                  <button
                    onClick={() => toggleSlotNotification(item.reminderId, item.time)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      item.isMuted
                        ? "bg-gray-200 hover:bg-gray-300"
                        : "bg-amber-200 hover:bg-amber-300"
                    }`}
                    title={item.isMuted ? tr.notifyEnable : tr.notifyDisable}
                  >
                    {item.isMuted ? (
                      <BellOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <BellRing className="w-4 h-4 text-amber-700" />
                    )}
                  </button>
                  <button
                    onClick={() => markDone(item.key)}
                    className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors"
                    title={isBn ? "খেয়েছি" : "Mark as taken"}
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </button>
                </>
              ) : null;

              return (
                <div
                  key={item.key}
                  className={`rounded-xl p-3 transition-all ${
                    isDone ? "bg-green-50 opacity-70" : "bg-amber-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isDone ? "bg-green-100" : "bg-amber-100"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlarmClock className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium text-sm leading-snug break-words ${
                          isDone ? "line-through text-gray-400" : "text-gray-800"
                        }`}
                      >
                        {item.medicine}
                      </p>
                      {item.doctorName && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                          <Stethoscope className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{item.doctorName}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p
                        className={`text-sm font-bold whitespace-nowrap ${
                          isDone ? "text-gray-400" : "text-gray-700"
                        }`}
                      >
                        {item.time}
                      </p>
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap ${
                          isDone
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isDone ? (isBn ? "খাওয়া হয়েছে" : "Done") : tr.upcoming}
                      </span>
                    </div>
                    {scheduleActions && (
                      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                        {scheduleActions}
                      </div>
                    )}
                  </div>
                  {scheduleActions && (
                    <div className="flex sm:hidden items-center justify-end gap-1.5 mt-2.5 pt-2.5 border-t border-amber-200/70">
                      {scheduleActions}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">{tr.myReminders}</h3>
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {tr.addNew}
          </button>
        </div>

        {reminders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600 mb-1">
              {isBn ? "কোনো রিমাইন্ডার নেই" : "No reminders yet"}
            </p>
            <p className="text-gray-400 text-sm">
              {isBn
                ? "ওষুধের রিমাইন্ডার সেট করুন বা Visit থেকে automatically যোগ হবে"
                : "Set medicine reminders or they'll be added automatically from Visits"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([doctor, doctorReminders]) => (
              <div key={doctor}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-6 h-6 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <p className="text-sm font-bold text-gray-600">{doctor}</p>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="space-y-3">
                  {doctorReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                        justAdded === reminder.id
                          ? "border-green-400 bg-green-50"
                          : "border-gray-100"
                      } ${reminder.active ? "" : "opacity-60"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              reminder.active ? "bg-amber-100" : "bg-gray-100"
                            }`}
                          >
                            <Pill
                              className={`w-5 h-5 ${
                                reminder.active ? "text-amber-600" : "text-gray-400"
                              }`}
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-sm">
                              {reminder.medicineName}
                            </h4>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {reminder.times.map((time) => (
                                <span
                                  key={time}
                                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                    (reminder.mutedTimes ?? []).includes(time)
                                      ? "bg-gray-100 text-gray-400 line-through"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {time}
                                </span>
                              ))}
                            </div>
                            <p className="text-gray-400 text-xs mt-1">
                              {tr.addedOn} {reminder.createdAt}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleToggle(reminder.id, reminder.active)}
                            className={`transition-colors ${
                              reminder.active
                                ? "text-teal-600 hover:text-teal-700"
                                : "text-gray-400 hover:text-teal-500"
                            }`}
                          >
                            {reminder.active ? (
                              <ToggleRight className="w-8 h-8" />
                            ) : (
                              <ToggleLeft className="w-8 h-8" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRemove(reminder.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowAddForm(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-teal-600" />
              {tr.addTitle}
            </h3>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {tr.medicineLabel}
              </label>
              <input
                type="text"
                value={newMedName}
                onChange={(e) => setNewMedName(e.target.value)}
                placeholder={tr.medicinePlaceholder}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {tr.selectTime}
              </label>
              <TimeWheelPicker
                value={pickerTime || initPickerTime()}
                onChange={setPickerTime}
                isBn={isBn}
              />
              <button
                type="button"
                onClick={addPickerTimeToSelection}
                className="w-full mt-3 py-2.5 rounded-xl border-2 border-dashed border-teal-300 text-teal-700 text-sm font-medium hover:bg-teal-50 transition-colors"
              >
                + {tr.addThisTime}
              </button>
            </div>

            {selectedTimes.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-500 mb-2">{tr.selectedTimes}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTimes.map((time) => (
                    <span
                      key={time}
                      className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs px-2.5 py-1 rounded-full border border-teal-200"
                    >
                      {time}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTimes((prev) => prev.filter((t) => t !== time))
                        }
                        className="text-teal-500 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium text-sm"
              >
                {tr.cancel}
              </button>
              <button
                onClick={handleAddReminder}
                disabled={!newMedName.trim() || selectedTimes.length === 0}
                className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors"
              >
                {tr.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-800 text-lg mb-1 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-teal-600" />
              {tr.editTimeTitle}
            </h3>
            <p className="text-gray-500 text-sm mb-4">{editTarget.medicine}</p>

            <TimeWheelPicker
              value={
                editNewTime ||
                formatReminderTime(
                  defaultTimeParts().hour,
                  defaultTimeParts().minute,
                  defaultTimeParts().period,
                  isBn
                )
              }
              onChange={setEditNewTime}
              isBn={isBn}
            />

            <div className="mt-4 mb-5">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {tr.notifyBefore}
              </label>
              <select
                value={editNotifyBefore}
                onChange={(e) => setEditNotifyBefore(Number(e.target.value))}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {NOTIFY_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes === 0
                      ? tr.notifyAtTime
                      : `${minutes} ${tr.notifyBeforeMin}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium text-sm"
              >
                {tr.cancel}
              </button>
              <button
                onClick={handleSaveEditedTime}
                className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-medium text-sm hover:bg-teal-700 transition-colors"
              >
                {tr.saveTime}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
