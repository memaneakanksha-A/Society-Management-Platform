import { Request, Response } from "express";
import mongoose from "mongoose";
import MaintenanceConfig from "../../models/MaintenanceConfig";
import House from "../../models/House";
import HouseType from "../../models/HouseType";
import Owner from "../../models/Owner";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import {
  generateDues,
  listDues,
  waiveLateFee,
  getHouseLedger,
  getHouseLedgerAll,
  financialYearLabel,
} from "../../services/maintenance.service";

const adminName = (req: Request): string => (req as any).user?.name || "Admin";

export const getConfig = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const year = parseInt((req.query.year as string) || `${new Date().getFullYear()}`, 10);
  const config = await MaintenanceConfig.findOne({ societyId, year }).lean();
  res.json({ success: true, config });
});

export const updateConfig = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const body = req.body as Record<string, any>;

  const year = Number(body.year);
  if (!Number.isFinite(year)) throw new ApiError(400, "year is required");
  const frequency = body.frequency;
  if (!["yearly", "monthly", "quarterly"].includes(frequency)) {
    throw new ApiError(400, "frequency must be yearly, monthly or quarterly");
  }
  if (frequency === "monthly" && body.dueDay !== undefined) {
    const d = Number(body.dueDay);
    if (d < 1 || d > 28) throw new ApiError(400, "dueDay must be between 1 and 28");
  }

  const amounts = Array.isArray(body.amounts)
    ? body.amounts.map((a: any) => {
        if (!mongoose.isValidObjectId(a.houseTypeId)) throw new ApiError(400, "Invalid houseTypeId in amounts");
        return { houseTypeId: new mongoose.Types.ObjectId(a.houseTypeId), amount: Number(a.amount) || 0 };
      })
    : [];

  const lf = body.lateFee || {};
  const lateFee = {
    enabled: lf.enabled === true || lf.enabled === "true",
    type: lf.type === "percent" ? "percent" : "flat",
    value: Number(lf.value) || 0,
    graceDays: Number(lf.graceDays) || 0,
    repeat: lf.repeat === "monthly" ? "monthly" : "once",
  };

  const update: Record<string, any> = {
    year,
    frequency,
    amounts,
    lateFee,
  };
  if (body.dueDay !== undefined) update.dueDay = Number(body.dueDay);
  if (body.dueDate !== undefined) update.dueDate = body.dueDate;
  if (body.shareAmountPerHouse !== undefined && body.shareAmountPerHouse !== "")
    update.shareAmountPerHouse = Number(body.shareAmountPerHouse);

  const config = await MaintenanceConfig.findOneAndUpdate(
    { societyId, year },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, config });
});

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const year = Number((req.body as any).year);
  if (!Number.isFinite(year)) throw new ApiError(400, "year is required");
  const result = await generateDues(societyId, year);
  res.json({ success: true, ...result });
});

export const dues = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);
  const result = await listDues(societyId, {
    year: q.year ? Number(q.year) : undefined,
    status: q.status,
    typeId: q.typeId,
    houseId: q.houseId,
    search: q.search,
    month: q.month === "all" || q.month === undefined ? "all" : Number(q.month),
    scope: q.scope,
    page,
    limit,
  });
  res.json({
    success: true,
    dues: result.items,
    total: result.total,
    page: result.page,
    pages: result.pages,
    summary: result.summary,
  });
});

export const waive = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const due = await waiveLateFee(societyId, String(req.params.id), (req.body as any).reason, adminName(req));
  res.json({ success: true, due });
});

export const houseLedger = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const year = (req.query.year as string) ? Number(req.query.year) : undefined;
  const ledger = await getHouseLedger(societyId, String(req.params.houseId), year);
  res.json({ success: true, ...ledger, financialYear: year ? financialYearLabel(year) : undefined });
});

export const houseLedgerAll = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const ledger = await getHouseLedgerAll(societyId, String(req.params.houseId));
  res.json({ success: true, ...ledger });
});

export const houseSummary = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const houseId = req.params.houseId;
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");
  const [house, owner] = await Promise.all([
    House.findOne({ _id: houseId, societyId }).populate("houseTypeId", "code name").lean(),
    Owner.findOne({ societyId, houseId, isCurrent: true }).select("name").lean(),
  ]);
  if (!house) throw new ApiError(404, "House not found");
  res.json({ success: true, house, owner });
});

export const houseTypesLite = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const types = await HouseType.find({ societyId }).select("_id code name").lean();
  res.json({ success: true, houseTypes: types });
});