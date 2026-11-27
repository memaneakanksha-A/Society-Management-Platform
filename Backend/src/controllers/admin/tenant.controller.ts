import { Request, Response } from "express";
import mongoose from "mongoose";
import Tenant from "../../models/Tenant";
import House from "../../models/House";
import Owner from "../../models/Owner";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { uploadToPrivate, deletePrivateFile, getPrivateFilePath } from "../../config/multer";

const asObjectId = (id: string) => new mongoose.Types.ObjectId(id);

const getParam = (params: Record<string, any>, key: string): string => {
  const val = params[key];
  return Array.isArray(val) ? val[0] : val;
};

const assertHouseBelongs = async (houseId: string, societyId: string) => {
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");
  const house = await House.findOne({ _id: houseId, societyId });
  if (!house) throw new ApiError(404, "House not found");
  return house;
};

const computeAgreementState = (agreementEndDate: Date, status: string) => {
  if (status === "vacated") return "valid";
  const today = new Date();
  const endDate = new Date(agreementEndDate);
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring_soon";
  return "valid";
};

const computeDaysLeft = (agreementEndDate: Date) => {
  const today = new Date();
  const endDate = new Date(agreementEndDate);
  const diffTime = endDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// GET /tenants - List tenants with filters
export const getTenants = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const { status, search, houseId, page = "1", limit = "20" } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);

  const filter: Record<string, any> = { societyId };

  if (status) {
    if (status === "expiring") {
      // Active tenants with agreement expiring in <= 30 days
      const today = new Date();
      const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      filter.status = "active";
      filter.agreementEndDate = { $lte: thirtyDaysLater, $gte: today };
    } else if (status === "expired") {
      // Active tenants with agreement end date < today
      filter.status = "active";
      filter.agreementEndDate = { $lt: new Date() };
    } else {
      filter.status = status;
    }
  }

  if (houseId) {
    if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid houseId");
    filter.houseId = houseId;
  }

  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [
      { name: regex },
      { phone: regex },
      { email: regex },
    ];
  }

  const [tenants, total] = await Promise.all([
    Tenant.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate("houseId", "houseNo")
      .lean(),
    Tenant.countDocuments(filter),
  ]);

  const enriched = tenants.map((t) => ({
    ...t,
    house: t.houseId ? { houseNo: (t.houseId as any).houseNo } : null,
    agreementState: computeAgreementState(t.agreementEndDate, t.status),
    daysLeft: computeDaysLeft(t.agreementEndDate),
  }));

  res.json({ success: true, tenants: enriched, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

// GET /tenants/stats
export const getTenantStats = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;

  const [active, expiringSoon, expired, vacated, policeVerificationPending] = await Promise.all([
    Tenant.countDocuments({ societyId, status: "active" }),
    Tenant.countDocuments({
      societyId,
      status: "active",
      agreementEndDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), $gte: new Date() },
    }),
    Tenant.countDocuments({ societyId, status: "active", agreementEndDate: { $lt: new Date() } }),
    Tenant.countDocuments({ societyId, status: "vacated" }),
    Tenant.countDocuments({ societyId, status: "active", "policeVerification.status": "pending" }),
  ]);

  res.json({ success: true, stats: { active, expiringSoon, expired, vacated, policeVerificationPending } });
});

// POST /houses/:houseId/tenants - Create tenant with file uploads
const tenantCreateUpload = uploadToPrivate("tenants").fields([
  { name: "aadhaar", maxCount: 1 },
  { name: "agreement", maxCount: 1 },
  { name: "policeVerification", maxCount: 1 },
  { name: "photo", maxCount: 1 },
]);

