import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/User";
import House from "../../models/House";
import HouseType from "../../models/HouseType";
import Owner from "../../models/Owner";
import Tenant from "../../models/Tenant";
import MaintenanceDue from "../../models/MaintenanceDue";
import Payment from "../../models/Payment";
import FamilyMember from "../../models/FamilyMember";
import Vehicle from "../../models/Vehicle";
import Notice from "../../models/Notice";
import Meeting from "../../models/Meeting";
import EventModel from "../../models/Event";
import Society from "../../models/Society";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { financialYearLabel } from "../../services/maintenance.service";
import { buildReceiptBuffer, ReceiptData } from "../../services/receipt.service";

interface MemberContext {
  user: any;
  houseId: string;
  societyId: string;
}

const getMemberContext = async (req: Request): Promise<MemberContext> => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new ApiError(404, "User not found");
  if (!user.houseId || !user.societyId) {
    throw new ApiError(403, "No house is linked with this account");
  }
  return { user, houseId: String(user.houseId), societyId: String(user.societyId) };
};

const financialYearOf = (date: Date): number => {
  const month = date.getMonth();
  return month >= 3 ? date.getFullYear() : date.getFullYear() - 1;
};

// GET /me
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const { user, houseId, societyId } = await getMemberContext(req);

  const house = await House.findOne({ _id: houseId, societyId })
    .populate("houseTypeId", "name")
    .lean();
  if (!house) throw new ApiError(404, "House not found");

  const [owner, tenant] = await Promise.all([
    Owner.findOne({ houseId, societyId, isCurrent: true })
      .select("name phone email")
      .lean(),
    Tenant.findOne({ houseId, societyId, status: "active" })
      .select("name phone email rentAmount agreementStartDate agreementEndDate status")
      .lean(),
  ]);

  res.json({
    success: true,
    profile: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
    house: {
      _id: houseId,
      houseNo: (house as any).houseNo,
      area: (house as any).area,
      location: (house as any).location,
      occupancyStatus: (house as any).occupancyStatus,
      maintenancePayableBy: (house as any).maintenancePayableBy,
      houseType: (house as any).houseTypeId?.name || null,
    },
    owner: owner || null,
    tenant: tenant || null,
  });
});

// GET /dashboard
export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const now = new Date();

  const [dues, payments, noticesCount] = await Promise.all([
    MaintenanceDue.find({ houseId, societyId, status: { $ne: "cancelled" } })
      .select("amount paidPrincipal status dueDate")
      .lean(),
    Payment.find({ houseId, societyId, status: "active" })
      .select("amount unallocated paidOn receiptNo mode")
      .sort({ paidOn: -1 })
      .lean(),
    Notice.countDocuments({
      societyId,
      isPublished: true,
      visibility: { $in: ["public", "members"] },
      $and: [
        { $or: [{ expiresOn: null }, { expiresOn: { $gte: now } }] },
        { $or: [{ publishOn: null }, { publishOn: { $lte: now } }] },
      ],
    }),
  ]);

  const outstanding = (dues as any[]).reduce(
    (s, d) => s + Math.max(0, d.amount - d.paidPrincipal),
    0
  );
  const advanceCredit = (payments as any[]).reduce((s, p) => s + (p.unallocated || 0), 0);

  const nextDueDoc = (dues as any[])
    .filter((d) => d.status === "pending" || d.status === "partial")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const lastPayment = (payments as any[])[0]
    ? {
        receiptNo: (payments as any[])[0].receiptNo,
        amount: (payments as any[])[0].amount,
        paidOn: (payments as any[])[0].paidOn,
        mode: (payments as any[])[0].mode,
      }
    : null;

  const nextDue = nextDueDoc
    ? {
        periodLabel: (nextDueDoc as any).periodLabel,
        amount: (nextDueDoc as any).amount,
        dueDate: (nextDueDoc as any).dueDate,
      }
    : null;

  res.json({
    success: true,
    outstanding: Math.round(outstanding * 100) / 100,
    advanceCredit: Math.round(advanceCredit * 100) / 100,
    lastPayment,
    nextDue,
    noticesCount,
  });
});

// GET /dues?year=
export const getDues = asyncHandler(async (req: Request, res: Response) => {
  const { user, houseId, societyId } = await getMemberContext(req);

  const house = await House.findOne({ _id: houseId, societyId }).select("maintenancePayableBy").lean();
  const payable = user.role === "tenant" ? (house as any)?.maintenancePayableBy === "tenant" : true;

  if (!payable) {
    return res.json({ success: true, payable: false, dues: [], totalOutstanding: 0, totalLateFee: 0 });
  }

  const q = req.query as Record<string, string>;
  const filter: Record<string, any> = { houseId, societyId, status: { $ne: "cancelled" } };
  if (q.year) filter.year = Number(q.year);

  const dues = await MaintenanceDue.find(filter).sort({ year: -1, dueDate: 1 }).lean();

  const totalOutstanding = (dues as any[]).reduce(
    (s, d) => s + Math.max(0, d.amount - d.paidPrincipal),
    0
  );
  const totalLateFee = (dues as any[]).reduce(
    (s, d) => s + Math.max(0, d.lateFeePaid || 0),
    0
  );

  res.json({
    success: true,
    payable: true,
    dues,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    totalLateFee: Math.round(totalLateFee * 100) / 100,
  });
});

