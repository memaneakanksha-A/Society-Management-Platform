export type PeriodMode = "monthly" | "quarterly" | "yearly";

export interface PeriodInput {
  year?: number;
  period?: PeriodMode;
  month?: number;
  quarter?: number;
}

export interface PeriodRange {
  year: number;
  period: PeriodMode;
  month?: number;
  quarter?: number;
  from: Date;
  to: Date;
  label: string;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const currentFinancialYear = (): number => {
  const n = new Date();
  return n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
};

const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// Month (1-12) -> { start, end } within the April-March financial year.
const monthRange = (year: number, month: number): { from: Date; to: Date } => {
  const calYear = month < 4 ? year + 1 : year;
  const from = new Date(calYear, month - 1, 1);
  const to = new Date(calYear, month, 1);
  return { from, to };
};

const quarterRange = (year: number, quarter: number): { from: Date; to: Date } => {
  const startMonth = 3 + (quarter - 1) * 3; // Apr=3 (0-based)
  const from = new Date(year, startMonth, 1);
  const to = new Date(year, startMonth + 3, 1);
  return { from, to };
};

export const resolvePeriod = (input: PeriodInput): PeriodRange => {
  const year = input.year && Number.isFinite(input.year) ? input.year : currentFinancialYear();
  const period: PeriodMode = input.period || "yearly";

  if (period === "monthly") {
    const month = input.month && input.month >= 1 && input.month <= 12 ? input.month : new Date().getMonth() + 1;
    const { from, to } = monthRange(year, month);
    const calYear = month < 4 ? year + 1 : year;
    return {
      year,
      period,
      month,
      from: startOfDay(from),
      to: startOfDay(to),
      label: `${MONTH_LABELS[month - 1]} ${calYear}`,
    };
  }

  if (period === "quarterly") {
    const quarter = input.quarter && input.quarter >= 1 && input.quarter <= 4 ? input.quarter : 1;
    const { from, to } = quarterRange(year, quarter);
    const months = ["Apr-Jun", "Jul-Sep", "Oct-Dec", "Jan-Mar"][quarter - 1];
    const calYear = quarter <= 3 ? year : year + 1;
    return {
      year,
      period,
      quarter,
      from: startOfDay(from),
      to: startOfDay(to),
      label: `Q${quarter} (${months} ${calYear})`,
    };
  }

  return {
    year,
    period: "yearly",
    from: startOfDay(new Date(year, 3, 1)),
    to: startOfDay(new Date(year + 1, 3, 1)),
    label: `FY ${year}-${String((year + 1) % 100).padStart(2, "0")}`,
  };
};

export interface BreakdownItem {
  key: string;
  label: string;
  from: Date;
  to: Date;
}

// Build the breakdown buckets for a period (12 months / 4 quarters / year + prev year).
export const buildBreakdown = (input: PeriodInput): BreakdownItem[] => {
  const year = input.year && Number.isFinite(input.year) ? input.year : currentFinancialYear();
  const period: PeriodMode = input.period || "yearly";

  if (period === "monthly") {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const { from, to } = monthRange(year, month);
      const calYear = month < 4 ? year + 1 : year;
      return {
        key: `m${month}`,
        label: `${MONTH_LABELS[month - 1]} ${calYear}`,
        from: startOfDay(from),
        to: startOfDay(to),
      };
    });
  }

  if (period === "quarterly") {
    return Array.from({ length: 4 }, (_, i) => {
      const quarter = i + 1;
      const { from, to } = quarterRange(year, quarter);
      const months = ["Apr-Jun", "Jul-Sep", "Oct-Dec", "Jan-Mar"][i];
      const calYear = quarter <= 3 ? year : year + 1;
      return {
        key: `q${quarter}`,
        label: `Q${quarter} (${months} ${calYear})`,
        from: startOfDay(from),
        to: startOfDay(to),
      };
    });
  }

  return [
    {
      key: `y${year}`,
      label: `FY ${year}-${String((year + 1) % 100).padStart(2, "0")}`,
      from: startOfDay(new Date(year, 3, 1)),
      to: startOfDay(new Date(year + 1, 3, 1)),
    },
  ];
};

export const periodFromQuery = (q: Record<string, string | undefined>): PeriodInput => {
  const period = (q.period as PeriodMode) || "yearly";
  return {
    year: q.year ? Number(q.year) : undefined,
    period,
    month: q.month ? Number(q.month) : undefined,
    quarter: q.quarter ? Number(q.quarter) : undefined,
  };
};

export { endOfDay };