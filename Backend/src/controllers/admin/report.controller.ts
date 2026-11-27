import { Request, Response } from "express";
import mongoose from "mongoose";
import MaintenanceDue from "../../models/MaintenanceDue";
import MaintenanceConfig from "../../models/MaintenanceConfig";
import Payment from "../../models/Payment";
import House from "../../models/House";
import HouseType from "../../models/HouseType";
import Owner from "../../models/Owner";
import { asyncHandler } from "../../utils/asyncHandler";
import { computeLateFee } from "../../services/maintenance.service";
import { getTopPayers } from "../../services/topPayers.service";
import { buildBreakdown, periodFromQuery, resolvePeriod } from "../../utils/period";

const inRange = (d: Date, from: Date, to: Date): boolean =>
  d.getTime() >= from.getTime() && d.getTime() < to.getTime();

export const pending = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const period = resolvePeriod(periodFromQuery(q));

  const filter: Record<string, any> = {
    societyId,
    status: { $in: ["pending", "partial"] },
    dueDate: { $lt: period.to },
  };

  const dues = await MaintenanceDue.find(filter)
    .sort({ dueDate: 1 })
    .populate("houseId", "houseNo")
    .lean();

  const config = await MaintenanceConfig.findOne({ societyId, year: period.year }).lean();
  const houseIds = dues.map((d: any) => d.houseId?._id).filter(Boolean);
  const owners = houseIds.length
    ? await Owner.find({ societyId, houseId: { $in: houseIds }, isCurrent: true }).select("houseId name phone").lean()
    : [];
  const ownerMap = new Map<string, any>();
  (owners as any[]).forEach((o) => ownerMap.set(String(o.houseId), o));

  const items = (dues as any[]).map((d) => {
    const lateFee = config ? computeLateFee(d, config.lateFee, period.to) : 0;
    return {
      due: d,
      houseNo: d.houseId?.houseNo || "-",
      owner: ownerMap.get(String(d.houseId?._id))?.name || null,
      phone: ownerMap.get(String(d.houseId?._id))?.phone || null,
      outstanding: Math.round((d.amount - d.paidPrincipal + lateFee) * 100) / 100,
      lateFee,
    };
  });

  const totalOutstanding = items.reduce((s, i) => s + i.outstanding, 0);

  const breakdown = buildBreakdown(periodFromQuery(q)).map((b) => {
    const bucketDues = (dues as any[]).filter((d) => inRange(new Date(d.dueDate), b.from, b.to));
    const count = bucketDues.length;
    const outstanding = bucketDues.reduce((s, d) => {
      const lateFee = config ? computeLateFee(d, config.lateFee, period.to) : 0;
      return s + (d.amount - d.paidPrincipal + lateFee);
    }, 0);
    return { label: b.label, from: b.from, to: b.to, count, totalOutstanding: Math.round(outstanding * 100) / 100 };
  });

  res.json({
    success: true,
    period,
    dues: items,
    total: items.length,
    summary: { count: items.length, totalOutstanding },
    breakdown,
  });
});

