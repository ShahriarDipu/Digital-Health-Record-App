import type { AdminSortKey, AdminSortSelectValue } from "@/lib/adminSort";

export function AdminSortSelect({
  columnKey,
  label,
  value,
  onChange,
  optionLabels,
}: {
  columnKey: AdminSortKey;
  label: string;
  value: AdminSortSelectValue;
  onChange: (key: AdminSortKey, value: AdminSortSelectValue) => void;
  optionLabels: { norm: string; high: string; low: string };
}) {
  const isActive = value !== "norm";

  return (
    <label className="inline-flex items-center gap-1.5 min-w-0">
      <span className="text-[11px] sm:text-xs font-medium text-slate-500 whitespace-nowrap">
        {label}:
      </span>
      <select
        value={value}
        onChange={(e) =>
          onChange(columnKey, e.target.value as AdminSortSelectValue)
        }
        className={`appearance-none rounded-lg border px-2 py-1 pr-6 text-[11px] sm:text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/25 ${
          isActive
            ? "border-teal-300 bg-teal-50 text-teal-800"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
        }`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 6px center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="norm">{optionLabels.norm}</option>
        <option value="high">{optionLabels.high}</option>
        <option value="low">{optionLabels.low}</option>
      </select>
    </label>
  );
}
