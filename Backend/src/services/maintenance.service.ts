import mongoose from "mongoose";
import MaintenanceConfig, {
  IMaintenanceConfig,
  ILateFeeConfig,
} from "../models/MaintenanceConfig";
import MaintenanceDue, { IMaintenanceDue, PeriodType } from "../models/MaintenanceDue";
import House from "../models/House";
import HouseType from "../models/HouseType";
import Payment from "../models/Payment";
import { ApiError } from "../utils/ApiError";

export const financialYearLabel = (year: number): string =>
  `${year}-${String((year + 1) % 100).padStart(2, "0")}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Financial year starts in April (month index 3)
const periodMonth = (year: number, periodNo: number): { month: number; year: number } => {
  const zeroBased = 3 + (periodNo - 1); // periodNo 1 => April
  return { month: zeroBased % 12, year: year + Math.floor(zeroBased / 12) };
};

const buildDueDate = (year: number, month: number, dueDay: number): Date =>
  new Date(year, month, dueDay, 0, 0, 0, 0);

export interface GenerateResult {
  created: number;
  skipped: number;
  skippedHouses: string[];
  advanceApplied: number;
}

const amountForHouse = (config: IMaintenanceConfig, houseTypeId: string): number | undefined => {
  const match = config.amounts.find((a) => String(a.houseTypeId) === String(houseTypeId));
  return match ? match.amount : undefined;
};

const buildPeriods = (config: IMaintenanceConfig): Array<{
  periodType: PeriodType;
  periodNo: number;
  periodLabel: string;
  dueDate: Date;
}> => {
  const year = config.year;
  if (config.frequency === "yearly") {
    const dueDate = config.dueDate
      ? new Date(config.dueDate)
      : buildDueDate(year, 3, 1);
    return [
      {
        periodType: "yearly",
        periodNo: 0,
        periodLabel: `FY ${financialYearLabel(year)}`,
        dueDate,
      },
    ];
  }
  if (config.frequency === "quarterly") {
    const dueDay = config.dueDay || 1;
    const quarters = [
      { label: "Apr-Jun", start: 1 },
      { label: "Jul-Sep", start: 4 },
      { label: "Oct-Dec", start: 7 },
      { label: "Jan-Mar", start: 10 },
    ];
    return quarters.map((q, idx) => {
      const { month, year: y } = periodMonth(year, q.start);
      return {
        periodType: "quarterly" as PeriodType,
        periodNo: idx + 1,
        periodLabel: `Q${idx + 1} (${q.label} ${y})`,
        dueDate: buildDueDate(y, month, dueDay),
      };
    });
  }
  // monthly
  const dueDay = config.dueDay || 1;
  return Array.from({ length: 12 }, (_, i) => {
    const periodNo = i + 1;
    const { month, year: y } = periodMonth(year, periodNo);
    return {
      periodType: "monthly" as PeriodType,
      periodNo,
      periodLabel: `${MONTHS[month]} ${y}`,
      dueDate: buildDueDate(y, month, dueDay),
    };
  });
};

export const computeLateFee = (
  due: { amount: number; paidPrincipal: number; dueDate: Date | string },
  lateFee: ILateFeeConfig,
  asOfDate: Date = new Date()
): number => {
  if (!lateFee || !lateFee.enabled) return 0;
  const unpaid = due.amount - due.paidPrincipal;
  if (unpaid <= 0) return 0;

  const dueDate = new Date(due.dueDate);
  const graceEnd = new Date(dueDate.getTime() + (lateFee.graceDays || 0) * 24 * 60 * 60 * 1000);
  if (asOfDate.getTime() < graceEnd.getTime()) return 0;

  const base =
    lateFee.type === "percent"
      ? (unpaid * (lateFee.value || 0)) / 100
      : lateFee.value || 0;

  let fee = base;
  if (lateFee.repeat === "monthly") {
    const monthsLate = Math.max(
      1,
      Math.ceil((asOfDate.getTime() - graceEnd.getTime()) / (1000 * 60 * 60 * 24 * 30))
    );
    fee = base * monthsLate;
  }
  return Math.round(fee * 100) / 100;
};

export const getConfig = async (societyId: string, year: number): Promise<IMaintenanceConfig> => {
  const config = await MaintenanceConfig.findOne({ societyId, year });
  if (!config) throw new ApiError(404, `No maintenance configuration for year ${year}`);
  return config;
};

export const generateDues = async (societyId: string, year: number): Promise<GenerateResult> => {
  const config = await getConfig(societyId, year);
  const periods = buildPeriods(config);

  const [houses, houseTypes] = await Promise.all([
    House.find({ societyId }).select("_id houseNo houseTypeId"),
    HouseType.find({ societyId }).select("_id"),
  ]);
  const validTypeIds = new Set(houseTypes.map((t) => String(t._id)));

  const existing = await MaintenanceDue.find({ societyId, year }).select(
    "houseId periodType periodNo"
  );
  const existingKey = new Set(
    existing.map((d) => `${d.houseId}-${d.periodType}-${d.periodNo}`)
  );

  let created = 0;
  let skipped = 0;
  const skippedHouses: string[] = [];
  let advanceApplied = 0;

  for (const house of houses) {
    const typeId = String(house.houseTypeId);
    if (!validTypeIds.has(typeId)) {
      skipped++;
      skippedHouses.push(house.houseNo);
      continue;
    }
    const amount = amountForHouse(config, typeId);
    if (amount === undefined) {
      skipped++;
      skippedHouses.push(house.houseNo);
      continue;
    }

    const newDues: IMaintenanceDue[] = [];
    for (const p of periods) {
      const key = `${house._id}-${p.periodType}-${p.periodNo}`;
      if (existingKey.has(key)) continue;
      newDues.push({
        societyId: new mongoose.Types.ObjectId(societyId),
        houseId: house._id,
        year,
        periodType: p.periodType,
        periodNo: p.periodNo,
        periodLabel: p.periodLabel,
        amount,
        dueDate: p.dueDate,
        paidPrincipal: 0,
        lateFeePaid: 0,
        lateFeeWaived: 0,
        status: "pending",
      } as IMaintenanceDue);
    }

    if (newDues.length === 0) continue;

    const inserted = await MaintenanceDue.insertMany(newDues as any);
    created += inserted.length;

    // Apply existing advance credit to the new dues (oldest first)
    advanceApplied += await applyAdvance(societyId, String(house._id), inserted as any);
  }

  return { created, skipped, skippedHouses, advanceApplied };
};

// Consume a house's advance credit (unallocated of active payments) against dues.
export const applyAdvance = async (
  societyId: string,
  houseId: string,
  dues: any[]
): Promise<number> => {
  let remaining = dues.reduce((s, d) => s + (d.amount - d.paidPrincipal), 0);
  if (remaining <= 0) return 0;

  const advances = await Payment.find({
    societyId,
    houseId,
    status: "active",
    isAdvance: true,
    unallocated: { $gt: 0 },
  })
    .sort({ paidOn: 1 })
    .select("_id unallocated");

  let appliedTotal = 0;
  for (const adv of advances) {
    if (remaining <= 0) break;
    let credit = adv.unallocated;
    if (credit <= 0) continue;

    for (const due of dues) {
      if (remaining <= 0 || credit <= 0) break;
      const outstanding = due.amount - due.paidPrincipal;
      if (outstanding <= 0) continue;
      const use = Math.min(outstanding, credit);
      due.paidPrincipal += use;
      due.status = due.paidPrincipal >= due.amount ? "paid" : "partial";
      credit -= use;
      remaining -= use;
      appliedTotal += use;
      adv.unallocated -= use;
      (adv as any).allocations.push({
        dueId: due._id,
        principal: use,
        lateFee: 0,
        paidOn: new Date(),
      });
      await adv.save();
      await due.save();
    }
  }
  return appliedTotal;
};

export const waiveLateFee = async (
  societyId: string,
  dueId: string,
  reason: string,
  adminName: string
): Promise<IMaintenanceDue> => {
  if (!mongoose.isValidObjectId(dueId)) throw new ApiError(400, "Invalid due id");
  const due = await MaintenanceDue.findOne({ _id: dueId, societyId });
  if (!due) throw new ApiError(404, "Due not found");
  if (!reason || !reason.trim()) throw new ApiError(400, "Reason is required");

  const config = await MaintenanceConfig.findOne({ societyId, year: due.year });
  const lateFee = config ? computeLateFee(due, config.lateFee) : 0;
  if (lateFee <= 0) throw new ApiError(400, "No late fee to waive on this due");

  due.lateFeeWaived += lateFee;
  due.waiveReason = reason.trim();
  due.waivedAt = new Date();
  due.waivedBy = adminName;
  await due.save();
  return due;
};

export interface EnrichedDue {
  due: IMaintenanceDue;
  houseNo: string;
  ownerName: string | null;
  lateFee: number;
  outstanding: number;
}

export const listDues = async (
  societyId: string,
  opts: {
    year?: number;
    status?: string;
    typeId?: string;
    houseId?: string;
    search?: string;
    month?: number | "all";
    scope?: string;
    page: number;
    limit: number;
  }
): Promise<{
  items: EnrichedDue[];
  total: number;
  page: number;
  pages: number;
  summary: { totalBilled: number; collected: number; pending: number; lateFee: number };
}> => {
  const filter: Record<string, any> = { societyId };
  if (opts.year) filter.year = opts.year;
  if (opts.status) filter.status = opts.status;
  if (opts.houseId) {
    if (!mongoose.isValidObjectId(opts.houseId)) throw new ApiError(400, "Invalid houseId");
    filter.houseId = opts.houseId;
  }

  // Calendar month -> monthly periodNo (Apr=1 ... Mar=12)
  if (typeof opts.month === "number" && opts.month >= 1 && opts.month <= 12) {
    const periodNo = (((opts.month - 4 + 12) % 12) + 1);
    filter.periodType = "monthly";
    filter.periodNo = periodNo;
  }

  // Overdue: pending/partial whose dueDate is before the first of the current month
  if (opts.scope === "overdue") {
    const now = new Date();
    const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    filter.status = { $in: ["pending", "partial"] };
    filter.dueDate = { $lt: firstOfCurrentMonth };
  }

  if (opts.search) {
    const regex = new RegExp(opts.search, "i");
    const owners = await mongoose.model("Owner").find({ societyId, name: regex }).select("houseId");
    const ownerHouseIds = owners.map((o: any) => o.houseId);
    filter.$or = [{ periodLabel: regex }];
    if (ownerHouseIds.length) filter.$or.push({ houseId: { $in: ownerHouseIds } });
  }

  const [dues, total] = await Promise.all([
    MaintenanceDue.find(filter)
      .sort({ dueDate: 1 })
      .skip((opts.page - 1) * opts.limit)
      .limit(opts.limit)
      .populate("houseId", "houseNo houseTypeId")
      .lean(),
    MaintenanceDue.countDocuments(filter),
  ]);

  let typeIdFilter: string | undefined;
  if (opts.typeId) {
    if (!mongoose.isValidObjectId(opts.typeId)) throw new ApiError(400, "Invalid typeId");
    typeIdFilter = opts.typeId;
  }

  const config = opts.year
    ? await MaintenanceConfig.findOne({ societyId, year: opts.year }).lean()
    : await MaintenanceConfig.findOne({ societyId, year: dues[0]?.year }).lean();

  const houseIds = dues.map((d: any) => d.houseId?._id).filter(Boolean);
  const owners = houseIds.length
    ? await mongoose.model("Owner").find({ societyId, houseId: { $in: houseIds }, isCurrent: true }).select("houseId name")
    : [];
  const ownerMap = new Map<string, string>();
  owners.forEach((o: any) => ownerMap.set(String(o.houseId), o.name));

  const items: EnrichedDue[] = dues
    .filter((d: any) => !typeIdFilter || String(d.houseId?.houseTypeId) === typeIdFilter)
    .map((d: any) => {
      const lateFee = config ? computeLateFee(d, config.lateFee) : 0;
      const outstanding = d.amount - d.paidPrincipal + lateFee;
      return {
        due: d,
        houseNo: d.houseId?.houseNo || "-",
        ownerName: ownerMap.get(String(d.houseId?._id)) || null,
        lateFee,
        outstanding: Math.round(outstanding * 100) / 100,
      };
    });

  const summaryFilter: Record<string, any> = { ...filter };
  if (!summaryFilter.status) summaryFilter.status = { $ne: "cancelled" };
  const [summaryAgg] = await MaintenanceDue.aggregate([
    { $match: summaryFilter },
    {
      $group: {
        _id: null,
        totalBilled: { $sum: "$amount" },
        collected: { $sum: "$paidPrincipal" },
        pending: { $sum: { $subtract: ["$amount", "$paidPrincipal"] } },
        lateFee: { $sum: "$lateFeePaid" },
      },
    },
  ]);

  const summary = {
    totalBilled: summaryAgg?.totalBilled || 0,
    collected: summaryAgg?.collected || 0,
    pending: summaryAgg?.pending || 0,
    lateFee: summaryAgg?.lateFee || 0,
  };

  return { items, total, page: opts.page, pages: Math.ceil(total / opts.limit), summary };
};

export const getHouseLedger = async (societyId: string, houseId: string, year?: number) => {
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");
  const dueFilter: Record<string, any> = { societyId, houseId };
  if (year) dueFilter.year = year;
  const payFilter: Record<string, any> = { societyId, houseId, status: "active" };
  if (year) {
    // payments in a FY: paidOn between Apr 1 year and Mar 31 year+1
    const start = new Date(year, 3, 1);
    const end = new Date(year + 1, 3, 1);
    payFilter.paidOn = { $gte: start, $lt: end };
  }

  const [dues, payments] = await Promise.all([
    MaintenanceDue.find(dueFilter).sort({ dueDate: 1 }).lean(),
    Payment.find(payFilter).sort({ paidOn: -1 }).lean(),
  ]);

  const totalDue = dues.reduce((s, d) => s + d.amount, 0);
  const totalPaid = dues.reduce((s, d) => s + d.paidPrincipal, 0);
  const outstanding = dues.reduce((s, d) => s + (d.amount - d.paidPrincipal), 0);
  const advanceCredit = payments.reduce((s, p) => s + (p.unallocated || 0), 0);

  return { dues, payments, summary: { totalDue, totalPaid, outstanding, advanceCredit } };
};

export const getHouseLedgerAll = async (societyId: string, houseId: string) => {
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");
  const dues = await MaintenanceDue.find({ societyId, houseId }).sort({ year: 1, dueDate: 1 }).lean();
  const years = [...new Set(dues.map((d) => d.year))];
  const perYear = await Promise.all(
    years.map(async (y) => {
      const yearDues = dues.filter((d) => d.year === y);
      const totalDue = yearDues.reduce((s, d) => s + d.amount, 0);
      const totalPaid = yearDues.reduce((s, d) => s + d.paidPrincipal, 0);
      return {
        year: y,
        totalDue,
        totalPaid,
        outstanding: totalDue - totalPaid,
      };
    })
  );
  return { years: perYear };
};

export const monthName = (m: number): string => FULL_MONTHS[m] || "";