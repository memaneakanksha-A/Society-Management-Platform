import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import {
  getOpeningBalance,
  updateOpeningBalance,
  incomeExpenseReport,
  expensesSummary,
  resolveReportYear,
} from "../../services/finance.service";

export const getOpeningBalanceHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const year = resolveReportYear(
    req.query.year ? Number(req.query.year) : undefined
  );
  const balance = await getOpeningBalance(societyId, year);
  res.json({ success: true, ...balance });
});

export const updateOpeningBalanceHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const body = req.body as Record<string, any>;
  const year = Number(body.year ?? req.query.year);
  if (!Number.isFinite(year)) throw new ApiError(400, "year is required");

  const setting = await updateOpeningBalance(societyId, year, {
    openingCash: body.openingCash,
    openingBank: body.openingBank,
  });
  res.json({ success: true, setting });
});

export const incomeExpenseReportHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const report = await incomeExpenseReport(societyId, {
    year: q.year ? Number(q.year) : undefined,
    from: q.from,
    to: q.to,
    period: q.period as any,
    month: q.month ? Number(q.month) : undefined,
    quarter: q.quarter ? Number(q.quarter) : undefined,
  });
  res.json({ success: true, report });
});

export const expensesSummaryHandler = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const summary = await expensesSummary(societyId, {
    from: q.from,
    to: q.to,
    year: q.year ? Number(q.year) : undefined,
    period: q.period as any,
    month: q.month ? Number(q.month) : undefined,
    quarter: q.quarter ? Number(q.quarter) : undefined,
  });
  res.json({ success: true, summary });
});