// GET /payments
export const getPayments = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const payments = await Payment.find({ houseId, societyId })
    .select("receiptNo amount mode paidOn status kind unallocated payerName")
    .sort({ paidOn: -1 })
    .lean();
  res.json({ success: true, payments });
});

// GET /payments/:id/receipt
export const getPaymentReceipt = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid payment id");

  const payment = await Payment.findOne({ _id: id, societyId, houseId })
    .populate("houseId", "houseNo houseTypeId area location")
    .lean();
  if (!payment) throw new ApiError(404, "Payment not found");

  const house = payment.houseId as any;
  const [society, owner, houseType, dues] = await Promise.all([
    Society.findById(societyId).lean(),
    Owner.findOne({ societyId, houseId, isCurrent: true }).select("name").lean(),
    house?.houseTypeId
      ? HouseType.findById(house.houseTypeId).select("name").lean()
      : Promise.resolve(null),
    MaintenanceDue.find({ _id: { $in: payment.allocations.map((a) => a.dueId) } })
      .select("periodLabel")
      .lean(),
  ]);

  const allDues = await MaintenanceDue.find({
    societyId,
    houseId,
    status: { $ne: "cancelled" },
  })
    .select("amount paidPrincipal")
    .lean();
  const balanceDue = (allDues as any[]).reduce(
    (s, d) => s + Math.max(0, d.amount - d.paidPrincipal),
    0
  );

  const principal = payment.allocations.reduce((s, a) => s + a.principal, 0);
  const lateFee = payment.allocations.reduce((s, a) => s + a.lateFee, 0);
  const advance = payment.unallocated || 0;
  const fy = financialYearOf(payment.paidOn);

  let paymentFor = "Other";
  if (payment.kind === "share") paymentFor = "Share Payment";
  else if (payment.kind === "maintenance") {
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
    receivedBy: "Society Office",
  };

  const buffer = await buildReceiptBuffer(data);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${payment.receiptNo.replace(/\//g, "-")}.pdf"`
  );
  res.send(buffer);
});

// GET /notices
export const getNotices = asyncHandler(async (req: Request, res: Response) => {
  const { societyId } = await getMemberContext(req);
  const now = new Date();
  const notices = await Notice.find({
    societyId,
    isPublished: true,
    visibility: { $in: ["public", "members"] },
    $and: [
      { $or: [{ expiresOn: null }, { expiresOn: { $gte: now } }] },
      { $or: [{ publishOn: null }, { publishOn: { $lte: now } }] },
    ],
  })
    .sort({ isImportant: -1, publishOn: -1, createdAt: -1 })
    .lean();
  res.json({ success: true, notices });
});

// GET /meetings
export const getMeetings = asyncHandler(async (req: Request, res: Response) => {
  const { societyId } = await getMemberContext(req);
  const meetings = await Meeting.find({ societyId, isPublished: true })
    .sort({ date: -1 })
    .lean();
  res.json({ success: true, meetings });
});

// GET /events
export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const { societyId } = await getMemberContext(req);
  const events = await EventModel.find({ societyId, isPublished: true })
    .sort({ date: -1 })
    .lean();
  res.json({ success: true, events });
});

// GET /family
export const getFamily = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const members = await FamilyMember.find({ houseId, societyId })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, members });
});

// POST /family
export const createFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const body = req.body as Record<string, any>;
  const { name, relation, gender, dob, age, phone, bloodGroup, occupation, isEmergencyContact } = body;

  if (!name || !relation || !gender) {
    throw new ApiError(400, "name, relation, and gender are required");
  }

  const member = await FamilyMember.create({
    societyId,
    houseId,
    name,
    relation,
    gender,
    dob: dob ? new Date(dob) : undefined,
    age: age !== undefined && age !== "" ? Number(age) : undefined,
    phone,
    bloodGroup,
    occupation,
    isEmergencyContact: isEmergencyContact === "true" || isEmergencyContact === true,
  });

  res.status(201).json({ success: true, member });
});

