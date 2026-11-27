import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  listIncomes,
  createIncome,
  updateIncome,
  cancelIncome,
} from "../../services/income.service";

const adminName = (req: Request): string => (req as any).user?.name || "Admin";

export const getIncomes = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const result = await listIncomes(societyId, {
    from: q.from,
    to: q.to,
    source: q.source,
    mode: q.mode,
    search: q.search,
    status: q.status,
    page,
    limit,
  });

  res.json({
    success: true,
    incomes: result.items,
    total: result.total,
    page: result.page,
    pages: result.pages,
    totals: result.totals,
  });
});

export const createIncomeHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const body = req.body as Record<string, any>;
  const income = await createIncome(
    societyId,
    {
      date: body.date,
      source: body.source,
      title: body.title,
      amount: body.amount,
      mode: body.mode,
      referenceNo: body.referenceNo,
      receivedFrom: body.receivedFrom,
      remarks: body.remarks,
    },
    adminName(req)
  );
  res.status(201).json({ success: true, income });
});

export const updateIncomeHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const body = req.body as Record<string, any>;
  const income = await updateIncome(societyId, String(req.params.id), {
    date: body.date,
    source: body.source,
    title: body.title,
    amount: body.amount,
    mode: body.mode,
    referenceNo: body.referenceNo,
    receivedFrom: body.receivedFrom,
    remarks: body.remarks,
  });
  res.json({ success: true, income });
});

export const cancelIncomeHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const income = await cancelIncome(
    societyId,
    String(req.params.id),
    (req.body as any).reason,
    adminName(req)
  );
  res.json({ success: true, income });
});