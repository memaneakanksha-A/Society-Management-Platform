import FinanceSetting from "../models/FinanceSetting";
import Payment from "../models/Payment";
import Income from "../models/Income";
import Expense from "../models/Expense";
import { ApiError } from "../utils/ApiError";
import { buildBreakdown, resolvePeriod } from "../utils/period";
import type { PeriodMode } from "../utils/period";

const round = (n: number): number => Math.round(n * 100) / 100;

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const financialYearOf = (date: Date): number => {
  const month = date.getMonth();
  return month >= 3 ? date.getFullYear() : date.getFullYear() - 1;
};

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

interface ReportRange {
  start: Date;
  end: Date;
  year: number;
}

const resolveRange = (opts: { year?: number; from?: string; to?: string }): ReportRange => {
  if (opts.year) {
    const year = opts.year;
    return { start: new Date(year, 3, 1), end: new Date(year + 1, 3, 1, 0, 0, 0, 0), year };
  }
  const now = new Date();
  const currentFy = financialYearOf(now);
  let start: Date;
  let end: Date;
  if (opts.from) {
    start = startOfDay(new Date(opts.from));
  } else if (opts.to) {
    start = startOfDay(new Date(opts.to));
  } else {
    start = new Date(currentFy, 3, 1);
  }
  if (opts.to) {
    end = endOfDay(new Date(opts.to));
  } else if (opts.from) {
    end = endOfDay(now);
  } else {
    end = new Date(currentFy + 1, 3, 1, 0, 0, 0, 0);
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(400, "Invalid date range");
  }
  return { start, end, year: financialYearOf(start) };
};

// ---------- Opening balance ----------

export const getOpeningBalance = async (societyId: string, year: number) => {
  const setting = await FinanceSetting.findOne({ societyId, year }).lean();
  return {
    year,
    openingCash: setting?.openingCash ?? 0,
    openingBank: setting?.openingBank ?? 0,
  };
};

