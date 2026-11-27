import mongoose from "mongoose";
import Payment, { IPayment, PaymentMode, PaymentKind } from "../models/Payment";
import MaintenanceDue from "../models/MaintenanceDue";
import MaintenanceConfig from "../models/MaintenanceConfig";
import ShareRecord from "../models/ShareRecord";
import House from "../models/House";
import { nextSeq } from "../models/Counter";
import { ApiError } from "../utils/ApiError";
import { computeLateFee, financialYearLabel } from "./maintenance.service";

export interface PaymentInput {
  houseId: string;
  kind?: PaymentKind;
  amount: number;
  mode: PaymentMode;
  transactionId?: string;
  chequeNo?: string;
  chequeDate?: string;
  bankName?: string;
  paidOn?: string;
  paidBy: "owner" | "tenant";
  payerName?: string;
  payerPhone?: string;
  remarks?: string;
  dueIds?: string[];
}

const financialYearOf = (date: Date): number => {
  const month = date.getMonth(); // 0-based; April = 3
  return month >= 3 ? date.getFullYear() : date.getFullYear() - 1;
};

const receiptPrefix = (year: number): string => `RCT/${financialYearLabel(year)}`;

export const nextReceiptNo = async (societyId: string, year: number): Promise<string> => {
  const seq = await nextSeq(societyId, `receipt:${year}`);
  return `${receiptPrefix(year)}/${String(seq).padStart(4, "0")}`;
};

const validateModeFields = (input: PaymentInput) => {
  if (input.mode === "upi" || input.mode === "bank_transfer") {
    if (!input.transactionId || !input.transactionId.trim()) {
      throw new ApiError(400, `transactionId is required for ${input.mode} payments`);
    }
  }
  if (input.mode === "cheque") {
    if (!input.chequeNo || !input.chequeNo.trim()) throw new ApiError(400, "chequeNo is required for cheque payments");
    if (!input.bankName || !input.bankName.trim()) throw new ApiError(400, "bankName is required for cheque payments");
  }
};

interface AllocationResult {
  allocations: IPayment["allocations"];
  unallocated: number;
}

const allocateToDues = async (
  societyId: string,
  houseId: string,
  amount: number,
  dueIds: string[] | undefined,
  paidOn: Date
): Promise<AllocationResult> => {
  let remaining = amount;
  const allocations: IPayment["allocations"] = [];

  let dues: any[] = [];
  if (dueIds && dueIds.length) {
    const ids = dueIds.map((id) => {
      if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid due id");
      return id;
    });
    const matched = await MaintenanceDue.find({ _id: { $in: ids }, houseId, societyId }).sort({
      dueDate: 1,
    });
    const found = new Set(matched.map((d) => String(d._id)));
    const missing = ids.filter((id) => !found.has(String(id)));
    if (missing.length) {
      const labelDocs = await MaintenanceDue.find({ _id: { $in: missing }, societyId })
        .select("periodLabel")
        .lean();
      const labelMap = new Map(labelDocs.map((d: any) => [String(d._id), d.periodLabel]));
      const labels = missing.map((id) => labelMap.get(String(id)) || id);
      throw new ApiError(400, `Due(s) not found for this house: ${labels.join(", ")}`);
    }
    for (const d of matched) {
      if (d.status === "cancelled") {
        throw new ApiError(400, `Due ${d.periodLabel} is cancelled`);
      }
      const out = Math.max(0, d.amount - (d.paidPrincipal || 0));
      if (d.status === "paid" || out <= 0) {
        throw new ApiError(400, `Due ${d.periodLabel} is already paid`);
      }
    }
    dues = matched;
  } else {
    dues = await MaintenanceDue.find({ societyId, houseId, status: "pending" }).sort({ dueDate: 1 });
  }

  const configCache = new Map<number, any>();
  const getConfig = async (year: number) => {
    if (!configCache.has(year)) {
      configCache.set(year, await MaintenanceConfig.findOne({ societyId, year }).lean());
    }
    return configCache.get(year);
  };

  for (const due of dues) {
    if (remaining <= 0) break;
    const config = await getConfig(due.year);
    const lateFeeConfig = config?.lateFee;
    const computedLate = lateFeeConfig ? computeLateFee(due, lateFeeConfig, paidOn) : 0;
    const lateOutstanding = Math.max(0, computedLate - (due.lateFeePaid || 0) - (due.lateFeeWaived || 0));
    const principalOutstanding = Math.max(0, due.amount - (due.paidPrincipal || 0));

    let payLate = 0;
    let payPrincipal = 0;

    if (lateOutstanding > 0 && remaining > 0) {
      payLate = Math.min(lateOutstanding, remaining);
      remaining -= payLate;
    }
    if (principalOutstanding > 0 && remaining > 0) {
      payPrincipal = Math.min(principalOutstanding, remaining);
      remaining -= payPrincipal;
    }

    if (payLate > 0 || payPrincipal > 0) {
      due.paidPrincipal = (due.paidPrincipal || 0) + payPrincipal;
      due.lateFeePaid = (due.lateFeePaid || 0) + payLate;
      due.status = due.paidPrincipal >= due.amount ? "paid" : "partial";
      await due.save();
      allocations.push({
        dueId: due._id,
        principal: payPrincipal,
        lateFee: payLate,
        paidOn,
      });
    }
  }

  return { allocations, unallocated: Math.round(remaining * 100) / 100 };
};