// PUT /family/:id
export const updateFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid family member id");

  const member = await FamilyMember.findOne({ _id: id, societyId, houseId });
  if (!member) throw new ApiError(404, "Family member not found");

  const body = req.body as Record<string, any>;
  const allowedFields = [
    "name",
    "relation",
    "gender",
    "dob",
    "age",
    "phone",
    "bloodGroup",
    "occupation",
    "isEmergencyContact",
  ];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === "age") {
        member.age = body[field] === "" ? undefined : Number(body[field]);
      } else if (field === "dob") {
        member.dob = body[field] ? new Date(body[field]) : undefined;
      } else if (field === "isEmergencyContact") {
        member.isEmergencyContact = body[field] === "true" || body[field] === true;
      } else {
        (member as any)[field] = body[field];
      }
    }
  }

  await member.save();
  res.json({ success: true, member });
});

// DELETE /family/:id
export const deleteFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid family member id");

  const member = await FamilyMember.findOneAndDelete({ _id: id, societyId, houseId });
  if (!member) throw new ApiError(404, "Family member not found");

  res.json({ success: true, message: "Family member deleted" });
});

// GET /vehicles
export const getVehicles = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const vehicles = await Vehicle.find({ houseId, societyId })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, vehicles });
});

const resolveOwnerRef = (
  house: { currentOwnerId?: any; currentTenantId?: any },
  ownerType: string
): string => {
  if (ownerType === "owner") {
    if (!house.currentOwnerId) {
      throw new ApiError(400, "This house has no owner yet.");
    }
    return String(house.currentOwnerId);
  }
  if (ownerType === "tenant") {
    if (!house.currentTenantId) {
      throw new ApiError(400, "This house has no active tenant.");
    }
    return String(house.currentTenantId);
  }
  throw new ApiError(400, "Invalid ownerType. Must be 'owner' or 'tenant'");
};

// POST /vehicles
export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  const { user, houseId, societyId } = await getMemberContext(req);
  const body = req.body as Record<string, any>;
  const { type, vehicleNo, make, vehicleModel, colour, parkingSlot, stickerNo } = body;

  if (!type || !vehicleNo) throw new ApiError(400, "type and vehicleNo are required");

  const ownerType = user.role === "tenant" ? "tenant" : "owner";
  const house = await House.findOne({ _id: houseId, societyId });
  if (!house) throw new ApiError(404, "House not found");
  const ownerRefId = resolveOwnerRef(house as any, ownerType);

  const normalizedVehicleNo = String(vehicleNo).toUpperCase().replace(/\s+/g, "");
  const existing = await Vehicle.findOne({ societyId, vehicleNo: normalizedVehicleNo });
  if (existing) throw new ApiError(409, "Vehicle number already registered in this society");

  const vehicle = await Vehicle.create({
    societyId,
    houseId,
    ownerType,
    ownerRefId,
    type,
    vehicleNo: normalizedVehicleNo,
    make,
    vehicleModel,
    colour,
    parkingSlot,
    stickerNo,
    isActive: true,
  });

  res.status(201).json({ success: true, vehicle });
});

// PUT /vehicles/:id
export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const { user, houseId, societyId } = await getMemberContext(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid vehicle id");

  const vehicle = await Vehicle.findOne({ _id: id, societyId, houseId });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  const body = req.body as Record<string, any>;
  const ownerType = user.role === "tenant" ? "tenant" : "owner";

  if (body.vehicleNo !== undefined) {
    const normalized = String(body.vehicleNo).toUpperCase().replace(/\s+/g, "");
    if (normalized !== vehicle.vehicleNo) {
      const dup = await Vehicle.findOne({ societyId, vehicleNo: normalized, _id: { $ne: id } });
      if (dup) throw new ApiError(409, "Vehicle number already registered in this society");
    }
    vehicle.vehicleNo = normalized;
  }

  if (body.type !== undefined) vehicle.type = body.type;
  if (body.make !== undefined) vehicle.make = body.make;
  if (body.vehicleModel !== undefined) vehicle.vehicleModel = body.vehicleModel;
  if (body.colour !== undefined) vehicle.colour = body.colour;
  if (body.parkingSlot !== undefined) vehicle.parkingSlot = body.parkingSlot;
  if (body.stickerNo !== undefined) vehicle.stickerNo = body.stickerNo;

  vehicle.ownerType = ownerType as any;
  const house = await House.findOne({ _id: houseId, societyId });
  if (house) vehicle.ownerRefId = resolveOwnerRef(house as any, ownerType) as any;

  await vehicle.save();
  res.json({ success: true, vehicle });
});

// DELETE /vehicles/:id
export const deleteVehicle = asyncHandler(async (req: Request, res: Response) => {
  const { houseId, societyId } = await getMemberContext(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid vehicle id");

  const vehicle = await Vehicle.findOneAndDelete({ _id: id, societyId, houseId });
  if (!vehicle) throw new ApiError(404, "Vehicle not found");

  res.json({ success: true, message: "Vehicle deleted" });
});