import mongoose from "mongoose";
import Expense, { IExpense, PaymentMode } from "../models/Expense";
import ExpenseCategory, { DEFAULT_EXPENSE_CATEGORIES } from "../models/ExpenseCategory";
import { nextSeq } from "../models/Counter";
import { ApiError } from "../utils/ApiError";
import { deletePrivateFile } from "../config/multer";
import { financialYearLabel } from "./maintenance.service";

const round = (n: number): number => Math.round(n * 100) / 100;

const financialYearOf = (date: Date): number => {
  const month = date.getMonth();
  return month >= 3 ? date.getFullYear() : date.getFullYear() - 1;
};

const parseBool = (v: unknown): boolean => v === true || v === "true";

// ---------- Categories ----------

export const ensureDefaultCategories = async (societyId: string): Promise<void> => {
  const count = await ExpenseCategory.countDocuments({ societyId });
  if (count > 0) return;
  await ExpenseCategory.insertMany(
    DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
      societyId,
      name,
      isDefault: true,
      isActive: true,
    }))
  );
};

export const listCategories = async (societyId: string) => {
  await ensureDefaultCategories(societyId);
  return ExpenseCategory.find({ societyId }).sort({ isDefault: -1, name: 1 }).lean();
};

export const createCategory = async (
  societyId: string,
  input: { name?: string; isActive?: unknown }
) => {
  const name = (input.name || "").trim();
  if (!name) throw new ApiError(400, "Name is required");
  const exists = await ExpenseCategory.findOne({ societyId, name });
  if (exists) throw new ApiError(409, "Category already exists");
  return ExpenseCategory.create({
    societyId,
    name,
    isDefault: false,
    isActive: input.isActive === undefined ? true : parseBool(input.isActive),
  });
};

export const updateCategory = async (
  societyId: string,
  id: string,
  input: { name?: string; isActive?: unknown }
) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid category id");
  const category = await ExpenseCategory.findOne({ _id: id, societyId });
  if (!category) throw new ApiError(404, "Category not found");

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) throw new ApiError(400, "Name is required");
    const dup = await ExpenseCategory.findOne({ societyId, name, _id: { $ne: id } });
    if (dup) throw new ApiError(409, "Category already exists");
    category.name = name;
  }
  if (input.isActive !== undefined) category.isActive = parseBool(input.isActive);

  await category.save();
  return category;
};

export const deleteCategory = async (societyId: string, id: string) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid category id");
  const category = await ExpenseCategory.findOne({ _id: id, societyId });
  if (!category) throw new ApiError(404, "Category not found");

  const used = await Expense.countDocuments({ societyId, categoryId: id });
  if (used > 0) {
    throw new ApiError(409, `Category is used by ${used} expense(s). Deactivate it instead.`);
  }
  await category.deleteOne();
  return { id };
};

// ---------- Expenses ----------

export interface ExpenseListOptions {
  from?: string;
  to?: string;
  categoryId?: string;
  mode?: string;
  search?: string;
  petty?: boolean;
  status?: string;
  page: number;
  limit: number;
}

const buildExpenseFilter = (societyId: string, opts: ExpenseListOptions): Record<string, any> => {
  const filter: Record<string, any> = { societyId };
  if (opts.status) filter.status = opts.status;
  if (opts.categoryId) {
    if (!mongoose.isValidObjectId(opts.categoryId)) throw new ApiError(400, "Invalid categoryId");
    filter.categoryId = opts.categoryId;
  }
  if (opts.mode) filter.paymentMode = opts.mode;
  if (opts.petty !== undefined) filter.isPettyCash = opts.petty;
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
    filter.$or = [{ title: regex }, { paidTo: regex }, { referenceNo: regex }, { billNo: regex }, { voucherNo: regex }];
  }
  return filter;
};

