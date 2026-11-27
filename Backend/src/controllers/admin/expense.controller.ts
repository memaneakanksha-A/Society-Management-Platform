import { Request, Response } from "express";
import fs from "fs";
import Society from "../../models/Society";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { uploadToPrivate, deletePrivateFile, getPrivateFilePath } from "../../config/multer";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listExpenses,
  createExpense,
  updateExpense,
  cancelExpense,
  getExpense,
} from "../../services/expense.service";
import { buildVoucherBuffer, VoucherData } from "../../services/receipt.service";
import { financialYearLabel } from "../../services/maintenance.service";

const adminName = (req: Request): string => (req as any).user?.name || "Admin";

const financialYearOf = (date: Date): number => {
  const month = date.getMonth();
  return month >= 3 ? date.getFullYear() : date.getFullYear() - 1;
};

const expenseUpload = uploadToPrivate("expenses").single("attachment");

// ---------- Categories ----------

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const categories = await listCategories(societyId);
  res.json({ success: true, categories });
});

export const createCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const category = await createCategory(societyId, req.body as any);
  res.status(201).json({ success: true, category });
});

export const updateCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const category = await updateCategory(societyId, String(req.params.id), req.body as any);
  res.json({ success: true, category });
});

export const deleteCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const result = await deleteCategory(societyId, String(req.params.id));
  res.json({ success: true, ...result });
});

// ---------- Expenses ----------

export const getExpenses = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const result = await listExpenses(societyId, {
    from: q.from,
    to: q.to,
    categoryId: q.categoryId,
    mode: q.mode,
    search: q.search,
    petty: q.petty === "true" ? true : q.petty === "false" ? false : undefined,
    status: q.status,
    page,
    limit,
  });

  res.json({
    success: true,
    expenses: result.items,
    total: result.total,
    page: result.page,
    pages: result.pages,
    totals: result.totals,
  });
});

export const createExpenseHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const file = req.file as Express.Multer.File | undefined;
  const body = req.body as Record<string, any>;

  try {
    const expense = await createExpense(
      societyId,
      {
        date: body.date,
        categoryId: body.categoryId,
        title: body.title,
        description: body.description,
        amount: body.amount,
        paidTo: body.paidTo,
        paymentMode: body.paymentMode,
        referenceNo: body.referenceNo,
        billNo: body.billNo,
        isPettyCash: body.isPettyCash,
        approvedBy: body.approvedBy,
        attachment: file?.filename,
      },
      adminName(req)
    );
    res.status(201).json({ success: true, expense });
  } catch (err) {
    if (file) deletePrivateFile("expenses", file.filename);
    throw err;
  }
});

export const updateExpenseHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const file = req.file as Express.Multer.File | undefined;
  const body = req.body as Record<string, any>;

  try {
    const expense = await updateExpense(societyId, String(req.params.id), {
      date: body.date,
      categoryId: body.categoryId,
      title: body.title,
      description: body.description,
      amount: body.amount,
      paidTo: body.paidTo,
      paymentMode: body.paymentMode,
      referenceNo: body.referenceNo,
      billNo: body.billNo,
      isPettyCash: body.isPettyCash,
      approvedBy: body.approvedBy,
      attachment: file?.filename,
    });
    res.json({ success: true, expense });
  } catch (err) {
    if (file) deletePrivateFile("expenses", file.filename);
    throw err;
  }
});

export const cancelExpenseHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const expense = await cancelExpense(
    societyId,
    String(req.params.id),
    (req.body as any).reason,
    adminName(req)
  );
  res.json({ success: true, expense });
});

export const getExpenseAttachment = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const expense = await getExpense(societyId, String(req.params.id));
  if (!expense.attachment) throw new ApiError(404, "Attachment not found");

  const filePath = getPrivateFilePath("expenses", expense.attachment);
  if (!fs.existsSync(filePath)) throw new ApiError(404, "File not found on disk");

  res.sendFile(filePath);
});

export const getExpenseVoucher = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const expense = await getExpense(societyId, String(req.params.id));
  const society = await Society.findById(societyId).lean();

  const fy = financialYearOf(new Date(expense.date));
  const category = (expense.categoryId as any)?.name || "Expense";

  const modeLabels: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    cheque: "Cheque",
    bank_transfer: "Bank Transfer",
    card: "Card",
    other: "Other",
  };

  const data: VoucherData = {
    societyName: society?.name || "Society",
    societyAddress: society?.address,
    societyPhone: society?.contact?.phone,
    societyEmail: society?.contact?.email,
    societyLogoPath: society?.logo,
    voucherNo: expense.voucherNo,
    date: new Date(expense.date),
    financialYear: financialYearLabel(fy),
    paidTo: expense.paidTo,
    category,
    title: expense.title,
    description: expense.description,
    amount: expense.amount,
    mode: modeLabels[expense.paymentMode] || expense.paymentMode,
    referenceNo: expense.referenceNo,
    billNo: expense.billNo,
    isPettyCash: expense.isPettyCash,
    cancelled: expense.status === "cancelled",
    preparedBy: expense.createdBy || adminName(req),
    approvedBy: expense.approvedBy,
  };

  const buffer = await buildVoucherBuffer(data);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${expense.voucherNo.replace(/\//g, "-")}.pdf"`
  );
  res.send(buffer);
});

export { expenseUpload };