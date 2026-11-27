import mongoose from "mongoose";
import Income, { IIncome, IncomeSource, PaymentMode } from "../models/Income";
import { nextSeq } from "../models/Counter";
import { ApiError } from "../utils/ApiError";
import { financialYearLabel } from "./maintenance.service";

const round = (n: number): number => Math.round(n * 100) / 100;

const financialYearOf = (date: Date): number => {
  const month = date.getMonth();
  return month >= 3 ? date.getFullYear() : date.getFullYear() - 1;
};

const SOURCES: IncomeSource[] = ["interest", "hall_rent", "penalty", "donation", "scrap", "other"];
const MODES: PaymentMode[] = ["cash", "upi", "cheque", "bank_transfer", "card", "other"];

export interface IncomeListOptions {
  from?: string;
  to?: string;
  source?: string;
  mode?: string;
  search?: string;
  status?: string;
  page: number;
  limit: number;
}

const buildIncomeFilter = (societyId: string, opts: IncomeListOptions): Record<string, any> => {
  const filter: Record<string, any> = { societyId };
  if (opts.status) filter.status = opts.status;
  if (opts.source) filter.source = opts.source;
  if (opts.mode) filter.mode = opts.mode;
  if (opts.from || opts.to) {
    filter.date = {};
    if (opts.from) filter.date.$gte = new Date(opts.from);
    if (opts.to) {
      const to = new Date(opts.to);
      to.setHours(23, 59, 59, 999);
      filter.date.$lte = to;
    }
  }
  if (opts.search) {
    const regex = new RegExp(opts.search, "i");
    filter.$or = [{ title: regex }, { receivedFrom: regex }, { referenceNo: regex }, { incomeNo: regex }];
  }
  return filter;
};

export const listIncomes = async (societyId: string, opts: IncomeListOptions) => {
  const filter = buildIncomeFilter(societyId, opts);

  const [items, total, rows] = await Promise.all([
    Income.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((opts.page - 1) * opts.limit)
      .limit(opts.limit)
      .lean(),
    Income.countDocuments(filter),
    Income.find(filter).select("amount status").lean(),
  ]);

  const totalAmount = round(
    (rows as any[]).filter((r) => r.status === "active").reduce((s, r) => s + r.amount, 0)
  );

  return {
    items,
    total,
    page: opts.page,
    pages: Math.ceil(total / opts.limit),
    totals: { amount: totalAmount, count: rows.length },
  };
};

export interface IncomeInput {
  date?: string;
  source: IncomeSource;
  title: string;
  amount: number | string;
  mode: PaymentMode;
  referenceNo?: string;
  receivedFrom?: string;
  remarks?: string;
}

export const createIncome = async (
  societyId: string,
  input: IncomeInput,
  adminName: string
): Promise<IIncome> => {
  if (!SOURCES.includes(input.source)) throw new ApiError(400, "Invalid source");
  if (!MODES.includes(input.mode)) throw new ApiError(400, "Invalid mode");

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, "Amount must be greater than zero");

  const title = (input.title || "").trim();
  if (!title) throw new ApiError(400, "Title is required");

  const date = input.date ? new Date(input.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new ApiError(400, "Invalid date");

  const year = financialYearOf(date);
  const seq = await nextSeq(societyId, `income:${year}`);
  const incomeNo = `INC/${financialYearLabel(year)}/${String(seq).padStart(4, "0")}`;

  return Income.create({
    societyId,
    date,
    source: input.source,
    title,
    amount: round(amount),
    mode: input.mode,
    referenceNo: input.referenceNo,
    receivedFrom: input.receivedFrom,
    remarks: input.remarks,
    incomeNo,
    status: "active",
    createdBy: adminName,
  });
};

export const updateIncome = async (
  societyId: string,
  id: string,
  input: Partial<IncomeInput>
): Promise<IIncome> => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid income id");
  const income = await Income.findOne({ _id: id, societyId });
  if (!income) throw new ApiError(404, "Income not found");

  if (input.source !== undefined) {
    if (!SOURCES.includes(input.source)) throw new ApiError(400, "Invalid source");
    income.source = input.source;
  }
  if (input.mode !== undefined) {
    if (!MODES.includes(input.mode)) throw new ApiError(400, "Invalid mode");
    income.mode = input.mode;
  }
  if (input.title !== undefined) {
    const title = String(input.title).trim();
    if (!title) throw new ApiError(400, "Title is required");
    income.title = title;
  }
  if (input.amount !== undefined) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, "Amount must be greater than zero");
    income.amount = round(amount);
  }
  if (input.date !== undefined) {
    const date = new Date(input.date);
    if (Number.isNaN(date.getTime())) throw new ApiError(400, "Invalid date");
    income.date = date;
  }
  if (input.referenceNo !== undefined) income.referenceNo = input.referenceNo;
  if (input.receivedFrom !== undefined) income.receivedFrom = input.receivedFrom;
  if (input.remarks !== undefined) income.remarks = input.remarks;

  await income.save();
  return income;
};

export const cancelIncome = async (
  societyId: string,
  id: string,
  reason: string,
  adminName: string
): Promise<IIncome> => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid income id");
  if (!reason || !reason.trim()) throw new ApiError(400, "Reason is required");

  const income = await Income.findOne({ _id: id, societyId });
  if (!income) throw new ApiError(404, "Income not found");
  if (income.status === "cancelled") throw new ApiError(400, "Income already cancelled");

  income.status = "cancelled";
  income.cancelReason = reason.trim();
  income.cancelledAt = new Date();
  income.cancelledBy = adminName;
  await income.save();
  return income;
};