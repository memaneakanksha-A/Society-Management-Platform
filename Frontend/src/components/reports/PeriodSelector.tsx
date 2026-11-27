import { useSearchParams } from "react-router-dom";
import { Select } from "@/components/ui/Select";

export type PeriodMode = "monthly" | "quarterly" | "yearly";

export interface PeriodQuery {
  year?: number;
  period?: PeriodMode;
  month?: number;
  quarter?: number;
}

const currentFY = (): number => {
  const n = new Date();
  return n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
};

const currentQuarter = (): number => {
  const m = new Date().getMonth() + 1;
  if (m >= 4 && m <= 6) return 1;
  if (m >= 7 && m <= 9) return 2;
  if (m >= 10 || m <= 12) return 3;
  return 4;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const usePeriodQuery = (): PeriodQuery => {
  const [params] = useSearchParams();
  const period = (params.get("period") as PeriodMode) || "yearly";
  const year = Number(params.get("year")) || currentFY();
  const month = Number(params.get("month")) || new Date().getMonth() + 1;
  const quarter = Number(params.get("quarter")) || currentQuarter();
  return { year, period, month, quarter };
};

export default function PeriodSelector() {
  const [params, setParams] = useSearchParams();
  const period = (params.get("period") as PeriodMode) || "yearly";
  const year = Number(params.get("year")) || currentFY();
  const month = Number(params.get("month")) || new Date().getMonth() + 1;
  const quarter = Number(params.get("quarter")) || currentQuarter();

  const years = Array.from({ length: 5 }, (_, i) => currentFY() - 1 + i);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    });
    setParams(next, { replace: true });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Period</label>
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
          {(["monthly", "quarterly", "yearly"] as PeriodMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() =>
                update({
                  period: m,
                  month: m === "monthly" ? String(month) : null,
                  quarter: m === "quarterly" ? String(quarter) : null,
                })
              }
              className={`px-3 py-2 text-sm capitalize ${
                period === m ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <Select
        label="Financial Year"
        options={years.map((y) => ({ value: String(y), label: `${y}-${String((y + 1) % 100).padStart(2, "0")}` }))}
        value={String(year)}
        onChange={(e) => update({ year: e.target.value })}
      />

      {period === "monthly" && (
        <Select
          label="Month"
          options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
          value={String(month)}
          onChange={(e) => update({ month: e.target.value })}
        />
      )}

      {period === "quarterly" && (
        <Select
          label="Quarter"
          options={[
            { value: "1", label: "Q1 (Apr-Jun)" },
            { value: "2", label: "Q2 (Jul-Sep)" },
            { value: "3", label: "Q3 (Oct-Dec)" },
            { value: "4", label: "Q4 (Jan-Mar)" },
          ]}
          value={String(quarter)}
          onChange={(e) => update({ quarter: e.target.value })}
        />
      )}
    </div>
  );
}