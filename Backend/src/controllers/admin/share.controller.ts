import { Request, Response } from "express";
import mongoose from "mongoose";
import ShareRecord from "../../models/ShareRecord";
import House from "../../models/House";
import HouseType from "../../models/HouseType";
import Owner from "../../models/Owner";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);

  const filter: Record<string, any> = { societyId };
  if (q.status) filter.status = q.status;
  if (q.search) {
    const regex = new RegExp(q.search, "i");
    const houses = await House.find({ societyId, houseNo: regex }).select("_id");
    const owners = await Owner.find({ societyId, name: regex }).select("houseId");
    const ownerHouseIds = owners.map((o: any) => o.houseId);
    filter.$or = [{ certificateNo: regex }];
    if (houses.length) filter.$or.push({ houseId: { $in: houses.map((h) => h._id) } });
    if (ownerHouseIds.length) filter.$or.push({ houseId: { $in: ownerHouseIds } });
  }

  const [shares, total, all] = await Promise.all([
    ShareRecord.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("houseId", "houseNo houseTypeId")
      .lean(),
    ShareRecord.countDocuments(filter),
    ShareRecord.find({ societyId }).select("totalAmount paidAmount status").lean(),
  ]);

  const houseIds = (shares as any[]).map((s) => s.houseId?._id).filter(Boolean);
  const typeIds = (shares as any[])
    .map((s) => s.houseId?.houseTypeId)
    .filter(Boolean);

  const [owners, types] = await Promise.all([
    houseIds.length
      ? Owner.find({ societyId, houseId: { $in: houseIds }, isCurrent: true })
          .select("houseId name phone")
          .lean()
      : Promise.resolve([]),
    typeIds.length
      ? HouseType.find({ _id: { $in: typeIds } }).select("code name").lean()
      : Promise.resolve([]),
  ]);

  const ownerMap = new Map<string, { name?: string; phone?: string }>();
  (owners as any[]).forEach((o) =>
    ownerMap.set(String(o.houseId), { name: o.name, phone: o.phone })
  );
  const typeMap = new Map<string, string>();
  (types as any[]).forEach((t) => typeMap.set(String(t._id), t.code));

  const items = (shares as any[]).map((s) => {
    const house = s.houseId || {};
    const owner = ownerMap.get(String(house._id)) || {};
    const totalAmount = s.totalAmount || 0;
    const paidAmount = s.paidAmount || 0;
    return {
      _id: s._id,
      houseId: house._id,
      houseNo: house.houseNo || "-",
      houseTypeCode: house.houseTypeId ? typeMap.get(String(house.houseTypeId)) || null : null,
      ownerName: owner.name || null,
      ownerPhone: owner.phone || null,
      totalAmount,
      paidAmount,
      pendingAmount: Math.max(0, totalAmount - paidAmount),
      status: s.status,
      certificateNo: s.certificateNo || null,
      issueDate: s.issueDate || null,
    };
  });

  const totalAmount = (all as any[]).reduce((s, r) => s + r.totalAmount, 0);
  const paid = (all as any[]).reduce((s, r) => s + r.paidAmount, 0);
  const counts = {
    total: all.length,
    paid: (all as any[]).filter((r) => r.status === "paid").length,
    pending: (all as any[]).filter((r) => r.status === "pending").length,
    partial: (all as any[]).filter((r) => r.status === "partial").length,
  };

  res.json({
    success: true,
    shares: items,
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: { totalAmount, paid, pending: totalAmount - paid, counts },
  });
});

export const getHouseShare = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const houseId = req.params.houseId;
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");

  const share = await ShareRecord.findOne({ societyId, houseId })
    .populate("houseId", "houseNo houseTypeId")
    .lean();
  if (!share) {
    res.json({ success: true, share: null });
    return;
  }

  const house = (share as any).houseId || {};
  let houseTypeCode: string | null = null;
  if (house.houseTypeId) {
    const type = await HouseType.findById(house.houseTypeId).select("code").lean();
    houseTypeCode = (type as any)?.code || null;
  }
  const owner = await Owner.findOne({ societyId, houseId, isCurrent: true })
    .select("name phone")
    .lean();

  const totalAmount = (share as any).totalAmount || 0;
  const paidAmount = (share as any).paidAmount || 0;

  res.json({
    success: true,
    share: {
      _id: (share as any)._id,
      houseId,
      houseNo: house.houseNo || "-",
      houseTypeCode,
      ownerName: (owner as any)?.name || null,
      ownerPhone: (owner as any)?.phone || null,
      totalAmount,
      paidAmount,
      pendingAmount: Math.max(0, totalAmount - paidAmount),
      status: (share as any).status,
      certificateNo: (share as any).certificateNo || null,
      issueDate: (share as any).issueDate || null,
    },
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const houseId = req.params.houseId;
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");

  const body = req.body as Record<string, any>;
  const share = await ShareRecord.findOne({ societyId, houseId });
  if (!share) throw new ApiError(404, "Share record not found for this house");

  if (body.totalAmount !== undefined) share.totalAmount = Number(body.totalAmount) || 0;
  if (body.certificateNo !== undefined) share.certificateNo = body.certificateNo;
  if (body.issueDate !== undefined) share.issueDate = body.issueDate ? new Date(body.issueDate) : undefined;
  if (body.remarks !== undefined) share.remarks = body.remarks;

  share.status =
    share.totalAmount > 0 && share.paidAmount >= share.totalAmount
      ? "paid"
      : share.paidAmount > 0
      ? "partial"
      : "pending";

  await share.save();
  res.json({ success: true, share });
});

export const bulkInit = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const amount = Number((req.body as any).amount);
  if (!Number.isFinite(amount) || amount < 0) throw new ApiError(400, "amount is required");

  const houses = await House.find({ societyId }).select("_id");
  const existing = await ShareRecord.find({ societyId }).select("houseId");
  const existingIds = new Set(existing.map((s) => String(s.houseId)));

  const toCreate = houses
    .filter((h) => !existingIds.has(String(h._id)))
    .map((h) => ({
      societyId,
      houseId: h._id,
      totalAmount: amount,
      paidAmount: 0,
      status: "pending" as const,
    }));

  if (toCreate.length) await ShareRecord.insertMany(toCreate as any);

  res.json({ success: true, created: toCreate.length, skipped: houses.length - toCreate.length });
});