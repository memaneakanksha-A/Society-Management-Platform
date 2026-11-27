import { Request, Response } from "express";
import mongoose from "mongoose";
import Payment from "../../models/Payment";
import House from "../../models/House";
import HouseType from "../../models/HouseType";
import Owner from "../../models/Owner";
import MaintenanceDue from "../../models/MaintenanceDue";
import ShareRecord from "../../models/ShareRecord";
import Society from "../../models/Society";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { recordPayment, cancelPayment, listPayments } from "../../services/payment.service";
import { financialYearLabel } from "../../services/maintenance.service";
import { buildReceiptBuffer, ReceiptData } from "../../services/receipt.service";

const adminName = (req: Request): string => (req as any).user?.name || "Admin";

const financialYearOf = (date: Date): number => {
  const month = date.getMonth();
  return month >= 3 ? date.getFullYear() : date.getFullYear() - 1;
};

export const create = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const payment = await recordPayment(societyId, req.body as any, adminName(req));
  res.status(201).json({ success: true, payment });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const q = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || "1", 10) || 1);
  const limit = Math.max(1, parseInt(q.limit || "20", 10) || 20);
  const result = await listPayments(societyId, {
    from: q.from,
    to: q.to,
    mode: q.mode,
    houseId: q.houseId,
    kind: q.kind,
    status: q.status,
    search: q.search,
    page,
    limit,
  });
  res.json({ success: true, payments: result.payments, total: result.total, page: result.page, pages: result.pages });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  if (!mongoose.isValidObjectId(String(req.params.id))) throw new ApiError(400, "Invalid payment id");
  const payment = await Payment.findOne({ _id: req.params.id, societyId })
    .populate("houseId", "houseNo")
    .lean();
  if (!payment) throw new ApiError(404, "Payment not found");
  res.json({ success: true, payment });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const payment = await cancelPayment(societyId, String(req.params.id), (req.body as any).reason, adminName(req));
  res.json({ success: true, payment });
});

export const receipt = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  if (!mongoose.isValidObjectId(String(req.params.id))) throw new ApiError(400, "Invalid payment id");

  const payment = await Payment.findOne({ _id: req.params.id, societyId })
    .populate("houseId", "houseNo houseTypeId area location")
    .lean();
  if (!payment) throw new ApiError(404, "Payment not found");

  const house = payment.houseId as any;
  const [society, owner, houseType, dues, share] = await Promise.all([
    Society.findById(societyId).lean(),
    Owner.findOne({ societyId, houseId: payment.houseId, isCurrent: true }).select("name").lean(),
    house?.houseTypeId
      ? HouseType.findById(house.houseTypeId).select("name").lean()
      : Promise.resolve(null),
    MaintenanceDue.find({ _id: { $in: payment.allocations.map((a) => a.dueId) } })
      .select("periodLabel")
      .lean(),
    ShareRecord.findOne({ societyId, houseId: payment.houseId }).select("certificateNo").lean(),
  ]);

  const allDues = await MaintenanceDue.find({
    societyId,
    houseId: payment.houseId,
    status: { $ne: "cancelled" },
  }).select("amount paidPrincipal").lean();
  const balanceDue = (allDues as any[]).reduce(
    (s, d) => s + Math.max(0, d.amount - d.paidPrincipal),
    0
  );

  const principal = payment.allocations.reduce((s, a) => s + a.principal, 0);
  const lateFee = payment.allocations.reduce((s, a) => s + a.lateFee, 0);
  const advance = payment.unallocated || 0;
  const fy = financialYearOf(payment.paidOn);

  let paymentFor = "Other";
  if (payment.kind === "share") {
    const cert = (share as any)?.certificateNo ? ` (Certificate No: ${(share as any).certificateNo})` : "";
    paymentFor = `Share capital payment${cert}`;
  } else if (payment.kind === "maintenance") {
    const labels = (dues as any[]).map((d) => d.periodLabel);
    paymentFor = `Maintenance FY ${financialYearLabel(fy)}${labels.length ? ` (${labels.join(", ")})` : ""}`;
  }

  const modeLabel: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    cheque: "Cheque",
    bank_transfer: "Bank Transfer",
    card: "Card",
    other: "Other",
  };

  const data: ReceiptData = {
    societyName: society?.name || "Society",
    societyAddress: society?.address,
    societyPhone: society?.contact?.phone,
    societyEmail: society?.contact?.email,
    societyLogoPath: society?.logo,
    receiptNo: payment.receiptNo,
    paidOn: payment.paidOn,
    financialYear: financialYearLabel(fy),
    cancelled: payment.status === "cancelled",
    payerName: payment.payerName,
    paidBy: payment.paidBy,
    houseNo: house?.houseNo || "-",
    houseType: (houseType as any)?.name,
    ownerName: (owner as any)?.name,
    area: house?.area,
    location: house?.location,
    paymentFor,
    mode: modeLabel[payment.mode] || payment.mode,
    transactionId: payment.transactionId,
    chequeNo: payment.chequeNo,
    chequeDate: payment.chequeDate,
    bankName: payment.bankName,
    amount: payment.amount,
    principal,
    lateFee,
    advance,
    balanceDue: Math.round(balanceDue * 100) / 100,
    receivedBy: adminName(req),
  };

  const buffer = await buildReceiptBuffer(data);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${payment.receiptNo.replace(/\//g, "-")}.pdf"`);
  res.send(buffer);
});