import mongoose from "mongoose";
import MaintenanceDue from "../models/MaintenanceDue";
import Payment from "../models/Payment";
import House from "../models/House";
import Owner from "../models/Owner";

export interface TopPayer {
  rank: number;
  houseId: string;
  houseNo: string;
  owner: string | null;
  score: number;
  paidOnTimeCount: number;
  advanceCount: number;
  lateCount: number;
}

export const getTopPayers = async (
  societyId: string,
  year: number,
  range?: { from: Date; to: Date }
): Promise<TopPayer[]> => {
  const start = range?.from || new Date(year, 3, 1);
  const end = range?.to || new Date(year + 1, 3, 1);

  const [dues, payments, houses] = await Promise.all([
    MaintenanceDue.find({
      societyId,
      year,
      dueDate: { $gte: start, $lt: end },
    }).select("_id houseId dueDate status paidPrincipal amount").lean(),
    Payment.find({ societyId, status: "active", paidOn: { $gte: start, $lt: end } })
      .select("houseId isAdvance allocations")
      .lean(),
    House.find({ societyId }).select("_id houseNo").lean(),
  ]);

  // Map dueId -> { paidOn, isAdvance }
  const allocMap = new Map<string, { paidOn: Date; isAdvance: boolean }>();
  for (const p of payments as any[]) {
    for (const a of p.allocations || []) {
      allocMap.set(String(a.dueId), { paidOn: a.paidOn, isAdvance: !!p.isAdvance });
    }
  }

  const houseNoMap = new Map<string, string>();
  houses.forEach((h: any) => houseNoMap.set(String(h._id), h.houseNo));

  const ownerRows = await Owner.find({ societyId, isCurrent: true }).select("houseId name").lean();
  const ownerMap = new Map<string, string>();
  (ownerRows as any[]).forEach((o) => ownerMap.set(String(o.houseId), o.name));

  const stats = new Map<
    string,
    { score: number; paidOnTimeCount: number; advanceCount: number; lateCount: number }
  >();

  for (const due of dues as any[]) {
    const key = String(due.houseId);
    if (!stats.has(key)) stats.set(key, { score: 0, paidOnTimeCount: 0, advanceCount: 0, lateCount: 0 });
    const s = stats.get(key)!;
    const alloc = allocMap.get(String(due._id));

    if (!alloc) {
      // pending -> 0
      continue;
    }
    if (alloc.isAdvance) {
      s.score += 3;
      s.advanceCount += 1;
    } else if (new Date(alloc.paidOn).getTime() <= new Date(due.dueDate).getTime()) {
      s.score += 2;
      s.paidOnTimeCount += 1;
    } else {
      s.score += 1;
      s.lateCount += 1;
    }
  }

  const list: TopPayer[] = [];
  stats.forEach((s, houseId) => {
    list.push({
      rank: 0,
      houseId,
      houseNo: houseNoMap.get(houseId) || "-",
      owner: ownerMap.get(houseId) || null,
      score: s.score,
      paidOnTimeCount: s.paidOnTimeCount,
      advanceCount: s.advanceCount,
      lateCount: s.lateCount,
    });
  });

  list.sort((a, b) => b.score - a.score || a.houseNo.localeCompare(b.houseNo));
  list.forEach((p, i) => (p.rank = i + 1));
  return list;
};

export const topPayersHouseIds = async (societyId: string, year: number): Promise<string[]> => {
  const dues = await MaintenanceDue.find({ societyId, year }).select("houseId").lean();
  return [...new Set((dues as any[]).map((d) => String(d.houseId)))];
};

export const asObjectId = (id: string) => new mongoose.Types.ObjectId(id);