export const listExpenses = async (societyId: string, opts: ExpenseListOptions) => {
  const filter = buildExpenseFilter(societyId, opts);

  const [items, total, rows] = await Promise.all([
    Expense.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((opts.page - 1) * opts.limit)
      .limit(opts.limit)
      .populate("categoryId", "name")
      .lean(),
    Expense.countDocuments(filter),
    Expense.find(filter).select("amount status").lean(),
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

export interface ExpenseInput {
  date?: string;
  categoryId: string;
  title: string;
  description?: string;
  amount: number | string;
  paidTo?: string;
  paymentMode: PaymentMode;
  referenceNo?: string;
  billNo?: string;
  isPettyCash?: boolean | string;
  approvedBy?: string;
  attachment?: string;
}

const assertCategory = async (societyId: string, categoryId: string) => {
  if (!mongoose.isValidObjectId(categoryId)) throw new ApiError(400, "Invalid categoryId");
  const category = await ExpenseCategory.findOne({ _id: categoryId, societyId }).select("_id");
  if (!category) throw new ApiError(404, "Category not found");
};

export const createExpense = async (
  societyId: string,
  input: ExpenseInput,
  adminName: string
): Promise<IExpense> => {
  await assertCategory(societyId, input.categoryId);

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, "Amount must be greater than zero");

  const date = input.date ? new Date(input.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new ApiError(400, "Invalid date");

  const mode = input.paymentMode as PaymentMode;
  if (!["cash", "upi", "cheque", "bank_transfer", "card", "other"].includes(mode)) {
    throw new ApiError(400, "Invalid payment mode");
  }

  const year = financialYearOf(date);
  const seq = await nextSeq(societyId, `expense:${year}`);
  const voucherNo = `EXP/${financialYearLabel(year)}/${String(seq).padStart(4, "0")}`;

  return Expense.create({
    societyId,
    date,
    categoryId: input.categoryId,
    title: input.title.trim(),
    description: input.description,
    amount: round(amount),
    paidTo: input.paidTo,
    paymentMode: mode,
    referenceNo: input.referenceNo,
    billNo: input.billNo,
    isPettyCash: parseBool(input.isPettyCash),
    attachment: input.attachment,
    voucherNo,
    approvedBy: input.approvedBy,
    status: "active",
    createdBy: adminName,
  });
};

export const updateExpense = async (
  societyId: string,
  id: string,
  input: Partial<ExpenseInput>
): Promise<IExpense> => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid expense id");
  const expense = await Expense.findOne({ _id: id, societyId });
  if (!expense) throw new ApiError(404, "Expense not found");

  if (input.categoryId !== undefined) {
    await assertCategory(societyId, input.categoryId);
    expense.categoryId = new mongoose.Types.ObjectId(input.categoryId);
  }
  if (input.date !== undefined) {
    const date = new Date(input.date);
    if (Number.isNaN(date.getTime())) throw new ApiError(400, "Invalid date");
    expense.date = date;
  }
  if (input.title !== undefined) {
    const title = String(input.title).trim();
    if (!title) throw new ApiError(400, "Title is required");
    expense.title = title;
  }
  if (input.amount !== undefined) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, "Amount must be greater than zero");
    expense.amount = round(amount);
  }
  if (input.paymentMode !== undefined) {
    const mode = input.paymentMode as PaymentMode;
    if (!["cash", "upi", "cheque", "bank_transfer", "card", "other"].includes(mode)) {
      throw new ApiError(400, "Invalid payment mode");
    }
    expense.paymentMode = mode;
  }
  if (input.description !== undefined) expense.description = input.description;
  if (input.paidTo !== undefined) expense.paidTo = input.paidTo;
  if (input.referenceNo !== undefined) expense.referenceNo = input.referenceNo;
  if (input.billNo !== undefined) expense.billNo = input.billNo;
  if (input.isPettyCash !== undefined) expense.isPettyCash = parseBool(input.isPettyCash);
  if (input.approvedBy !== undefined) expense.approvedBy = input.approvedBy;

  if (input.attachment) {
    if (expense.attachment) deletePrivateFile("expenses", expense.attachment);
    expense.attachment = input.attachment;
  }

  await expense.save();
  return expense;
};

export const cancelExpense = async (
  societyId: string,
  id: string,
  reason: string,
  adminName: string
): Promise<IExpense> => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid expense id");
  if (!reason || !reason.trim()) throw new ApiError(400, "Reason is required");

  const expense = await Expense.findOne({ _id: id, societyId });
  if (!expense) throw new ApiError(404, "Expense not found");
  if (expense.status === "cancelled") throw new ApiError(400, "Expense already cancelled");

  expense.status = "cancelled";
  expense.cancelReason = reason.trim();
  expense.cancelledAt = new Date();
  expense.cancelledBy = adminName;
  await expense.save();
  return expense;
};

export const getExpense = async (societyId: string, id: string): Promise<IExpense> => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid expense id");
  const expense = await Expense.findOne({ _id: id, societyId }).populate("categoryId", "name");
  if (!expense) throw new ApiError(404, "Expense not found");
  return expense;
};