export const recordPayment = async (
  societyId: string,
  input: PaymentInput,
  adminName: string
): Promise<IPayment> => {
  if (!mongoose.isValidObjectId(input.houseId)) throw new ApiError(400, "Invalid house id");
  const house = await House.findOne({ _id: input.houseId, societyId }).select("_id houseNo");
  if (!house) throw new ApiError(404, "House not found");

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, "Amount must be greater than zero");

  const mode = input.mode as PaymentMode;
  const kind = (input.kind || "maintenance") as PaymentKind;
  validateModeFields({ ...input, amount, mode });

  const paidOn = input.paidOn ? new Date(input.paidOn) : new Date();
  if (Number.isNaN(paidOn.getTime())) throw new ApiError(400, "Invalid paidOn date");

  // Share payments: validate against the share record and never allocate to dues.
  let share: any = null;
  if (kind === "share") {
    share = await ShareRecord.findOne({ societyId, houseId: input.houseId });
    if (!share) throw new ApiError(400, "Initialize shares first");
    const pending = Math.max(0, (share.totalAmount || 0) - (share.paidAmount || 0));
    if (amount > pending) {
      throw new ApiError(400, `Amount exceeds pending share of Rs ${pending}`);
    }
  }

  let allocations: IPayment["allocations"] = [];
  let unallocated = 0;
  if (kind !== "share") {
    const result = await allocateToDues(societyId, input.houseId, amount, input.dueIds, paidOn);
    allocations = result.allocations;
    unallocated = result.unallocated;
  }

  const year = financialYearOf(paidOn);
  const receiptNo = await nextReceiptNo(societyId, year);

  const payment = await Payment.create({
    societyId,
    houseId: input.houseId,
    kind,
    amount,
    mode,
    transactionId: input.transactionId,
    chequeNo: input.chequeNo,
    chequeDate: input.chequeDate ? new Date(input.chequeDate) : undefined,
    bankName: input.bankName,
    paidOn,
    paidBy: input.paidBy,
    payerName: input.payerName,
    payerPhone: input.payerPhone,
    receiptNo,
    allocations,
    unallocated,
    isAdvance: unallocated > 0,
    remarks: input.remarks,
    status: "active",
    createdBy: adminName,
  });

  // Share payment: update the share record for the house
  if (kind === "share" && share) {
    share.paidAmount = Math.min(share.totalAmount, (share.paidAmount || 0) + amount);
    share.status =
      share.paidAmount >= share.totalAmount ? "paid" : share.paidAmount > 0 ? "partial" : "pending";
    await share.save();
  }

  return payment;
};

export const cancelPayment = async (
  societyId: string,
  id: string,
  reason: string,
  adminName: string
): Promise<IPayment> => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid payment id");
  if (!reason || !reason.trim()) throw new ApiError(400, "Reason is required");

  const payment = await Payment.findOne({ _id: id, societyId });
  if (!payment) throw new ApiError(404, "Payment not found");
  if (payment.status === "cancelled") throw new ApiError(400, "Payment already cancelled");

  // Reverse allocations
  for (const alloc of payment.allocations) {
    const due = await MaintenanceDue.findOne({ _id: alloc.dueId, societyId });
    if (due) {
      due.paidPrincipal = Math.max(0, (due.paidPrincipal || 0) - alloc.principal);
      due.lateFeePaid = Math.max(0, (due.lateFeePaid || 0) - alloc.lateFee);
      due.status = due.paidPrincipal >= due.amount ? "paid" : due.paidPrincipal > 0 ? "partial" : "pending";
      await due.save();
    }
  }

  // Reverse share record
  if (payment.kind === "share") {
    const share = await ShareRecord.findOne({ societyId, houseId: payment.houseId });
    if (share) {
      share.paidAmount = Math.max(0, share.paidAmount - payment.amount);
      share.status =
        share.paidAmount >= share.totalAmount && share.totalAmount > 0
          ? "paid"
          : share.paidAmount > 0
          ? "partial"
          : "pending";
      await share.save();
    }
  }

  payment.status = "cancelled";
  payment.cancelReason = reason.trim();
  payment.cancelledAt = new Date();
  payment.cancelledBy = adminName;
  await payment.save();

  return payment;
};

export const listPayments = async (
  societyId: string,
  opts: {
    from?: string;
    to?: string;
    mode?: string;
    houseId?: string;
    kind?: string;
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }
) => {
  const filter: Record<string, any> = { societyId };
  if (opts.mode) filter.mode = opts.mode;
  if (opts.houseId) {
    if (!mongoose.isValidObjectId(opts.houseId)) throw new ApiError(400, "Invalid houseId");
    filter.houseId = opts.houseId;
  }
  if (opts.kind) filter.kind = opts.kind;
  if (opts.status) filter.status = opts.status;
  if (opts.from || opts.to) {
    filter.paidOn = {};
    if (opts.from) filter.paidOn.$gte = new Date(opts.from);
    if (opts.to) filter.paidOn.$lte = new Date(opts.to);
  }
  if (opts.search) {
    const regex = new RegExp(opts.search, "i");
    filter.$or = [{ receiptNo: regex }, { payerName: regex }, { transactionId: regex }];
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ paidOn: -1 })
      .skip((opts.page - 1) * opts.limit)
      .limit(opts.limit)
      .populate("houseId", "houseNo")
      .lean(),
    Payment.countDocuments(filter),
  ]);

  return { payments, total, page: opts.page, pages: Math.ceil(total / opts.limit) };
};