export const createTenant = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const houseId = getParam(req.params, "houseId");

  await assertHouseBelongs(houseId, societyId);

  // Check if house already has an active tenant
  const existingActive = await Tenant.findOne({ houseId, societyId, status: "active" });
  if (existingActive) {
    // Clean up uploaded files
    const files = req.files as Record<string, Express.Multer.File[]>;
    if (files) {
      Object.values(files).flat().forEach((f) => deletePrivateFile("tenants", f.filename));
    }
    throw new ApiError(409, "House already has an active tenant");
  }

  const body = req.body as Record<string, any>;
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  const documents: Record<string, string> = {};
  if (files) {
    if (files.aadhaar?.[0]) documents.aadhaar = files.aadhaar[0].filename;
    if (files.agreement?.[0]) documents.agreement = files.agreement[0].filename;
    if (files.policeVerification?.[0]) documents.policeVerification = files.policeVerification[0].filename;
    if (files.photo?.[0]) documents.photo = files.photo[0].filename;
  }

  const emergencyContact = body.emergencyContact
    ? JSON.parse(body.emergencyContact)
    : undefined;

  const policeVerification = body.policeVerificationStatus
    ? {
        status: body.policeVerificationStatus,
        date: body.policeVerificationDate ? new Date(body.policeVerificationDate) : undefined,
        remarks: body.policeVerificationRemarks,
      }
    : { status: "pending" as const };

  const tenant = await Tenant.create({
    societyId,
    houseId,
    ownerId: body.ownerId || undefined,
    name: body.name,
    phone: body.phone,
    altPhone: body.altPhone,
    email: body.email,
    membersCount: body.membersCount ? Number(body.membersCount) : undefined,
    occupation: body.occupation,
    workplace: body.workplace,
    permanentAddress: body.permanentAddress,
    emergencyContact,
    idProofType: body.idProofType,
    idProofNumber: body.idProofNumber,
    rentAmount: Number(body.rentAmount),
    depositAmount: Number(body.depositAmount),
    agreementStartDate: new Date(body.agreementStartDate),
    agreementEndDate: new Date(body.agreementEndDate),
    policeVerification,
    documents,
    status: "active",
    remarks: body.remarks,
  });

  // Update house occupancy status and currentTenantId
  await House.findByIdAndUpdate(houseId, {
    occupancyStatus: "rented",
    currentTenantId: tenant._id,
  });

  const populated = await Tenant.findById(tenant._id)
    .populate("houseId", "houseNo")
    .lean();

  res.status(201).json({
    success: true,
    tenant: {
      ...populated,
      house: populated?.houseId ? { houseNo: (populated.houseId as any).houseNo } : null,
      agreementState: computeAgreementState(populated!.agreementEndDate, populated!.status),
      daysLeft: computeDaysLeft(populated!.agreementEndDate),
    },
  });
});

// GET /tenants/:id
export const getTenant = asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req.params, "id");
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid tenant id");

  const tenant = await Tenant.findOne({ _id: id, societyId: req.societyId })
    .populate("houseId", "houseNo")
    .populate("ownerId", "name phone")
    .lean();

  if (!tenant) throw new ApiError(404, "Tenant not found");

  res.json({
    success: true,
    tenant: {
      ...tenant,
      house: tenant.houseId ? { houseNo: (tenant.houseId as any).houseNo } : null,
      agreementState: computeAgreementState(tenant.agreementEndDate, tenant.status),
      daysLeft: computeDaysLeft(tenant.agreementEndDate),
    },
  });
});

// PUT /tenants/:id - Update tenant details and optional file replacement
const tenantUpdateUpload = uploadToPrivate("tenants").fields([
  { name: "aadhaar", maxCount: 1 },
  { name: "agreement", maxCount: 1 },
  { name: "policeVerification", maxCount: 1 },
  { name: "photo", maxCount: 1 },
]);