export const updateOpeningBalance = async (
  societyId: string,
  year: number,
  input: { openingCash?: number | string; openingBank?: number | string }
) => {
  const openingCash = Number(input.openingCash) || 0;
  const openingBank = Number(input.openingBank) || 0;
  if (openingCash < 0 || openingBank < 0) throw new ApiError(400, "Opening balance cannot be negative");

  const setting = await FinanceSetting.findOneAndUpdate(
    { societyId, year },
    { $set: { openingCash: round(openingCash), openingBank: round(openingBank) } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return setting;
};

// ---------- Income & Expense report ----------

const monthKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth()}`;

const buildMonthBuckets = (start: Date, end: Date) => {
  const buckets: Array<{ key: string; label: string; income: number; expense: number }> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor.getTime() <= last.getTime()) {
    buckets.push({
      key: monthKey(cursor),
      label: `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`,
      income: 0,
      expense: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
};

export const incomeExpenseReport = async (
  societyId: string,
  opts: { year?: number; from?: string; to?: string; period?: PeriodMode; month?: number; quarter?: number }
) => {
  const usePeriod = opts.period || opts.month || opts.quarter;
  const period = usePeriod
    ? resolvePeriod({ year: opts.year, period: opts.period, month: opts.month, quarter: opts.quarter })
    : null;
  const { start, end, year } = period
    ? { start: period.from, end: period.to, year: period.year }
    : resolveRange(opts);

  const computeTotals = async (from: Date, to: Date) => {
    const [payments, incomes, expenses, opening] = await Promise.all([
      Payment.find({ societyId, status: "active", paidOn: { $gte: from, $lt: to } })
        .select("kind amount mode paidOn")
        .lean(),
      Income.find({ societyId, status: "active", date: { $gte: from, $lt: to } })
        .select("amount mode date")
        .lean(),
      Expense.find({ societyId, status: "active", date: { $gte: from, $lt: to } })
        .select("amount paymentMode date categoryId")
        .populate("categoryId", "name")
        .lean(),
      getOpeningBalance(societyId, year),
    ]);
    let maintenance = 0;
    let shares = 0;
    for (const p of payments as any[]) {
      if (p.kind === "maintenance") maintenance += p.amount;
      else if (p.kind === "share") shares += p.amount;
    }
    let otherIncome = 0;
    for (const i of incomes as any[]) otherIncome += i.amount;
    let totalExpenses = 0;
    for (const e of expenses as any[]) totalExpenses += e.amount;
    const totalIncome = round(maintenance + shares + otherIncome);
    const openingTotal = round(opening.openingCash + opening.openingBank);
    return {
      payments: payments as any[],
      incomes: incomes as any[],
      expenses: expenses as any[],
      maintenance: round(maintenance),
      shares: round(shares),
      other: round(otherIncome),
      totalIncome,
      totalExpenses: round(totalExpenses),
      openingTotal,
      opening,
    };
  };

  const totals = await computeTotals(start, end);
  const payments = totals.payments;
  const incomes = totals.incomes;
  const expenses = totals.expenses;
  const maintenance = totals.maintenance;
  const shares = totals.shares;
  const otherIncome = totals.other;
  const totalIncome = totals.totalIncome;
  const totalExpenses = totals.totalExpenses;
  const openingTotal = totals.openingTotal;
  const opening = totals.opening;

  const categoryMap = new Map<string, { categoryId: string; name: string; amount: number }>();
  for (const e of expenses as any[]) {
    const catId = e.categoryId?._id ? String(e.categoryId._id) : "uncategorized";
    const name = e.categoryId?.name || "Uncategorized";
    const existing = categoryMap.get(catId);
    if (existing) existing.amount = round(existing.amount + e.amount);
    else categoryMap.set(catId, { categoryId: catId, name, amount: round(e.amount) });
  }
  const byCategory = [...categoryMap.values()].sort((a, b) => b.amount - a.amount);

  const net = round(totalIncome - totalExpenses);
  const closingBalance = round(openingTotal + net);

  // Month-wise
  const buckets = buildMonthBuckets(start, new Date(end.getTime() - 1));
  const bucketMap = new Map(buckets.map((b) => [b.key, b]));
  for (const p of payments as any[]) {
    const b = bucketMap.get(monthKey(new Date(p.paidOn)));
    if (b) b.income = round(b.income + p.amount);
  }
  for (const i of incomes as any[]) {
    const b = bucketMap.get(monthKey(new Date(i.date)));
    if (b) b.income = round(b.income + i.amount);
  }
  for (const e of expenses as any[]) {
    const b = bucketMap.get(monthKey(new Date(e.date)));
    if (b) b.expense = round(b.expense + e.amount);
  }
  const monthWise = buckets.map((b) => ({ label: b.label, income: b.income, expense: b.expense, net: round(b.income - b.expense) }));

  // Cash vs bank split (cash vs everything else)
  let incomeCash = 0;
  for (const p of payments as any[]) if (p.mode === "cash") incomeCash += p.amount;
  for (const i of incomes as any[]) if (i.mode === "cash") incomeCash += i.amount;

  let expenseCash = 0;
  for (const e of expenses as any[]) if (e.paymentMode === "cash") expenseCash += e.amount;

  const cashBank = {
    cash: { income: round(incomeCash), expense: round(expenseCash) },
    bank: { income: round(totalIncome - incomeCash), expense: round(totalExpenses - expenseCash) },
  };

  // Breakdown with opening balance carried forward
  let breakdown: any[] = [];
  if (period) {
    const buckets = buildBreakdown({
      year,
      period: period.period,
      month: period.month,
      quarter: period.quarter,
    });
    let runningOpening = openingTotal;
    for (const b of buckets) {
      const t = await computeTotals(b.from, b.to);
      const surplus = round(t.totalIncome - t.totalExpenses);
      const closing = round(runningOpening + surplus);
      breakdown.push({
        label: b.label,
        from: b.from,
        to: b.to,
        opening: runningOpening,
        income: t.totalIncome,
        expenses: t.totalExpenses,
        surplus,
        closingBalance: closing,
      });
      runningOpening = closing;
    }
  }

  return {
    year,
    period: period
      ? { period: period.period, label: period.label, month: period.month, quarter: period.quarter }
      : { period: "yearly", label: `FY ${year}-${String((year + 1) % 100).padStart(2, "0")}` },
    range: { from: start, to: end },
    openingBalance: {
      cash: opening.openingCash,
      bank: opening.openingBank,
      total: openingTotal,
    },
    income: {
      maintenance: round(maintenance),
      shares: round(shares),
      other: round(otherIncome),
      total: totalIncome,
    },
    expenses: {
      total: totalExpenses,
      byCategory,
    },
    net,
    closingBalance,
    monthWise,
    cashBank,
    breakdown,
  };
};

export const expensesSummary = async (
  societyId: string,
  opts: { from?: string; to?: string; year?: number; period?: PeriodMode; month?: number; quarter?: number }
) => {
  const usePeriod = opts.period || opts.month || opts.quarter;
  const period = usePeriod
    ? resolvePeriod({ year: opts.year, period: opts.period, month: opts.month, quarter: opts.quarter })
    : null;
  const { start, end } = period
    ? { start: period.from, end: period.to }
    : resolveRange(opts);

  const expenses = await Expense.find({ societyId, status: "active", date: { $gte: start, $lt: end } })
    .select("amount paymentMode date categoryId")
    .populate("categoryId", "name")
    .lean();

  const categoryMap = new Map<string, { categoryId: string; name: string; amount: number; count: number }>();
  const monthMap = new Map<string, { key: string; label: string; amount: number; count: number }>();
  let total = 0;

  for (const e of expenses as any[]) {
    total += e.amount;
    const catId = e.categoryId?._id ? String(e.categoryId._id) : "uncategorized";
    const catName = e.categoryId?.name || "Uncategorized";
    const cat = categoryMap.get(catId);
    if (cat) {
      cat.amount = round(cat.amount + e.amount);
      cat.count += 1;
    } else {
      categoryMap.set(catId, { categoryId: catId, name: catName, amount: round(e.amount), count: 1 });
    }

    const d = new Date(e.date);
    const key = monthKey(d);
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
    const m = monthMap.get(key);
    if (m) {
      m.amount = round(m.amount + e.amount);
      m.count += 1;
    } else {
      monthMap.set(key, { key, label, amount: round(e.amount), count: 1 });
    }
  }

  const byCategory = [...categoryMap.values()].sort((a, b) => b.amount - a.amount);
  const byMonth = [...monthMap.values()].sort((a, b) => (a.key < b.key ? -1 : 1));

  let breakdown: any[] = [];
  if (period) {
    const inRange = (d: Date, from: Date, to: Date) =>
      d.getTime() >= from.getTime() && d.getTime() < to.getTime();
    breakdown = buildBreakdown({
      year: period.year,
      period: period.period,
      month: period.month,
      quarter: period.quarter,
    }).map((b) => {
      const rows = (expenses as any[]).filter((e) => inRange(new Date(e.date), b.from, b.to));
      const total = rows.reduce((s, e) => s + e.amount, 0);
      return { label: b.label, from: b.from, to: b.to, total: round(total), count: rows.length };
    });
  }

  return {
    range: { from: start, to: end },
    period: period
      ? { period: period.period, label: period.label, month: period.month, quarter: period.quarter }
      : { period: "yearly", label: `FY ${resolveReportYear(opts.year)}-${String((resolveReportYear(opts.year) + 1) % 100).padStart(2, "0")}` },
    total: round(total),
    count: (expenses as any[]).length,
    byCategory,
    byMonth,
    breakdown,
  };
};

export const resolveReportYear = (year?: number): number =>
  year && Number.isFinite(year) ? year : financialYearOf(new Date());