export const defaulters = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const period = resolvePeriod(periodFromQuery(q));
  const asOf = period.to;

  const dues = await MaintenanceDue.find({
    societyId,
    status: { $ne: "cancelled" },
    dueDate: { $lt: asOf },
  }).lean();
  const config = await MaintenanceConfig.findOne({ societyId, year: period.year }).lean();
  const graceDays = (config as any)?.lateFee?.graceDays || 0;
  const graceMs = graceDays * 24 * 60 * 60 * 1000;

  const byHouse = new Map<string, { principal: number; lateFee: number; overdue: number; oldest: Date }>();
  for (const d of dues as any[]) {
    const outstanding = d.amount - d.paidPrincipal;
    const lateFee = config ? computeLateFee(d, config.lateFee, asOf) : 0;
    if (outstanding <= 0 && lateFee <= 0) continue;
    const isOverdue = new Date(d.dueDate).getTime() + graceMs < asOf.getTime();
    const key = String(d.houseId);
    if (!byHouse.has(key)) byHouse.set(key, { principal: 0, lateFee: 0, overdue: 0, oldest: d.dueDate });
    const entry = byHouse.get(key)!;
    entry.principal += outstanding;
    entry.lateFee += lateFee;
    if (isOverdue) entry.overdue += 1;
    if (new Date(d.dueDate).getTime() < new Date(entry.oldest).getTime()) entry.oldest = d.dueDate;
  }

  const houseIds = [...byHouse.keys()];
  const [houses, owners] = await Promise.all([
    houseIds.length
      ? House.find({ societyId, _id: { $in: houseIds } }).select("_id houseNo").lean()
      : Promise.resolve([]),
    houseIds.length
      ? Owner.find({ societyId, houseId: { $in: houseIds }, isCurrent: true }).select("houseId name phone").lean()
      : Promise.resolve([]),
  ]);
  const houseNoMap = new Map<string, string>();
  (houses as any[]).forEach((h) => houseNoMap.set(String(h._id), h.houseNo));
  const ownerMap = new Map<string, any>();
  (owners as any[]).forEach((o) => ownerMap.set(String(o.houseId), o));

  const items = houseIds
    .map((houseId) => {
      const e = byHouse.get(houseId)!;
      return {
        houseId,
        houseNo: houseNoMap.get(houseId) || "-",
        owner: ownerMap.get(houseId)?.name || null,
        phone: ownerMap.get(houseId)?.phone || null,
        overduePeriods: e.overdue,
        principalPending: Math.round(e.principal * 100) / 100,
        lateFee: Math.round(e.lateFee * 100) / 100,
        oldestDueDate: e.oldest,
      };
    })
    .sort((a, b) => b.principalPending + b.lateFee - (a.principalPending + a.lateFee));

  const breakdown = buildBreakdown(periodFromQuery(q)).map((b) => {
    const bucketDues = (dues as any[]).filter((d) => inRange(new Date(d.dueDate), b.from, b.to));
    let principal = 0;
    let lateFee = 0;
    let count = 0;
    for (const d of bucketDues) {
      const out = d.amount - d.paidPrincipal;
      const lf = config ? computeLateFee(d, config.lateFee, asOf) : 0;
      if (out <= 0 && lf <= 0) continue;
      principal += out;
      lateFee += lf;
      count += 1;
    }
    return {
      label: b.label,
      from: b.from,
      to: b.to,
      count,
      principalPending: Math.round(principal * 100) / 100,
      lateFee: Math.round(lateFee * 100) / 100,
    };
  });

  res.json({ success: true, period, defaulters: items, total: items.length, breakdown });
});

export const collection = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const period = resolvePeriod(periodFromQuery(q));

  const payments = (await Payment.find({
    societyId,
    status: "active",
    paidOn: { $gte: period.from, $lt: period.to },
  })
    .populate("houseId", "houseTypeId")
    .lean()) as any[];

  const typeIds = [
    ...new Set(payments.map((p) => p.houseId?.houseTypeId).filter(Boolean).map((t: any) => String(t))),
  ];
  const types = typeIds.length
    ? await HouseType.find({ _id: { $in: typeIds } }).select("_id name").lean()
    : [];
  const typeNameMap = new Map<string, string>();
  (types as any[]).forEach((t) => typeNameMap.set(String(t._id), t.name));

  const summarize = (rows: any[]) => {
    const byMode: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let total = 0;
    for (const p of rows) {
      total += p.amount;
      byMode[p.mode] = (byMode[p.mode] || 0) + p.amount;
      const typeName = p.houseId?.houseTypeId
        ? typeNameMap.get(String(p.houseId.houseTypeId)) || "Unknown"
        : "Unknown";
      byType[typeName] = (byType[typeName] || 0) + p.amount;
    }
    return { total: Math.round(total * 100) / 100, byMode, byType, count: rows.length };
  };

  const summary = summarize(payments);
  const breakdown = buildBreakdown(periodFromQuery(q)).map((b) => ({
    label: b.label,
    from: b.from,
    to: b.to,
    ...summarize(payments.filter((p) => inRange(new Date(p.paidOn), b.from, b.to))),
  }));

  res.json({
    success: true,
    period,
    total: summary.total,
    byMode: summary.byMode,
    byType: summary.byType,
    count: summary.count,
    breakdown,
  });
});

export const topPayers = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const period = resolvePeriod(periodFromQuery(q));
  const list = await getTopPayers(societyId, period.year, { from: period.from, to: period.to });
  res.json({ success: true, period, topPayers: list, total: list.length });
});