export const updateTenant = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const id = getParam(req.params, "id");
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid tenant id");

  const tenant = await Tenant.findOne({ _id: id, societyId });
  if (!tenant) throw new ApiError(404, "Tenant not found");

  const body = req.body as Record<string, any>;
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  // Update simple fields
  const allowedFields = [
    "name", "phone", "altPhone", "email", "membersCount", "occupation",
    "workplace", "permanentAddress", "idProofType", "idProofNumber",
    "rentAmount", "depositAmount", "agreementStartDate", "agreementEndDate",
    "remarks", "ownerId",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === "membersCount" || field === "rentAmount" || field === "depositAmount") {
        (tenant as any)[field] = Number(body[field]);
      } else if (field === "agreementStartDate" || field === "agreementEndDate") {
        (tenant as any)[field] = new Date(body[field]);
      } else {
        (tenant as any)[field] = body[field];
      }
    }
  }

  // Emergency contact
  if (body.emergencyContact) {
    tenant.emergencyContact = JSON.parse(body.emergencyContact);
  }

  // Police verification
  if (body.policeVerificationStatus) {
    tenant.policeVerification = {
      status: body.policeVerificationStatus,
      date: body.policeVerificationDate ? new Date(body.policeVerificationDate) : tenant.policeVerification.date,
      remarks: body.policeVerificationRemarks || tenant.policeVerification.remarks,
    };
  }

  // File replacements
  if (files) {
    const fileFields: Array<keyof typeof tenant.documents> = ["aadhaar", "agreement", "policeVerification", "photo"];
    for (const field of fileFields) {
      if (files[field]?.[0]) {
        // Delete old file
        if (tenant.documents[field]) {
          deletePrivateFile("tenants", tenant.documents[field]);
        }
        tenant.documents[field] = files[field][0].filename;
      }
    }
  }

  await tenant.save();

  const populated = await Tenant.findById(tenant._id)
    .populate("houseId", "houseNo")
    .populate("ownerId", "name phone")
    .lean();

  res.json({
    success: true,
    tenant: {
      ...populated,
      house: populated?.houseId ? { houseNo: (populated.houseId as any).houseNo } : null,
      agreementState: computeAgreementState(populated!.agreementEndDate, populated!.status),
      daysLeft: computeDaysLeft(populated!.agreementEndDate),
    },
  });
});

// PUT /tenants/:id/renew - Renew agreement
export const renewTenant = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const id = getParam(req.params, "id");
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid tenant id");

  const tenant = await Tenant.findOne({ _id: id, societyId });
  if (!tenant) throw new ApiError(404, "Tenant not found");

  if (tenant.status === "vacated") {
    throw new ApiError(400, "Cannot renew a vacated tenant");
  }

  const body = req.body as Record<string, any>;
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  // Validate dates (multipart values arrive as strings)
  let newStart: Date | undefined;
  let newEnd: Date | undefined;
  if (body.agreementStartDate !== undefined && body.agreementStartDate !== "") {
    newStart = new Date(String(body.agreementStartDate));
    if (isNaN(newStart.getTime())) throw new ApiError(400, "Invalid start date");
  }
  if (body.agreementEndDate !== undefined && body.agreementEndDate !== "") {
    newEnd = new Date(String(body.agreementEndDate));
    if (isNaN(newEnd.getTime())) throw new ApiError(400, "Invalid end date");
  }
  const finalStart = newStart || tenant.agreementStartDate;
  const finalEnd = newEnd || tenant.agreementEndDate;
  if (finalEnd <= finalStart) {
    throw new ApiError(400, "End date must be after start date");
  }

  let newRent: number | undefined;
  let newDeposit: number | undefined;
  if (body.rentAmount !== undefined && body.rentAmount !== "") {
    newRent = Number(body.rentAmount);
    if (isNaN(newRent) || newRent < 0) throw new ApiError(400, "Invalid rent amount");
  }
  if (body.depositAmount !== undefined && body.depositAmount !== "") {
    newDeposit = Number(body.depositAmount);
    if (isNaN(newDeposit) || newDeposit < 0) throw new ApiError(400, "Invalid deposit amount");
  }

  // Push current agreement to history
  tenant.agreements.push({
    startDate: tenant.agreementStartDate,
    endDate: tenant.agreementEndDate,
    rentAmount: tenant.rentAmount,
    depositAmount: tenant.depositAmount,
    file: tenant.documents.agreement,
    renewedAt: new Date(),
  });

  // Update with new agreement details
  if (newStart) tenant.agreementStartDate = newStart;
  if (newEnd) tenant.agreementEndDate = newEnd;
  if (newRent !== undefined) tenant.rentAmount = newRent;
  if (newDeposit !== undefined) tenant.depositAmount = newDeposit;

  // Handle agreement file replacement
  if (files?.agreement?.[0]) {
    if (tenant.documents.agreement) {
      deletePrivateFile("tenants", tenant.documents.agreement);
    }
    tenant.documents.agreement = files.agreement[0].filename;
  }

  await tenant.save();

  const populated = await Tenant.findById(tenant._id)
    .populate("houseId", "houseNo")
    .lean();

  res.json({
    success: true,
    tenant: {
      ...populated,
      house: populated?.houseId ? { houseNo: (populated.houseId as any).houseNo } : null,
      agreementState: computeAgreementState(populated!.agreementEndDate, populated!.status),
      daysLeft: computeDaysLeft(populated!.agreementEndDate),
    },
  });
});

