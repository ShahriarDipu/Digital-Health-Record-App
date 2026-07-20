"use client";

import { Clock } from "lucide-react";
import {
  formatReminderTime,
  timePartsFromString,
  type TimePeriod,
} from "@/lib/reminderTime";

interface TimeWheelPickerProps {
  value: string;
  onChange: (value: string) => void;
  isBn: boolean;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export default function TimeWheelPicker({ value, onChange, isBn }: TimeWheelPickerProps) {
  const parts = timePartsFromString(value) ?? {
    hour: 8,
    minute: 0,
    period: "AM" as TimePeriod,
  };

  const update = (next: Partial<typeof parts>) => {
    const merged = { ...parts, ...next };
    onChange(formatReminderTime(merged.hour, merged.minute, merged.period, isBn));
  };

  const fieldClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-center text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 appearance-none cursor-pointer";

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-teal-50/40 border border-gray-200 p-5">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-center">
            {isBn ? "ঘণ্টা" : "Hour"}
          </label>
          <select
            value={parts.hour}
            onChange={(e) => update({ hour: Number(e.target.value) })}
            className={fieldClass}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h.toString().padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>

        <span className="text-2xl font-bold text-gray-300 pb-3">:</span>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-center">
            {isBn ? "মিনিট" : "Minute"}
          </label>
          <select
            value={parts.minute}
            onChange={(e) => update({ minute: Number(e.target.value) })}
            className={fieldClass}
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m.toString().padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 text-center">
          AM / PM
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white border border-gray-200">
          {(["AM", "PM"] as TimePeriod[]).map((period) => {
            const active = parts.period === period;
            return (
              <button
                key={period}
                type="button"
                onClick={() => update({ period })}
                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                  active
                    ? "bg-teal-600 text-white shadow-sm shadow-teal-200"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {period}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white border border-teal-100 px-4 py-3">
        <Clock className="w-4 h-4 text-teal-600 flex-shrink-0" />
        <p className="text-sm font-bold text-teal-800">{value}</p>
      </div>
    </div>
  );
}