// PUT /tenants/:id/vacate - Vacate tenant
export const vacateTenant = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const id = getParam(req.params, "id");
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid tenant id");

  const tenant = await Tenant.findOne({ _id: id, societyId });
  if (!tenant) throw new ApiError(404, "Tenant not found");

  if (tenant.status === "vacated") {
    throw new ApiError(400, "Tenant is already vacated");
  }

  const body = req.body as Record<string, any>;
  const vacatedOn = body.vacatedOn ? new Date(body.vacatedOn) : new Date();
  const reason = body.reason;
  const markVacant = body.markVacant === "true" || body.markVacant === true;

  tenant.status = "vacated";
  tenant.vacatedOn = vacatedOn;
  tenant.vacateReason = reason;

  await tenant.save();

  // Update house
  const updateData: Record<string, any> = {
    currentTenantId: null,
    occupancyStatus: markVacant ? "vacant" : "owner_living",
  };
  await House.findByIdAndUpdate(tenant.houseId, updateData);

  res.json({ success: true, message: "Tenant vacated successfully" });
});

// GET /houses/:houseId/tenants - Full tenant history for a house
export const getHouseTenants = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const houseId = getParam(req.params, "houseId");
  if (!mongoose.isValidObjectId(houseId)) throw new ApiError(400, "Invalid house id");

  await assertHouseBelongs(houseId, societyId);

  const tenants = await Tenant.find({ houseId, societyId })
    .sort({ createdAt: -1 })
    .populate("houseId", "houseNo")
    .lean();

  const enriched = tenants.map((t) => ({
    ...t,
    house: t.houseId ? { houseNo: (t.houseId as any).houseNo } : null,
    agreementState: computeAgreementState(t.agreementEndDate, t.status),
    daysLeft: computeDaysLeft(t.agreementEndDate),
  }));

  res.json({ success: true, tenants: enriched });
});

// GET /tenants/:id/documents/:type - Serve private tenant documents
export const getTenantDocument = asyncHandler(async (req: Request, res: Response) => {
  const societyId = req.societyId as string;
  const id = getParam(req.params, "id");
  const type = getParam(req.params, "type");

  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid tenant id");

  const validTypes = ["aadhaar", "agreement", "policeVerification", "photo"];
  if (!validTypes.includes(type)) throw new ApiError(400, "Invalid document type");

  const tenant = await Tenant.findOne({ _id: id, societyId }).select("documents");
  if (!tenant) throw new ApiError(404, "Tenant not found");

  const filename = tenant.documents[type as keyof typeof tenant.documents];
  if (!filename) throw new ApiError(404, "Document not found");

  const filePath = getPrivateFilePath("tenants", filename);

  // Check if file exists
  const fs = await import("fs");
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, "File not found on disk");
  }

  res.sendFile(filePath);
});

export { tenantCreateUpload, tenantUpdateUpload };